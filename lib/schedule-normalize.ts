import type { DayScheduleWindow, ScheduleWeekday, WeeklyScheduleHours } from "@/lib/schedule-types"
import { SCHEDULE_WEEKDAYS } from "@/lib/schedule-types"

const LOWER_TO_WEEKDAY: Record<string, ScheduleWeekday> = Object.fromEntries(
  SCHEDULE_WEEKDAYS.map((d) => [d.toLowerCase(), d]),
) as Record<string, ScheduleWeekday>

/**
 * Coerce stored open/close to `HH:mm` (24h). Handles `9:5`, `09:05:30`, `.000` ms, NBSP.
 */
export function coerceScheduleTime(raw: string): string | null {
  const s = String(raw)
    .trim()
    .replace(/\u00a0/g, " ")
    .replace(/^['"]|['"]$/g, "")
  const m =
    /^([01]?\d|2[0-3]):([0-5]?\d)(?::([0-5]?\d))?(?:\.\d+)?$/.exec(s)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) {
    return null
  }
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`
}

function unwrapStoredObject(stored: unknown): unknown {
  if (stored === null || stored === undefined) return stored
  if (typeof stored === "string") {
    const t = stored.trim()
    if (!t.startsWith("{") && !t.startsWith("[")) return stored
    try {
      return JSON.parse(t) as unknown
    } catch {
      return stored
    }
  }
  return stored
}

/**
 * Normalize one day from DB/API: legacy `{ open, close }` or `[]` or `[{open,close},...]`.
 */
export function normalizeDayToWindows(v: unknown): DayScheduleWindow[] {
  if (v === null || v === undefined) return []
  if (Array.isArray(v)) {
    const out: DayScheduleWindow[] = []
    for (const item of v) {
      if (!item || typeof item !== "object") continue
      const openRaw = String((item as { open?: unknown }).open ?? "").trim()
      const closeRaw = String((item as { close?: unknown }).close ?? "").trim()
      const open = coerceScheduleTime(openRaw)
      const close = coerceScheduleTime(closeRaw)
      if (!open || !close) continue
      out.push({ open, close })
    }
    return out
  }
  if (typeof v === "object" && "open" in v && "close" in v) {
    const open = coerceScheduleTime(String((v as { open: unknown }).open).trim())
    const close = coerceScheduleTime(
      String((v as { close: unknown }).close).trim(),
    )
    if (!open || !close) return []
    return [{ open, close }]
  }
  return []
}

/** Full weekly object from stored Mongo `hours` field (supports legacy single-window days). */
export function normalizeWeeklyHoursFromStored(
  stored: unknown,
): WeeklyScheduleHours {
  const unwrapped = unwrapStoredObject(stored)
  if (!unwrapped || typeof unwrapped !== "object") return {}
  const raw = unwrapped as Record<string, unknown>
  const out: WeeklyScheduleHours = {}

  for (const key of Object.keys(raw)) {
    const day = LOWER_TO_WEEKDAY[key.trim().toLowerCase()]
    if (!day) continue
    const windows = normalizeDayToWindows(raw[key])
    if (windows.length > 0) out[day] = windows
  }
  return out
}
