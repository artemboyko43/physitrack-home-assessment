import { serve } from "@hono/node-server";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { openDatabase } from "./db";
import { createApp } from "./sessions";

const defaultDatabasePath = path.resolve(process.cwd(), "data/sessions.db");

function startServer(): void {
  const databasePath = process.env.DATABASE_PATH ?? defaultDatabasePath;
  if (databasePath !== ":memory:") {
    mkdirSync(path.dirname(databasePath), { recursive: true });
  }

  const db = openDatabase(databasePath);
  const app = createApp(db);
  const port = Number(process.env.PORT ?? 3001);

  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`sessions api listening on http://localhost:${info.port}`);
  });
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(path.resolve(entry)).href) {
  startServer();
}
