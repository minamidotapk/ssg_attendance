import type { AttendanceLogRow } from "@/lib/attendance-log-client-cache"
import { DEFAULT_ATTENDANCE_LOG_WINDOW_DAYS } from "@/lib/attendance-log-constants"
import { formatLogDate } from "@/lib/attendance-log-display"

export type AttendanceLogsApiRange = {
  mode: string
  from: string
  to: string
  windowDays?: number
}

export type AttendanceLogsApiResponse = {
  error?: string
  rows?: AttendanceLogRow[]
  range?: AttendanceLogsApiRange
}

/** User-facing hint from API `range` (null = no banner). */
export function rangeHintFromApiResponse(
  range: AttendanceLogsApiRange | undefined,
  defaultWindowDays = DEFAULT_ATTENDANCE_LOG_WINDOW_DAYS,
): string | null {
  if (!range) return null
  if (range.mode === "rolling") {
    return `Loaded ${formatLogDate(range.from)} → ${formatLogDate(range.to)} (last ${range.windowDays ?? defaultWindowDays} days). The database is not fully scanned—pick a date for a specific day.`
  }
  if (range.mode === "single") return null
  if (range.mode === "custom") {
    return `Loaded ${formatLogDate(range.from)} → ${formatLogDate(range.to)}.`
  }
  return null
}
