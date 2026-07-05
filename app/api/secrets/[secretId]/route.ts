import { NextRequest, NextResponse } from "next/server";
import { withAuth, getMasterKeyFromRequest } from "@/lib/auth/middleware";
import { getSecretById, updateSecretRecord, deleteSecret } from "@/lib/db/secrets";
import { unwrapProjectDataKey, decryptSecretWithDataKey, encryptSecretWithDataKey } from "@/lib/crypto/envelope";
import { getProjectDataKeyForUser } from "@/lib/db/projects";

export const GET = withAuth(async (request: NextRequest, { params }: { params: { secretId: string } }) => {
  try {
    const userId = request.headers.get("x-user-id")!;
    const sessionId = request.headers.get("x-session-id")!;
    const secretId = params.secretId;

    if (!secretId) {
      return NextResponse.json({ error: "Missing secretId" }, { status: 400 });
    }

    const masterKey = getMasterKeyFromRequest(sessionId, userId);
    if (!masterKey) {
      return NextResponse.json({ error: "Session locked" }, { status: 401 });
    }

    const secret = await getSecretById(secretId, userId);
    if (!secret) {
      return NextResponse.json({ error: "Secret not found" }, { status: 404 });
    }

    const projectKeyRecord = await getProjectDataKeyForUser(secret.project_id, userId);
    if (!projectKeyRecord) {
      return NextResponse.json({ error: "Project key not found" }, { status: 404 });
    }

    const projectDataKey = unwrapProjectDataKey(
      projectKeyRecord.wrapped_key,
      masterKey,
      projectKeyRecord.key_iv,
      projectKeyRecord.key_auth_tag
    );

    const plaintext = decryptSecretWithDataKey(
      secret.ciphertext,
      projectDataKey,
      secret.secret_iv,
      secret.secret_auth_tag
    );

    return NextResponse.json({ success: true, secret: { ...secret, plaintext } }, { status: 200 });
  } catch (error: any) {
    console.error("Reveal secret error:", error);
    return NextResponse.json({ error: "Failed to reveal secret" }, { status: 500 });
  }
});

export const PATCH = withAuth(async (request: NextRequest, { params }: { params: { secretId: string } }) => {
  try {
    const userId = request.headers.get("x-user-id")!;
    const sessionId = request.headers.get("x-session-id")!;
    const secretId = params.secretId;
    const body = await request.json();
    const { label, value } = body;

    if (!secretId) {
      return NextResponse.json({ error: "Missing secretId" }, { status: 400 });
    }

    if (!label && value === undefined) {
      return NextResponse.json({ error: "Missing update fields" }, { status: 400 });
    }

    const secret = await getSecretById(secretId, userId);
    if (!secret) {
      return NextResponse.json({ error: "Secret not found" }, { status: 404 });
    }

    let ciphertext = secret.ciphertext;
    let secretIv = secret.secret_iv;
    let secretAuthTag = secret.secret_auth_tag;

    if (value !== undefined) {
      const projectKeyRecord = await getProjectDataKeyForUser(secret.project_id, userId);
      if (!projectKeyRecord) {
        return NextResponse.json({ error: "Project key not found" }, { status: 404 });
      }

      const projectDataKey = unwrapProjectDataKey(
        projectKeyRecord.wrapped_key,
        getMasterKeyFromRequest(sessionId, userId)!,
        projectKeyRecord.key_iv,
        projectKeyRecord.key_auth_tag
      );

      const encrypted = encryptSecretWithDataKey(value, projectDataKey);
      ciphertext = encrypted.ciphertext;
      secretIv = encrypted.secretIv;
      secretAuthTag = encrypted.secretAuthTag;
    }

    const updatedSecret = await updateSecretRecord(
      secretId,
      userId,
      label || secret.label,
      ciphertext,
      secretIv,
      secretAuthTag
    );

    return NextResponse.json({ success: true, secret: updatedSecret }, { status: 200 });
  } catch (error: any) {
    console.error("Update secret error:", error);
    return NextResponse.json({ error: "Failed to update secret" }, { status: 500 });
  }
});

export const DELETE = withAuth(async (request: NextRequest, { params }: { params: { secretId: string } }) => {
  try {
    const userId = request.headers.get("x-user-id")!;
    const secretId = params.secretId;

    if (!secretId) {
      return NextResponse.json({ error: "Missing secretId" }, { status: 400 });
    }

    await deleteSecret(secretId, userId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Delete secret error:", error);
    return NextResponse.json({ error: "Failed to delete secret" }, { status: 500 });
  }
});
