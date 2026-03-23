import type { DayScheduleWindow, WeeklyScheduleHours } from "@/lib/schedule-types"
import { SCHEDULE_WEEKDAYS } from "@/lib/schedule-types"
import { parseTimeToMinutes } from "@/lib/schedule-grid"
import {
  coerceScheduleTime,
  normalizeDayToWindows,
} from "@/lib/schedule-normalize"

function validateWindow(open: string, close: string): DayScheduleWindow | null {
  const o = coerceScheduleTime(open)
  const c = coerceScheduleTime(close)
  if (!o || !c) return null
  const oMin = parseTimeToMinutes(o)!
  const cMin = parseTimeToMinutes(c)!
  if (cMin <= oMin) return null
  return { open: o, close: c }
}

/**
 * Parses API body `{ hours: { Monday?: [...] | {open,close}, ... } }` or flat `hours` object.
 * Each day: array of windows or a single window object (legacy).
 */
export function parseWeeklyScheduleBody(body: unknown): WeeklyScheduleHours | null {
  if (!body || typeof body !== "object") return null
  const o = body as Record<string, unknown>
  const raw =
    o.hours !== undefined && typeof o.hours === "object" && o.hours !== null
      ? (o.hours as Record<string, unknown>)
      : o

  const out: WeeklyScheduleHours = {}

  for (const day of SCHEDULE_WEEKDAYS) {
    if (!(day in raw)) continue
    const v = raw[day]
    if (v === null || v === undefined) continue

    const candidates = normalizeDayToWindows(v)
    const windows: DayScheduleWindow[] = []
    for (const c of candidates) {
      const w = validateWindow(c.open, c.close)
      if (w) windows.push(w)
    }
    if (windows.length > 0) out[day] = windows
  }

  return out
}
