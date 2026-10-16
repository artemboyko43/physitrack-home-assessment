import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { countReps } from "./countReps";
import type { SessionFixture } from "./types";

const fixturesDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../fixtures",
);

function loadFixture(name: string): SessionFixture {
  return JSON.parse(readFileSync(path.join(fixturesDir, name), "utf8")) as SessionFixture;
}

describe("countReps fixtures", () => {
  it.each([
    "session-clean.json",
    "session-noisy.json",
    "session-shallow.json",
  ])("%s matches expectedReps", (name) => {
    const fixture = loadFixture(name);
    expect(countReps(fixture.angles)).toBe(fixture.expectedReps);
  });
});

describe("countReps boundaries", () => {
  it("counts an empty trace as zero", () => {
    expect(countReps([])).toBe(0);
  });

  it("ignores standing-only samples", () => {
    expect(countReps([172, 171, 170, 172])).toBe(0);
  });

  it("does not count a descent that never returns above 160", () => {
    expect(countReps([170, 120, 90, 140])).toBe(0);
  });

  it("counts one full cycle", () => {
    expect(countReps([170, 90, 170])).toBe(1);
  });

  it("counts two full cycles", () => {
    expect(countReps([170, 90, 170, 90, 170])).toBe(2);
  });

  it("counts a pause at the bottom as one rep", () => {
    expect(countReps([170, 95, 90, 91, 89, 90, 170])).toBe(1);
  });

  it("ignores a shallow dip that stays at or above 100", () => {
    expect(countReps([170, 120, 170])).toBe(0);
  });

  it("does not arm on 100 and does arm on 99.9", () => {
    expect(countReps([170, 100, 170])).toBe(0);
    expect(countReps([170, 99.9, 170])).toBe(1);
  });

  it("does not finish on 160 and does finish on 160.1", () => {
    expect(countReps([170, 90, 160])).toBe(0);
    expect(countReps([170, 90, 160.1])).toBe(1);
  });

  it("counts one rep when the patient dips again before standing", () => {
    expect(countReps([170, 90, 150, 90, 170])).toBe(1);
  });
});
