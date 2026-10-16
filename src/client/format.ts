export function formatDuration(seconds: number): string {
  const rounded = Math.round(seconds * 1000) / 1000;
  return `${rounded} s`;
}

export function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date);
}
