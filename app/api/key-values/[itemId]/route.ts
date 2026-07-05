import { NextRequest, NextResponse } from "next/server";
import { withAuth, getMasterKeyFromRequest } from "@/lib/auth/middleware";
import {
  decryptSecretWithDataKey,
  encryptSecretWithDataKey,
  unwrapProjectDataKey,
} from "@/lib/crypto/envelope";
import {
  deleteKeyValue,
  getKeyValueById,
  updateKeyValueRecord,
} from "@/lib/db/key-values";
import { getProjectDataKeyForUser } from "@/lib/db/projects";

export const GET = withAuth(async (
  request: NextRequest,
  { params }: { params: { itemId: string } }
) => {
  try {
    const userId = request.headers.get("x-user-id")!;
    const sessionId = request.headers.get("x-session-id")!;
    const item = await getKeyValueById(params.itemId, userId);

    if (!item) {
      return NextResponse.json({ error: "Key-value not found" }, { status: 404 });
    }

    const masterKey = getMasterKeyFromRequest(sessionId, userId);
    if (!masterKey) {
      return NextResponse.json({ error: "Session locked" }, { status: 401 });
    }

    const projectKeyRecord = await getProjectDataKeyForUser(item.project_id, userId);
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
      item.ciphertext,
      projectDataKey,
      item.kv_iv,
      item.kv_auth_tag
    );

    return NextResponse.json({ success: true, item: { ...item, plaintext } }, { status: 200 });
  } catch (error: unknown) {
    console.error("Key-value reveal error:", error);
    return NextResponse.json({ error: "Failed to reveal key-value" }, { status: 500 });
  }
});

export const PATCH = withAuth(async (
  request: NextRequest,
  { params }: { params: { itemId: string } }
) => {
  try {
    const userId = request.headers.get("x-user-id")!;
    const sessionId = request.headers.get("x-session-id")!;
    const body = await request.json();
    const { key, value, is_sensitive } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existing = await getKeyValueById(params.itemId, userId);
    if (!existing) {
      return NextResponse.json({ error: "Key-value not found" }, { status: 404 });
    }

    const masterKey = getMasterKeyFromRequest(sessionId, userId);
    if (!masterKey) {
      return NextResponse.json({ error: "Session locked" }, { status: 401 });
    }

    const projectKeyRecord = await getProjectDataKeyForUser(existing.project_id, userId);
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
    const item = await updateKeyValueRecord(
      params.itemId,
      userId,
      key,
      encrypted,
      is_sensitive !== false
    );

    return NextResponse.json({ success: true, item }, { status: 200 });
  } catch (error: unknown) {
    console.error("Key-value update error:", error);
    return NextResponse.json({ error: "Failed to update key-value" }, { status: 500 });
  }
});

export const DELETE = withAuth(async (
  request: NextRequest,
  { params }: { params: { itemId: string } }
) => {
  try {
    const userId = request.headers.get("x-user-id")!;
    await deleteKeyValue(params.itemId, userId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error("Key-value delete error:", error);
    return NextResponse.json({ error: "Failed to delete key-value" }, { status: 500 });
  }
});
