export function countReps(angles: readonly number[]): number {
  let phase: "standing" | "deep" = "standing";
  let reps = 0;

  for (const angle of angles) {
    if (phase === "standing" && angle < 100) {
      phase = "deep";
    } else if (phase === "deep" && angle > 160) {
      phase = "standing";
      reps += 1;
    }
  }

  return reps;
}
