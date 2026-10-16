import type { SessionFixture } from "../counter/types";
import clean from "../../fixtures/session-clean.json";
import noisy from "../../fixtures/session-noisy.json";
import shallow from "../../fixtures/session-shallow.json";

export type FixtureChoice = {
  id: string;
  file: string;
  data: SessionFixture;
};

export const FIXTURES: readonly FixtureChoice[] = [
  { id: "clean", file: "session-clean.json", data: clean },
  { id: "noisy", file: "session-noisy.json", data: noisy },
  { id: "shallow", file: "session-shallow.json", data: shallow },
];
