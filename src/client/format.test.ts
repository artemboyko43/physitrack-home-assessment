import { describe, expect, it } from "vitest";
import clean from "../../fixtures/session-clean.json";
import noisy from "../../fixtures/session-noisy.json";
import shallow from "../../fixtures/session-shallow.json";
import { sessionPayload } from "./api";
import { formatDuration } from "./format";

describe("formatDuration", () => {
  it("shows the fixture durations", () => {
    expect(formatDuration(clean.angles.length / clean.sampleRateHz)).toBe("36.267 s");
    expect(formatDuration(noisy.angles.length / noisy.sampleRateHz)).toBe("27.6 s");
    expect(formatDuration(shallow.angles.length / shallow.sampleRateHz)).toBe("36 s");
  });
});

describe("sessionPayload", () => {
  it("keeps only the four result fields", () => {
    const counted = {
      sessionId: "6f1b1c3e-8a2d-4e5f-9c0b-1a2b3c4d5e6f",
      reps: 10,
      durationSec: clean.angles.length / clean.sampleRateHz,
      performedAt: "2026-10-16T08:00:00.000Z",
      fixtureFile: "session-clean.json",
      angles: clean.angles,
    };

    expect(sessionPayload(counted)).toEqual({
      sessionId: counted.sessionId,
      reps: counted.reps,
      durationSec: counted.durationSec,
      performedAt: counted.performedAt,
    });
  });
});
