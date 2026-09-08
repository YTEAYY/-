export function pad(value) {
  return String(value).padStart(2, "0");
}

export function fmtDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fmtTemp(celsius, unit) {
  if (celsius == null || Number.isNaN(celsius)) return "-";
  const value = unit === "F" ? celsius * 9 / 5 + 32 : celsius;
  return `${Math.round(value)}°${unit === "F" ? "F" : ""}`;
}

export function dateInTimezone(date, timezone) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function seasonFor(date = new Date()) {
  const month = typeof date === "string" ? Number(date.slice(5, 7)) : date.getMonth() + 1;
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}
