import { NextRequest, NextResponse } from "next/server";
import { withAuth, getMasterKeyFromRequest } from "@/lib/auth/middleware";
import {
  encryptSecretWithDataKey,
  unwrapProjectDataKey,
} from "@/lib/crypto/envelope";
import {
  createKeyValueRecord,
  getKeyValues,
} from "@/lib/db/key-values";
import { getProjectDataKeyForUser } from "@/lib/db/projects";

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const userId = request.headers.get("x-user-id")!;
    const projectId = request.nextUrl.searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    const items = await getKeyValues(projectId, userId);
    return NextResponse.json({ success: true, items }, { status: 200 });
  } catch (error: unknown) {
    console.error("Key-values fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch key-values" }, { status: 500 });
  }
});

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const userId = request.headers.get("x-user-id")!;
    const sessionId = request.headers.get("x-session-id")!;
    const body = await request.json();
    const { projectId, key, value, is_sensitive } = body;

    if (!projectId || !key || value === undefined) {
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

    const encrypted = encryptSecretWithDataKey(value, projectDataKey);
    const item = await createKeyValueRecord(
      projectId,
      userId,
      key,
      encrypted,
      is_sensitive !== false
    );

    return NextResponse.json({ success: true, item }, { status: 201 });
  } catch (error: unknown) {
    console.error("Key-value create error:", error);
    return NextResponse.json({ error: "Failed to create key-value" }, { status: 500 });
  }
});
