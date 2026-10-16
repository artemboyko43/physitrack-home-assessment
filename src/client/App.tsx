import { useEffect, useRef, useState } from "react";
import { countReps } from "../counter/countReps";
import { fetchSessions, saveSession, sessionPayload, type SavedSession } from "./api";
import { FIXTURES, type FixtureChoice } from "./fixtures";
import { formatDuration, formatWhen } from "./format";

const PATIENTS = [
  { id: "ada", name: "Ada", token: "dev-token-ada" },
  { id: "ben", name: "Ben", token: "dev-token-ben" },
] as const;

type Patient = (typeof PATIENTS)[number];

function requiredItem<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`App is missing ${label}`);
  return value;
}

const INITIAL_PATIENT = requiredItem(PATIENTS[0], "a patient");
const INITIAL_FIXTURE = requiredItem(FIXTURES[0], "a fixture");

type CountResult = {
  fixtureFile: string;
  sessionId: string;
  reps: number;
  durationSec: number;
  performedAt: string;
};

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved" }
  | { status: "duplicate" }
  | { status: "error"; message: string };

type ListState =
  | { status: "loading" }
  | { status: "ready"; sessions: SavedSession[] }
  | { status: "error"; message: string };

export function App() {
  const [patient, setPatient] = useState<Patient>(INITIAL_PATIENT);
  const [fixture, setFixture] = useState<FixtureChoice>(INITIAL_FIXTURE);
  const [result, setResult] = useState<CountResult | null>(null);
  const [save, setSave] = useState<SaveState>({ status: "idle" });
  const [list, setList] = useState<ListState>({ status: "loading" });
  const patientRef = useRef(patient);
  patientRef.current = patient;

  useEffect(() => {
    void loadSessions(patient, false);
  }, [patient]);

  async function loadSessions(forPatient: Patient, quiet: boolean): Promise<void> {
    if (!quiet) setList({ status: "loading" });
    try {
      const sessions = await fetchSessions(forPatient.token);
      if (patientRef.current.id !== forPatient.id) return;
      setList({ status: "ready", sessions });
    } catch (error) {
      if (patientRef.current.id !== forPatient.id) return;
      const message = error instanceof Error ? error.message : "Could not load sessions.";
      setList({ status: "error", message });
    }
  }

  function selectPatient(choice: Patient): void {
    setPatient(choice);
    setResult(null);
    setSave({ status: "idle" });
  }

  function onCount(): void {
    const reps = countReps(fixture.data.angles);
    setResult({
      fixtureFile: fixture.file,
      sessionId: crypto.randomUUID(),
      reps,
      durationSec: fixture.data.angles.length / fixture.data.sampleRateHz,
      performedAt: new Date().toISOString(),
    });
    setSave({ status: "idle" });
  }

  async function onSave(): Promise<void> {
    if (result === null || save.status === "saving") return;
    const savingPatient = patient;
    setSave({ status: "saving" });
    const outcome = await saveSession(savingPatient.token, sessionPayload(result));
    if (patientRef.current.id !== savingPatient.id) return;

    if (outcome.status === "error") {
      setSave(outcome);
      return;
    }

    setSave({ status: outcome.status });
    await loadSessions(savingPatient, true);
  }

  return (
    <main>
      <p className="eyebrow">Physitrack MoCap</p>
      <h1>Rep Counter</h1>
      <p className="lede">
        Pick a knee-angle trace, count the squats in this browser, and save the result. The angles stay here.
      </p>

      <fieldset>
        <legend>Patient</legend>
        <div className="choices">
          {PATIENTS.map((choice) => (
            <label className="choice" key={choice.id}>
              <input
                type="radio"
                name="patient"
                value={choice.id}
                checked={patient.id === choice.id}
                data-testid={`patient-${choice.id}`}
                onChange={() => selectPatient(choice)}
              />
              <span>{choice.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Fixture</legend>
        <div className="choices">
          {FIXTURES.map((choice) => (
            <label className="choice" key={choice.id}>
              <input
                type="radio"
                name="fixture"
                value={choice.id}
                checked={fixture.id === choice.id}
                data-testid={`fixture-${choice.id}`}
                onChange={() => setFixture(choice)}
              />
              <span>
                <span className="file">{choice.file}</span>
                <span className="description">{choice.data.description}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="actions">
        <button type="button" data-testid="count" onClick={onCount}>
          Count
        </button>
      </div>

      {result !== null ? (
        <section className="panel" aria-label="Count result">
          <p className="file">{result.fixtureFile}</p>
          <p className="figure">
            <span data-testid="reps">{result.reps}</span> reps
            <span className="dot" aria-hidden="true">
              ·
            </span>
            <span data-testid="duration">{formatDuration(result.durationSec)}</span>
          </p>
          <p className="meta">
            <span>{formatWhen(result.performedAt)}</span>
            <code data-testid="session-id">{result.sessionId}</code>
          </p>
          <div className="actions">
            <button type="button" data-testid="save" onClick={() => void onSave()} disabled={save.status === "saving"}>
              {save.status === "error" ? "Retry" : save.status === "saving" ? "Saving…" : "Save"}
            </button>
          </div>
          {save.status === "saved" || save.status === "duplicate" ? (
            <p role="status" className="status ok" data-testid="save-status">
              {save.status === "saved" ? "Saved." : "Already saved."}
            </p>
          ) : null}
          {save.status === "error" ? (
            <p role="alert" className="status bad" data-testid="save-status">
              {save.message} The same session id will be sent again.
            </p>
          ) : null}
        </section>
      ) : null}

      <section aria-labelledby="history-heading">
        <h2 id="history-heading">{patient.name}&apos;s sessions</h2>
        {list.status === "loading" ? <p>Loading sessions…</p> : null}
        {list.status === "error" ? (
          <p role="alert" className="status bad" data-testid="list-error">
            {list.message}
          </p>
        ) : null}
        {list.status === "ready" && list.sessions.length === 0 ? (
          <p data-testid="empty-sessions">No sessions yet.</p>
        ) : null}
        {list.status === "ready" && list.sessions.length > 0 ? (
          <ul className="sessions" data-testid="session-list">
            {list.sessions.map((session) => (
              <li key={session.sessionId} data-testid="session-row">
                <span>{formatWhen(session.performedAt)}</span>
                <span>{session.reps} reps</span>
                <span>{formatDuration(session.durationSec)}</span>
                <code>{session.sessionId}</code>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}
