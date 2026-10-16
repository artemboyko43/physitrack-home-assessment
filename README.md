# Rep Counter

A patient squats in front of a camera. The browser already has one knee angle per frame. This app counts the squats and keeps a history of sessions. Counting happens in the browser. The server stores the result, not the angles.

## Run

```bash
npm install && npm start
```

Open [http://localhost:5173](http://localhost:5173). The page talks to the API through the Vite dev server. The API listens on port 3001.

`npm test` runs the rep-counter tests and the sessions API tests.

## Patients

The screen has two hard-coded patients. The token stays in memory and is sent as `Authorization: Bearer …`.


| Patient | Token           |
| ------- | --------------- |
| Ada     | `dev-token-ada` |
| Ben     | `dev-token-ben` |


Each patient sees only their own sessions.

## Assumptions

- A rep is counted when the angle goes strictly below 100°, then later strictly above 160°. Samples of exactly 100° or 160° do not cross.
- The trace is not smoothed or debounced. The gap between the two thresholds is what ignores noise and a pause at the bottom.
- `durationSec` is `angles.length / sampleRateHz`. `performedAt` is the browser's clock at the moment Count is pressed, stored as ISO-8601.
- The browser creates the `sessionId` and reuses it if the save is retried. The first write wins. An identical retry returns the stored row. A different payload, or the same id from the other patient, is rejected with 409.
- Results are stored in SQLite at `data/sessions.db`, created on startup. That directory is gitignored.
- The tokens above are stand-ins for a login. They are not accounts.

