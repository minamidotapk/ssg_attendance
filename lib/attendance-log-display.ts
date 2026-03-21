/** Philippines — calendar labels (DB stores `YYYY-MM-DD`). */
const MANILA_TZ = "Asia/Manila"

/**
 * Display only — format a stored `YYYY-MM-DD` as a long date in Manila.
 * Anchor at local noon (+08) so the calendar day matches Philippines date.
 */
export function formatLogDate(ymd: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd
  const dt = new Date(`${ymd}T12:00:00+08:00`)
  if (Number.isNaN(dt.getTime())) return ymd
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: MANILA_TZ,
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(dt)
}

/**
 * Display only — stored times as Philippines wall clock with AM/PM.
 * Accepts `HH:MM:SS` or `HH:MM` (24h) from the API.
 */
export function formatLogTime(t: string | null): string {
  if (!t) return "—"
  const parts = t.split(":")
  const h24 = Number(parts[0])
  const mi = Number((parts[1] ?? "0").slice(0, 2))
  if (!Number.isFinite(h24) || !Number.isFinite(mi)) return t
  const h = ((h24 % 24) + 24) % 24
  const ampm = h < 12 ? "AM" : "PM"
  let h12 = h % 12
  if (h12 === 0) h12 = 12
  return `${h12}:${String(mi).padStart(2, "0")} ${ampm}`
}

function minutesSinceMidnight(hms: string): number | null {
  const parts = hms.split(":")
  const h = Number(parts[0])
  const m = Number(parts[1] ?? 0)
  const s = Number(parts[2] ?? 0)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m + (Number.isFinite(s) ? s / 60 : 0)
}

/** Duty length from same-row time strings (Manila wall clock, same calendar day). */
export function formatDutyHours(
  timeIn: string | null,
  timeOut: string | null,
): string {
  if (!timeIn || !timeOut) return "—"
  const start = minutesSinceMidnight(timeIn)
  const end = minutesSinceMidnight(timeOut)
  if (start === null || end === null || end <= start) return "—"
  const totalMins = Math.round(end - start)
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}
