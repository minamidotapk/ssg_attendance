import { coerceScheduleTime } from "@/lib/schedule-normalize"
import type { DayScheduleWindow } from "@/lib/schedule-types"

/** First column label (7 AM). */
export const SCHEDULE_GRID_HOUR_START = 7
/** Last hour block starts at 16:00, so the grid ends at 17:00. */
export const SCHEDULE_GRID_HOUR_END = 16
/** Right boundary label of the grid (17:00). */
export const SCHEDULE_GRID_HOUR_END_BOUNDARY = SCHEDULE_GRID_HOUR_END + 1

const HOUR_COLS: number[] = (() => {
  const out: number[] = []
  for (let h = SCHEDULE_GRID_HOUR_START; h <= SCHEDULE_GRID_HOUR_END; h += 1) {
    out.push(h)
  }
  return out
})()

/** Precomputed hour columns (7–16); avoids reallocating each render. */
export function scheduleHourColumns(): readonly number[] {
  return HOUR_COLS
}

/** e.g. 7 → "7 AM", 12 → "12 PM", 17 → "5 PM" */
export function formatScheduleHourLabel(hour24: number): string {
  const period = hour24 >= 12 ? "PM" : "AM"
  const h12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  return `${h12} ${period}`
}

/** Timetable-style hour digits (e.g. 7 → "07", 8 → "8") to match common wall-clock headers. */
export function formatScheduleHeaderHourFlexible(hour24: number): string {
  if (hour24 === 7) return "07"
  return String(hour24)
}

export function formatScheduleHeaderCellLabel(
  hour24: number,
  minute: 0 | 30,
): string {
  const h = formatScheduleHeaderHourFlexible(hour24)
  return `${h}:${minute === 0 ? "00" : "30"}`
}

/** Minutes from midnight for wall-clock times (shares coercion with DB normalization). */
export function parseTimeToMinutes(hhmm: string): number | null {
  const c = coerceScheduleTime(hhmm)
  if (!c) return null
  const [h, mi] = c.split(":").map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(mi)) return null
  return h * 60 + mi
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
 * Merge half-open minute intervals [start, end), combining overlaps and touches.
 */
export function mergeMinuteIntervals(intervals: [number, number][]): [number, number][] {
  if (intervals.length === 0) return []
  const sorted = [...intervals].sort((a, b) => a[0] - b[0])
  const out: [number, number][] = []
  let [cs, ce] = sorted[0]!
  for (let i = 1; i < sorted.length; i++) {
    const [a, b] = sorted[i]!
    if (a <= ce) ce = Math.max(ce, b)
    else {
      out.push([cs, ce])
      ;[cs, ce] = [a, b]
    }
  }
  out.push([cs, ce])
  return out
}

/**
 * Sub-hour position inside one column: left edge = start of hour (:00), width = span within :00–:60.
 */
export type HourTimelineSegmentPercent = { left: number; width: number }

/** @deprecated use HourTimelineSegmentPercent ({ left, width } in hour column) */
export type ShadeSegmentPercent = HourTimelineSegmentPercent

/**
 * Horizontal bands inside one hour cell (left = 0% at :00, right = 100% at :60)
 * where the published schedule applies, from HH:mm windows.
 */
export function scheduleShadeSegmentsInHour(
  windows: DayScheduleWindow[] | undefined,
  hour24: number,
): HourTimelineSegmentPercent[] {
  if (!windows?.length) return []
  const slotStart = hour24 * 60
  const slotEnd = slotStart + 60
  const raw: [number, number][] = []
  for (const w of windows) {
    const open = parseTimeToMinutes(w.open)
    const close = parseTimeToMinutes(w.close)
    if (open === null || close === null || close <= open) continue
    const lo = Math.max(open, slotStart)
    const hi = Math.min(close, slotEnd)
    if (hi > lo) raw.push([lo, hi])
  }
  const merged = mergeMinuteIntervals(raw)
  return merged.map(([a, b]) => ({
    left: ((a - slotStart) / 60) * 100,
    width: ((b - a) / 60) * 100,
  }))
}

/**
 * True if [open, close) overlaps the hour slot [hour24:00, hour24+1:00).
 */
export function hourSingleWindowOverlapsCell(
  w: DayScheduleWindow,
  hour24: number,
): boolean {
  const open = parseTimeToMinutes(w.open)
  const close = parseTimeToMinutes(w.close)
  if (open === null || close === null || close <= open) return false
  const slotStart = hour24 * 60
  const slotEnd = slotStart + 60
  return slotEnd > open && slotStart < close
}

/**
 * True if any window for that day overlaps the hour column.
 */
export function hourCellIsWithinScheduleDay(
  windows: DayScheduleWindow[] | undefined,
  hour24: number,
): boolean {
  if (!windows?.length) return false
  return windows.some((w) => hourSingleWindowOverlapsCell(w, hour24))
}

/** @deprecated use hourCellIsWithinScheduleDay */
export function hourCellIsWithinRange(
  day: DayScheduleWindow | DayScheduleWindow[] | undefined,
  hour24: number,
): boolean {
  if (!day) return false
  if (Array.isArray(day)) {
    return hourCellIsWithinScheduleDay(day, hour24)
  }
  return hourSingleWindowOverlapsCell(day, hour24)
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
