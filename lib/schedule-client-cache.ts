/**
 * Client caches for schedule hours + Mon–Sat week logs (sessionStorage, TTL).
 */

import type { AttendanceLogRow } from "@/lib/attendance-log-client-cache"
import type { WeeklyScheduleHours } from "@/lib/schedule-types"

/** v3: resilient user lookup + time/day normalization on server. */
const HOURS_PREFIX = "ssg_schedule_hours_v3:"
const WEEK_LOGS_PREFIX = "ssg_schedule_week_logs_v1:"
export const SCHEDULE_CACHE_TTL_MS = 30 * 60 * 1000

function hoursKey(uid: string) {
  return `${HOURS_PREFIX}${uid}`
}

function weekLogsKey(uid: string, mondayYmd: string) {
  return `${WEEK_LOGS_PREFIX}${uid}:${mondayYmd}`
}

export function readScheduleHoursCache(
  uid: string,
  ttlMs = SCHEDULE_CACHE_TTL_MS,
): WeeklyScheduleHours | null {
  if (typeof sessionStorage === "undefined") return null
  try {
    const raw = sessionStorage.getItem(hoursKey(uid))
    if (!raw) return null
    const parsed = JSON.parse(raw) as { hours: WeeklyScheduleHours; at: number }
    if (!parsed || typeof parsed.at !== "number" || !parsed.hours) return null
    if (Date.now() - parsed.at > ttlMs) return null
    return parsed.hours
  } catch {
    return null
  }
}

export function writeScheduleHoursCache(uid: string, hours: WeeklyScheduleHours) {
  if (typeof sessionStorage === "undefined") return
  try {
    sessionStorage.setItem(
      hoursKey(uid),
      JSON.stringify({ hours, at: Date.now() }),
    )
  } catch {
    /* quota */
  }
}

export function readScheduleWeekLogsCache(
  uid: string,
  mondayYmd: string,
  ttlMs = SCHEDULE_CACHE_TTL_MS,
): AttendanceLogRow[] | null {
  if (typeof sessionStorage === "undefined") return null
  try {
    const raw = sessionStorage.getItem(weekLogsKey(uid, mondayYmd))
    if (!raw) return null
    const parsed = JSON.parse(raw) as { rows: AttendanceLogRow[]; at: number }
    if (!Array.isArray(parsed.rows) || typeof parsed.at !== "number") return null
    if (Date.now() - parsed.at > ttlMs) return null
    return parsed.rows
  } catch {
    return null
  }
}

export function writeScheduleWeekLogsCache(
  uid: string,
  mondayYmd: string,
  rows: AttendanceLogRow[],
) {
  if (typeof sessionStorage === "undefined") return
  try {
    sessionStorage.setItem(
      weekLogsKey(uid, mondayYmd),
      JSON.stringify({ rows, at: Date.now() }),
    )
  } catch {
    /* quota */
  }
}
