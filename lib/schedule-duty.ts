import type { AttendanceLogRow } from "@/lib/attendance-log-client-cache"
import type { ScheduleWeekday } from "@/lib/schedule-types"
import { SCHEDULE_WEEKDAYS } from "@/lib/schedule-types"
import {
  type HourTimelineSegmentPercent,
  getNowMinutesInTimezone,
  mergeMinuteIntervals,
  parseAttendanceTimeToMinutes,
  scheduleHourColumns,
} from "@/lib/schedule-grid"

/** Same geometry as schedule shading: minute-accurate slice of the hour column. */
export type DutySegmentInCell = HourTimelineSegmentPercent

/** [day][column index] → duty strips for that hour cell. */
export type ScheduleDutySegments = Record<
  ScheduleWeekday,
  DutySegmentInCell[][]
>

function emptySegmentsForCols(hourCols: readonly number[]): DutySegmentInCell[][] {
  return hourCols.map(() => [])
}

/**
 * For each weekday and grid hour column, clock-in→clock-out overlap as { left, width }
 * (% of cell, :00 at left edge of column).
 */
export function buildDutySegmentsByWeekday(
  rows: AttendanceLogRow[],
  ymdByWeekday: Record<ScheduleWeekday, string>,
  todayYmd: string,
  timeZone: string,
  hourCols: readonly number[],
  now = new Date(),
): ScheduleDutySegments {
  const nowMin = getNowMinutesInTimezone(timeZone, now)
  const out = {} as ScheduleDutySegments
  for (const d of SCHEDULE_WEEKDAYS) {
    out[d] = emptySegmentsForCols(hourCols)
  }

  for (const day of SCHEDULE_WEEKDAYS) {
    const ymd = ymdByWeekday[day]
    const dayRows = rows.filter((r) => r.date === ymd && r.timeIn)
    const raw: [number, number][] = []

    for (const r of dayRows) {
      const start = parseAttendanceTimeToMinutes(r.timeIn!)
      if (start === null) continue

      let endMin: number
      if (r.timeOut) {
        const t = parseAttendanceTimeToMinutes(r.timeOut)
        endMin = t ?? 24 * 60
      } else if (ymd < todayYmd) {
        endMin = 24 * 60
      } else if (ymd > todayYmd) {
        endMin = start
      } else {
        endMin = Math.max(nowMin, start + 1)
      }

      if (endMin <= start) continue
      raw.push([start, endMin])
    }

    const merged = mergeMinuteIntervals(raw)

    hourCols.forEach((h, hi) => {
      const slotStart = h * 60
      const slotEnd = slotStart + 60
      const inHour: [number, number][] = []
      for (const [a, b] of merged) {
        const lo = Math.max(a, slotStart)
        const hi = Math.min(b, slotEnd)
        if (hi > lo) inHour.push([lo, hi])
      }
      const mergedHour = mergeMinuteIntervals(inHour)
      out[day]![hi] = mergedHour.map(([a, b]) => ({
        left: ((a - slotStart) / 60) * 100,
        width: ((b - a) / 60) * 100,
      }))
    })
  }

  return out
}

/** Read-only empty matrix aligned to default grid columns (7–17). */
export const EMPTY_DUTY_SEGMENTS: ScheduleDutySegments = (() => {
  const cols = scheduleHourColumns()
  const o = {} as ScheduleDutySegments
  for (const d of SCHEDULE_WEEKDAYS) {
    o[d] = emptySegmentsForCols(cols)
  }
  return o
})()
