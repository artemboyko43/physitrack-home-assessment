# Agent instructions

Physitrack MoCap take-home: a rep counter for squat sessions.

The browser receives one knee angle per frame, about 172° standing and about 90° in a deep squat. Build a small Node, TypeScript, and React app that counts squats and keeps a history of sessions.

## Rep rule

`countReps(angles: readonly number[]): number` is a pure function. Tests call this function. The UI imports the same function and runs it in the browser.

Start in the standing phase.

- A sample strictly below 100° (`angle < 100`) arms a rep and enters the deep phase.
- The next sample strictly above 160° (`angle > 160`) completes that rep, adds one, and returns to standing.
- 100° does not arm a rep. 160° does not complete one.
- Samples between the two crossings do not add reps. A pause at the bottom is still one rep.
- A squat that never goes below 100° does not count.
- A squat that goes below 100° and never returns above 160° does not count.

Do not smooth, debounce, or otherwise filter the signal. The gap between 100° and 160° is the hysteresis. The noisy fixture must pass on the raw angles.

## Fixtures

Each file in `fixtures/` is one session at 30 frames per second.

```json
{ "description": "...", "expectedReps": 10, "sampleRateHz": 30, "angles": [171.2, 172.4] }
```


| File                            | Expected reps |
| ------------------------------- | ------------- |
| `fixtures/session-clean.json`   | 10            |
| `fixtures/session-noisy.json`   | 8             |
| `fixtures/session-shallow.json` | 7             |


`durationSec = angles.length / sampleRateHz`.

## API

Every request needs `Authorization: Bearer <token>`. A missing or unknown token is `401`. A hard-coded token per patient is enough. A patient sees only their own sessions.

`POST /sessions` saves `{ sessionId, reps, durationSec, performedAt }`.

- The browser creates `sessionId` (UUID) when it counts, and reuses that id if the save is retried.
- `performedAt` is the client clock at count time, as ISO-8601.
- The same `sessionId` is stored once. First write wins.
- An identical retry returns the stored row and does not insert another.
- A different payload for an existing `sessionId`, or the same id sent by another patient, is `409`. Do not return the other patient's row.
- A body that fails validation is `400`.

`GET /sessions` lists only the caller's sessions, newest `performedAt` first.

Angles stay in the browser. The server never receives the angle array.

