const AUTO_LOCK_TIMEOUT = parseInt(
  process.env.AUTO_LOCK_TIMEOUT_MINUTES || "15",
  10
) * 60 * 1000;

const PENDING_SESSION_TIMEOUT = 10 * 60 * 1000;

type PendingSessionKind = "setup" | "unlock";

interface SessionData {
  userId: string;
  masterKey: Buffer;
  masterKeyHash: string;
  createdAt: number;
  lastActivityAt: number;
  deviceId: string;
}

interface PendingSessionData {
  kind: PendingSessionKind;
  userId: string;
  masterKey: Buffer;
  masterKeyHash: string;
  createdAt: number;
}

type SessionStoragePayload = Omit<SessionData, "masterKey"> & {
  masterKey: string;
};

type PendingSessionStoragePayload = Omit<PendingSessionData, "masterKey"> & {
  masterKey: string;
};

function encodeSessionPayload(payload: unknown): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodeSessionPayload<T>(token: string): T | null {
  try {
    return JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

function normalizeSessionData(payload: Partial<SessionData> | null): SessionData | null {
  if (!payload || !payload.userId || !payload.masterKeyHash || !payload.deviceId) {
    return null;
  }

  const masterKey = Buffer.isBuffer(payload.masterKey)
    ? payload.masterKey
    : Buffer.from(typeof payload.masterKey === "string" ? payload.masterKey : "", "base64");

  if (masterKey.length !== 32) {
    return null;
  }

  return {
    userId: payload.userId,
    masterKey,
    masterKeyHash: payload.masterKeyHash,
    createdAt: payload.createdAt || Date.now(),
    lastActivityAt: payload.lastActivityAt || Date.now(),
    deviceId: payload.deviceId,
  };
}

function normalizePendingSessionData(payload: Partial<PendingSessionData> | null): PendingSessionData | null {
  if (!payload || !payload.userId || !payload.masterKeyHash || !payload.kind) {
    return null;
  }

  const masterKey = Buffer.isBuffer(payload.masterKey)
    ? payload.masterKey
    : Buffer.from(typeof payload.masterKey === "string" ? payload.masterKey : "", "base64");

  if (masterKey.length !== 32) {
    return null;
  }

  return {
    kind: payload.kind,
    userId: payload.userId,
    masterKey,
    masterKeyHash: payload.masterKeyHash,
    createdAt: payload.createdAt || Date.now(),
  };
}

export function createSession(
  _sessionId: string,
  userId: string,
  masterKey: Buffer,
  masterKeyHash: string,
  deviceId: string
): string {
  if (masterKey.length !== 32) {
    throw new Error("Master key must be 32 bytes");
  }

  const payload: SessionStoragePayload = {
    userId,
    masterKey: masterKey.toString("base64"),
    masterKeyHash,
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    deviceId,
  };

  return encodeSessionPayload(payload);
}

export function createPendingSession(
  _pendingId: string,
  kind: PendingSessionKind,
  userId: string,
  masterKey: Buffer,
  masterKeyHash: string
): string {
  if (masterKey.length !== 32) {
    throw new Error("Master key must be 32 bytes");
  }

  const payload: PendingSessionStoragePayload = {
    kind,
    userId,
    masterKey: masterKey.toString("base64"),
    masterKeyHash,
    createdAt: Date.now(),
  };

  return encodeSessionPayload(payload);
}

export function getPendingSession(
  pendingId: string,
  kind: PendingSessionKind,
  userId?: string
): PendingSessionData | null {
  const payload = decodeSessionPayload<Record<string, unknown>>(pendingId);
  const pending = normalizePendingSessionData(payload as Partial<PendingSessionData> | null);

  if (!pending || pending.kind !== kind) {
    return null;
  }

  if (userId && pending.userId !== userId) {
    return null;
  }

  if (Date.now() - pending.createdAt > PENDING_SESSION_TIMEOUT) {
    return null;
  }

  return pending;
}

export function destroyPendingSession(_pendingId: string): void {
  return;
}

export function getMasterKey(
  sessionId: string,
  userId: string
): Buffer | null {
  const payload = decodeSessionPayload<Record<string, unknown>>(sessionId);
  const session = normalizeSessionData(payload as Partial<SessionData> | null);

  if (!session || session.userId !== userId) {
    return null;
  }

  if (Date.now() - session.lastActivityAt > AUTO_LOCK_TIMEOUT) {
    return null;
  }

  return session.masterKey;
}

export function getSessionMetadata(
  sessionId: string
): Omit<SessionData, "masterKey"> | null {
  const payload = decodeSessionPayload<Record<string, unknown>>(sessionId);
  const session = normalizeSessionData(payload as Partial<SessionData> | null);

  if (!session) {
    return null;
  }

  if (Date.now() - session.lastActivityAt > AUTO_LOCK_TIMEOUT) {
    return null;
  }

  return {
    userId: session.userId,
    masterKeyHash: session.masterKeyHash,
    createdAt: session.createdAt,
    lastActivityAt: session.lastActivityAt,
    deviceId: session.deviceId,
  };
}

export function isSessionActive(sessionId: string): boolean {
  return getSessionMetadata(sessionId) !== null;
}

export function destroySession(_sessionId: string): void {
  return;
}

export function getUserSessions(_userId: string): string[] {
  return [];
}

export function revokeAllUserSessions(_userId: string): void {
  return;
}

export function cleanupExpiredSessions(_maxAge: number = 3600000): void {
  return;
}
