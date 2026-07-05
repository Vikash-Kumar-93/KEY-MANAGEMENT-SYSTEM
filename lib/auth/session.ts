const AUTO_LOCK_TIMEOUT = parseInt(
  process.env.AUTO_LOCK_TIMEOUT_MINUTES || "15",
  10
) * 60 * 1000;

const PENDING_SESSION_TIMEOUT = 10 * 60 * 1000;

type PendingSessionKind = "setup" | "unlock";

const globalAny: any = globalThis as any;
if (!globalAny.__PKMS_SESSION_STORE__) globalAny.__PKMS_SESSION_STORE__ = new Map<string, SessionData>();
if (!globalAny.__PKMS_PENDING_SESSION_STORE__) globalAny.__PKMS_PENDING_SESSION_STORE__ = new Map<string, PendingSessionData>();

const sessionStore: Map<string, SessionData> = globalAny.__PKMS_SESSION_STORE__;
const pendingSessionStore: Map<string, PendingSessionData> = globalAny.__PKMS_PENDING_SESSION_STORE__;

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

export function createSession(
  sessionId: string,
  userId: string,
  masterKey: Buffer,
  masterKeyHash: string,
  deviceId: string
): void {
  if (masterKey.length !== 32) {
    throw new Error("Master key must be 32 bytes");
  }

  sessionStore.set(sessionId, {
    userId,
    masterKey,
    masterKeyHash,
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    deviceId,
  });

  scheduleAutoLock(sessionId);
}

export function createPendingSession(
  pendingId: string,
  kind: PendingSessionKind,
  userId: string,
  masterKey: Buffer,
  masterKeyHash: string
): void {
  if (masterKey.length !== 32) {
    throw new Error("Master key must be 32 bytes");
  }

  pendingSessionStore.set(pendingId, {
    kind,
    userId,
    masterKey,
    masterKeyHash,
    createdAt: Date.now(),
  });

  schedulePendingSessionExpiry(pendingId);
}

export function getPendingSession(
  pendingId: string,
  kind: PendingSessionKind,
  userId?: string
): PendingSessionData | null {
  const pending = pendingSessionStore.get(pendingId);

  if (!pending || pending.kind !== kind) {
    return null;
  }

  if (userId && pending.userId !== userId) {
    return null;
  }

  if (Date.now() - pending.createdAt > PENDING_SESSION_TIMEOUT) {
    destroyPendingSession(pendingId);
    return null;
  }

  return pending;
}

export function destroyPendingSession(pendingId: string): void {
  const pending = pendingSessionStore.get(pendingId);

  if (pending) {
    pending.masterKey.fill(0);
    pendingSessionStore.delete(pendingId);
  }
}

export function getMasterKey(
  sessionId: string,
  userId: string
): Buffer | null {
  const session = sessionStore.get(sessionId);

  if (!session || session.userId !== userId) {
    return null;
  }

  const inactivityMs = Date.now() - session.lastActivityAt;
  if (inactivityMs > AUTO_LOCK_TIMEOUT) {
    destroySession(sessionId);
    return null;
  }

  session.lastActivityAt = Date.now();
  return session.masterKey;
}

export function getSessionMetadata(
  sessionId: string
): Omit<SessionData, "masterKey"> | null {
  const session = sessionStore.get(sessionId);

  if (!session) {
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
  const session = sessionStore.get(sessionId);

  if (!session) {
    return false;
  }

  if (Date.now() - session.lastActivityAt > AUTO_LOCK_TIMEOUT) {
    destroySession(sessionId);
    return false;
  }

  return true;
}

export function destroySession(sessionId: string): void {
  const session = sessionStore.get(sessionId);

  if (session) {
    session.masterKey.fill(0);
    sessionStore.delete(sessionId);
  }
}

export function getUserSessions(userId: string): string[] {
  const userSessions: string[] = [];

  for (const [sessionId, session] of sessionStore.entries()) {
    if (session.userId !== userId) {
      continue;
    }

    if (Date.now() - session.lastActivityAt <= AUTO_LOCK_TIMEOUT) {
      userSessions.push(sessionId);
    } else {
      destroySession(sessionId);
    }
  }

  return userSessions;
}

export function revokeAllUserSessions(userId: string): void {
  for (const sessionId of getUserSessions(userId)) {
    destroySession(sessionId);
  }
}

export function cleanupExpiredSessions(maxAge: number = 3600000): void {
  for (const [sessionId, session] of sessionStore.entries()) {
    const ageMs = Date.now() - session.createdAt;
    const inactivityMs = Date.now() - session.lastActivityAt;

    if (ageMs > maxAge || inactivityMs > AUTO_LOCK_TIMEOUT) {
      destroySession(sessionId);
    }
  }

  for (const [pendingId, pending] of pendingSessionStore.entries()) {
    if (Date.now() - pending.createdAt > PENDING_SESSION_TIMEOUT) {
      destroyPendingSession(pendingId);
    }
  }
}

function scheduleAutoLock(sessionId: string): void {
  const timeout = setTimeout(() => {
    const session = sessionStore.get(sessionId);

    if (!session) {
      return;
    }

    if (Date.now() - session.lastActivityAt > AUTO_LOCK_TIMEOUT) {
      destroySession(sessionId);
      return;
    }

    scheduleAutoLock(sessionId);
  }, AUTO_LOCK_TIMEOUT);

  timeout.unref();
}

function schedulePendingSessionExpiry(pendingId: string): void {
  const timeout = setTimeout(() => {
    destroyPendingSession(pendingId);
  }, PENDING_SESSION_TIMEOUT);

  timeout.unref();
}
