import { Hono, type Context } from "hono";
import type { DatabaseSync } from "node:sqlite";
import { userIdFromAuthorization } from "./auth";
import {
  findSession,
  insertSession,
  isUniqueConstraint,
  listSessions,
  type StoredSession,
} from "./db";

type Env = {
  Variables: {
    userId: string;
  };
};

export type SessionBody = {
  sessionId: string;
  reps: number;
  durationSec: number;
  performedAt: string;
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ISO_8601 =
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)?$/;

const SESSION_FIELDS = new Set(["sessionId", "reps", "durationSec", "performedAt"]);

export function createApp(db: DatabaseSync): Hono<Env> {
  const app = new Hono<Env>();

  app.use("*", async (c, next) => {
    const userId = userIdFromAuthorization(c.req.header("Authorization"));
    if (userId === undefined) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    c.set("userId", userId);
    await next();
  });

  app.post("/sessions", async (c) => {
    const body = await readBody(c);
    if (body === undefined) {
      return c.json({ error: "Invalid session" }, 400);
    }

    const userId = c.get("userId");
    const existing = findSession(db, body.sessionId);
    if (existing !== undefined) {
      return replayOrConflict(c, existing, userId, body);
    }

    try {
      const stored = insertSession(db, { ...body, userId });
      return c.json(stored, 201);
    } catch (error) {
      if (!isUniqueConstraint(error)) throw error;

      const winner = findSession(db, body.sessionId);
      if (winner === undefined) throw error;
      return replayOrConflict(c, winner, userId, body);
    }
  });

  app.get("/sessions", (c) => {
    return c.json(listSessions(db, c.get("userId")));
  });

  return app;
}

function replayOrConflict(
  c: Context<Env>,
  existing: StoredSession,
  userId: string,
  body: SessionBody,
): Response {
  if (existing.userId !== userId || !sameSession(existing, body)) {
    return c.json({ error: "Conflict" }, 409);
  }
  return c.json(existing, 200);
}

async function readBody(c: Context<Env>): Promise<SessionBody | undefined> {
  try {
    return parseSessionBody(await c.req.json());
  } catch {
    return undefined;
  }
}

function parseSessionBody(value: unknown): SessionBody | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;

  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!SESSION_FIELDS.has(key)) return undefined;
  }

  const { sessionId, reps, durationSec, performedAt } = record;
  if (typeof sessionId !== "string" || !UUID.test(sessionId)) return undefined;
  if (typeof reps !== "number" || !Number.isInteger(reps) || reps < 0) return undefined;
  if (typeof durationSec !== "number" || !Number.isFinite(durationSec) || durationSec < 0) {
    return undefined;
  }
  if (typeof performedAt !== "string" || !ISO_8601.test(performedAt) || !Number.isFinite(Date.parse(performedAt))) {
    return undefined;
  }

  return { sessionId, reps, durationSec, performedAt };
}

function sameSession(existing: StoredSession, body: SessionBody): boolean {
  return (
    existing.reps === body.reps &&
    existing.durationSec === body.durationSec &&
    existing.performedAt === body.performedAt
  );
}
