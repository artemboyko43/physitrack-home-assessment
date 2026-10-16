import { DatabaseSync } from "node:sqlite";

export type StoredSession = {
  sessionId: string;
  userId: string;
  reps: number;
  durationSec: number;
  performedAt: string;
  createdAt: string;
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS sessions (
  session_id   TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  reps         INTEGER NOT NULL,
  duration_sec REAL NOT NULL,
  performed_at TEXT NOT NULL,
  created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user
  ON sessions (user_id, performed_at DESC);
`;

const SELECT_SESSION = `
SELECT
  session_id AS sessionId,
  user_id AS userId,
  reps,
  duration_sec AS durationSec,
  performed_at AS performedAt,
  created_at AS createdAt
FROM sessions
`;

export function openDatabase(filename: string): DatabaseSync {
  const db = new DatabaseSync(filename);
  db.exec(SCHEMA);
  return db;
}

export function findSession(db: DatabaseSync, sessionId: string): StoredSession | undefined {
  const row = db.prepare(`${SELECT_SESSION} WHERE session_id = ?`).get(sessionId);
  return row === undefined ? undefined : readSession(row);
}

export function listSessions(db: DatabaseSync, userId: string): StoredSession[] {
  const rows = db.prepare(`${SELECT_SESSION} WHERE user_id = ?`).all(userId);
  return rows.map((row) => readSession(row)).sort(newestFirst);
}

export function insertSession(
  db: DatabaseSync,
  session: Omit<StoredSession, "createdAt"> & { createdAt?: string },
): StoredSession {
  const createdAt = session.createdAt ?? new Date().toISOString();
  db.prepare(
    `INSERT INTO sessions (session_id, user_id, reps, duration_sec, performed_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(session.sessionId, session.userId, session.reps, session.durationSec, session.performedAt, createdAt);

  return { ...session, createdAt };
}

export function isUniqueConstraint(error: unknown): boolean {
  return error instanceof Error && error.message.includes("UNIQUE constraint failed");
}

function newestFirst(a: StoredSession, b: StoredSession): number {
  const byPerformedAt = Date.parse(b.performedAt) - Date.parse(a.performedAt);
  if (byPerformedAt !== 0) return byPerformedAt;
  return b.createdAt.localeCompare(a.createdAt);
}

function readSession(row: unknown): StoredSession {
  if (row === null || typeof row !== "object") {
    throw new Error("Stored session row is invalid");
  }

  const record = row as Record<string, unknown>;
  const { sessionId, userId, reps, durationSec, performedAt, createdAt } = record;

  if (
    typeof sessionId !== "string" ||
    typeof userId !== "string" ||
    typeof reps !== "number" ||
    typeof durationSec !== "number" ||
    typeof performedAt !== "string" ||
    typeof createdAt !== "string"
  ) {
    throw new Error("Stored session row is invalid");
  }

  return { sessionId, userId, reps, durationSec, performedAt, createdAt };
}
