import type { DaySchedule } from "@/lib/schedule-types"

/** First column label (7 AM). */
export const SCHEDULE_GRID_HOUR_START = 7
/** Last column is this hour block (5 PM = 17:00–18:00). */
export const SCHEDULE_GRID_HOUR_END = 17

const HOUR_COLS: number[] = (() => {
  const out: number[] = []
  for (let h = SCHEDULE_GRID_HOUR_START; h <= SCHEDULE_GRID_HOUR_END; h += 1) {
    out.push(h)
  }
  return out
})()

/** Precomputed hour columns (7–17); avoids reallocating each render. */
export function scheduleHourColumns(): readonly number[] {
  return HOUR_COLS
}

/** e.g. 7 → "7 AM", 12 → "12 PM", 17 → "5 PM" */
export function formatScheduleHourLabel(hour24: number): string {
  const period = hour24 >= 12 ? "PM" : "AM"
  const h12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  return `${h12} ${period}`
}

/** Minutes from midnight for "HH:mm" admin schedule strings. */
export function parseTimeToMinutes(hhmm: string): number | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(hhmm.trim())
  if (!m) return null
  return Number.parseInt(m[1]!, 10) * 60 + Number.parseInt(m[2]!, 10)
}

/**
 * Stored punch times (HH:mm or HH:mm:ss), Manila wall clock.
 * Matches logic in `lib/attendance-log-display.ts`.
 */
export function parseAttendanceTimeToMinutes(hms: string): number | null {
  const parts = hms.trim().split(":")
  const h = Number(parts[0])
  const mi = Number(parts[1] ?? 0)
  const s = Number(parts[2] ?? 0)
  if (!Number.isFinite(h) || !Number.isFinite(mi)) return null
  return h * 60 + mi + (Number.isFinite(s) ? s / 60 : 0)
}

export function getNowMinutesInTimezone(timeZone: string, now = new Date()): number {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  const parts = fmt.formatToParts(now)
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "NaN")
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "NaN")
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0
  return hour * 60 + minute
}

/**
 * True if [open, close) overlaps the hour slot [hour24:00, hour24+1:00).
 * Invalid or empty ranges yield false.
 */
export function hourCellIsWithinRange(
  day: DaySchedule | undefined,
  hour24: number,
): boolean {
  if (!day) return false
  const open = parseTimeToMinutes(day.open)
  const close = parseTimeToMinutes(day.close)
  if (open === null || close === null || close <= open) return false
  const slotStart = hour24 * 60
  const slotEnd = slotStart + 60
  return slotEnd > open && slotStart < close
}

/**
 * True if [dutyStartMin, dutyEndMin) overlaps hour slot [hour24:00, hour24+1:00).
 */
export function hourSlotOverlapsInterval(
  hour24: number,
  intervalStartMin: number,
  intervalEndMin: number,
): boolean {
  if (intervalEndMin <= intervalStartMin) return false
  const slotStart = hour24 * 60
  const slotEnd = slotStart + 60
  return slotEnd > intervalStartMin && slotStart < intervalEndMin
}
