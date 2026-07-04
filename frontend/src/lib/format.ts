export function formatDistance(value: number) {
  return `${value.toFixed(1)} km`;
}

export function formatRating(value: number | null, count: number) {
  if (value === null || count === 0) {
    return "No ratings yet";
  }

  return `${value.toFixed(1)}/5 from ${count} review${count === 1 ? "" : "s"}`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
