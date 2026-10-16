export type SessionPayload = {
  sessionId: string;
  reps: number;
  durationSec: number;
  performedAt: string;
};

export type SavedSession = SessionPayload & {
  userId: string;
  createdAt: string;
};

export type SaveOutcome =
  | { status: "saved"; session: SavedSession }
  | { status: "duplicate"; session: SavedSession }
  | { status: "error"; message: string };

export function sessionPayload(result: SessionPayload): SessionPayload {
  return {
    sessionId: result.sessionId,
    reps: result.reps,
    durationSec: result.durationSec,
    performedAt: result.performedAt,
  };
}

export async function saveSession(token: string, result: SessionPayload): Promise<SaveOutcome> {
  const payload = sessionPayload(result);
  let response: Response;
  try {
    response = await fetch("/api/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    return { status: "error", message: "Could not reach the server." };
  }

  if (response.status === 201 || response.status === 200) {
    return {
      status: response.status === 201 ? "saved" : "duplicate",
      session: (await response.json()) as SavedSession,
    };
  }

  return { status: "error", message: await errorMessage(response) };
}

export async function fetchSessions(token: string): Promise<SavedSession[]> {
  let response: Response;
  try {
    response = await fetch("/api/sessions", {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new Error("Could not reach the server.");
  }

  if (!response.ok) {
    throw new Error(await errorMessage(response));
  }

  return (await response.json()) as SavedSession[];
}

async function errorMessage(response: Response): Promise<string> {
  if (response.status === 409) {
    return "This session id is already saved with a different result.";
  }
  if (response.status === 401) return "The token was rejected.";
  if (response.status === 400) return "The session result was rejected.";

  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === "string" && body.error !== "") return body.error;
  } catch {
    return `Request failed (${response.status}).`;
  }

  return `Request failed (${response.status}).`;
}
