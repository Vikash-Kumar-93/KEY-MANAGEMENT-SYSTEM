import { describe, expect, it } from "vitest";
import { createSession, getMasterKey, getSessionMetadata } from "../lib/auth/session";

describe("session serialization", () => {
  it("round-trips a serialized session cookie value", () => {
    const masterKey = Buffer.from("12345678901234567890123456789012");
    const sessionCookieValue = createSession(
      "cookie-session",
      "user-123",
      masterKey,
      "master-hash",
      "device-1"
    );

    const metadata = getSessionMetadata(sessionCookieValue);
    const restoredMasterKey = getMasterKey(sessionCookieValue, "user-123");

    expect(metadata?.userId).toBe("user-123");
    expect(metadata?.deviceId).toBe("device-1");
    expect(restoredMasterKey?.equals(masterKey)).toBe(true);
  });
});
