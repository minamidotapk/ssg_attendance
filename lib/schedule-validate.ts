import type { WeeklyScheduleHours } from "@/lib/schedule-types"
import { SCHEDULE_WEEKDAYS } from "@/lib/schedule-types"
import { parseTimeToMinutes } from "@/lib/schedule-grid"

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/

function isValidTime(s: string) {
  return TIME_RE.test(s.trim()) && parseTimeToMinutes(s) !== null
}

/**
 * Parses API body: either `{ hours: { Monday?: {...}, ... } }` or a flat hours object.
 * Returns null if malformed.
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
    if (typeof v !== "object") return null
    const open = (v as { open?: unknown }).open
    const close = (v as { close?: unknown }).close
    if (typeof open !== "string" || typeof close !== "string") return null
    if (!isValidTime(open) || !isValidTime(close)) return null
    const oMin = parseTimeToMinutes(open)!
    const cMin = parseTimeToMinutes(close)!
    if (cMin <= oMin) return null
    out[day] = { open: open.trim(), close: close.trim() }
  }

  return out
}
