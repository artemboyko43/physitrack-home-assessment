import { beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "./db";
import { createApp, type SessionBody } from "./sessions";

const ADA = "Bearer dev-token-ada";
const BEN = "Bearer dev-token-ben";

const ADA_SESSION: SessionBody = {
  sessionId: "6f1b1c3e-8a2d-4e5f-9c0b-1a2b3c4d5e6f",
  reps: 10,
  durationSec: 36.267,
  performedAt: "2026-10-16T08:00:00.000Z",
};

let app: ReturnType<typeof createApp>;

beforeEach(() => {
  app = createApp(openDatabase(":memory:"));
});

describe("auth", () => {
  it.each([
    ["POST", undefined],
    ["POST", "Bearer wrong-token"],
    ["GET", undefined],
    ["GET", "Bearer wrong-token"],
  ] as const)("%s /sessions with %s is 401", async (method, authorization) => {
    const headers = new Headers({ "Content-Type": "application/json" });
    if (authorization !== undefined) headers.set("Authorization", authorization);

    const response = await app.request("/sessions", {
      method,
      headers,
      ...(method === "POST" ? { body: JSON.stringify(ADA_SESSION) } : {}),
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });
});

describe("POST /sessions", () => {
  it("saves Ada's session and lists only that row", async () => {
    const created = await post(ADA, ADA_SESSION);

    expect(created.status).toBe(201);
    const stored = await created.json();
    expect(stored).toMatchObject({ ...ADA_SESSION, userId: "ada" });
    expect(stored.createdAt).toEqual(expect.any(String));

    const listed = await get(ADA);
    expect(listed.status).toBe(200);
    expect(await listed.json()).toEqual([stored]);
  });

  it("returns the original row when the same session is posted again", async () => {
    const created = await post(ADA, ADA_SESSION);
    const stored = await created.json();

    const replay = await post(ADA, ADA_SESSION);

    expect(replay.status).toBe(200);
    expect(await replay.json()).toEqual(stored);
    expect(await (await get(ADA)).json()).toHaveLength(1);
  });

  it("rejects a different payload for an existing session and keeps the original", async () => {
    const created = await post(ADA, ADA_SESSION);
    const stored = await created.json();

    const conflict = await post(ADA, { ...ADA_SESSION, reps: 4 });

    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toEqual({ error: "Conflict" });
    expect(await (await get(ADA)).json()).toEqual([stored]);
  });

  it("rejects Ben reusing Ada's session id without revealing her row", async () => {
    await post(ADA, ADA_SESSION);

    const conflict = await post(BEN, ADA_SESSION);

    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toEqual({ error: "Conflict" });
    expect(await (await get(BEN)).json()).toEqual([]);
  });

  it.each([
    ["session id", { ...ADA_SESSION, sessionId: "not-a-uuid" }],
    ["fractional reps", { ...ADA_SESSION, reps: 1.5 }],
    ["negative reps", { ...ADA_SESSION, reps: -1 }],
    ["negative duration", { ...ADA_SESSION, durationSec: -1 }],
    ["unparseable time", { ...ADA_SESSION, performedAt: "yesterday" }],
    ["angles", { ...ADA_SESSION, angles: [90, 170] }],
  ])("rejects a body with an invalid %s", async (_label, body) => {
    const response = await post(ADA, body);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid session" });
  });

  it("rejects a body that is not JSON", async () => {
    const response = await app.request("/sessions", {
      method: "POST",
      headers: { Authorization: ADA, "Content-Type": "application/json" },
      body: "{",
    });

    expect(response.status).toBe(400);
  });
});

describe("GET /sessions", () => {
  it("returns an empty list when the patient has no sessions", async () => {
    const response = await get(ADA);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  it("lists only the caller's sessions, newest performedAt first", async () => {
    const earlier = ADA_SESSION;
    const later: SessionBody = {
      sessionId: "7a2c1d4e-9b3e-4f60-8d1c-2b3c4d5e6f70",
      reps: 8,
      durationSec: 27.6,
      performedAt: "2026-10-16T09:30:00.000Z",
    };
    const bens: SessionBody = {
      sessionId: "8b3d2e5f-0c4f-4a71-9e2d-3c4d5e6f7081",
      reps: 7,
      durationSec: 36,
      performedAt: "2026-10-16T10:00:00.000Z",
    };

    await post(ADA, later);
    await post(ADA, earlier);
    await post(BEN, bens);

    const adaList = await (await get(ADA)).json();
    expect(adaList.map((session: SessionBody) => session.sessionId)).toEqual([
      later.sessionId,
      earlier.sessionId,
    ]);

    const benList = await (await get(BEN)).json();
    expect(benList.map((session: SessionBody) => session.sessionId)).toEqual([bens.sessionId]);
  });
});

function post(authorization: string, body: unknown): Promise<Response> {
  return Promise.resolve(
    app.request("/sessions", {
      method: "POST",
      headers: { Authorization: authorization, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

function get(authorization: string): Promise<Response> {
  return Promise.resolve(
    app.request("/sessions", {
      headers: { Authorization: authorization },
    }),
  );
}
