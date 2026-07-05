import { NextRequest, NextResponse } from "next/server";
import { withAuth, getMasterKeyFromRequest } from "@/lib/auth/middleware";
import { getProjectDataKeyForUser } from "@/lib/db/projects";
import { createSecretRecord, getProjectSecrets } from "@/lib/db/secrets";
import {
  encryptSecretWithDataKey,
  unwrapProjectDataKey,
} from "@/lib/crypto/envelope";

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const userId = request.headers.get("x-user-id")!;
    const projectId = request.nextUrl.searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "Missing projectId" },
        { status: 400 }
      );
    }

    const secrets = await getProjectSecrets(projectId, userId);
    return NextResponse.json({ success: true, secrets }, { status: 200 });
  } catch (error: any) {
    console.error("List secrets error:", error);
    return NextResponse.json({ error: "Failed to fetch secrets" }, { status: 500 });
  }
});

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const userId = request.headers.get("x-user-id")!;
    const sessionId = request.headers.get("x-session-id")!;
    const body = await request.json();
    const { projectId, name, value } = body;

    if (!projectId || !name || !value) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const masterKey = getMasterKeyFromRequest(sessionId, userId);
    if (!masterKey) {
      return NextResponse.json({ error: "Session locked" }, { status: 401 });
    }

    const projectKeyRecord = await getProjectDataKeyForUser(projectId, userId);
    if (!projectKeyRecord) {
      return NextResponse.json({ error: "Project key not found" }, { status: 404 });
    }

    const projectDataKey = unwrapProjectDataKey(
      projectKeyRecord.wrapped_key,
      masterKey,
      projectKeyRecord.key_iv,
      projectKeyRecord.key_auth_tag
    );

    const { ciphertext, secretIv, secretAuthTag } = encryptSecretWithDataKey(
      value,
      projectDataKey
    );

    const secret = await createSecretRecord(
      projectId,
      userId,
      name,
      ciphertext,
      secretIv,
      secretAuthTag
    );

    return NextResponse.json({ success: true, secret }, { status: 201 });
  } catch (error: any) {
    console.error("Create secret error:", error);
    return NextResponse.json(
      { error: "Failed to store secret" },
      { status: 500 }
    );
  }
});
