import type { AttendanceLogRow } from "@/lib/attendance-log-client-cache"
import type { ScheduleWeekday } from "@/lib/schedule-types"
import { SCHEDULE_WEEKDAYS } from "@/lib/schedule-types"
import {
  SCHEDULE_GRID_HOUR_END,
  SCHEDULE_GRID_HOUR_START,
  getNowMinutesInTimezone,
  hourSlotOverlapsInterval,
  parseAttendanceTimeToMinutes,
} from "@/lib/schedule-grid"

/** Per-weekday set of hour columns (7–17) that overlap attendance duty. */
export type ScheduleDutySets = Record<ScheduleWeekday, Set<number>>

/**
 * For each weekday, which hour columns (7–17) overlap any clock-in→clock-out
 * segment for that calendar day (current week Mon–Sat).
 */
export function buildDutyHourSetByWeekday(
  rows: AttendanceLogRow[],
  ymdByWeekday: Record<ScheduleWeekday, string>,
  todayYmd: string,
  timeZone: string,
  now = new Date(),
): ScheduleDutySets {
  const nowMin = getNowMinutesInTimezone(timeZone, now)
  const out = {} as ScheduleDutySets
  for (const d of SCHEDULE_WEEKDAYS) {
    out[d] = new Set()
  }

  for (const day of SCHEDULE_WEEKDAYS) {
    const ymd = ymdByWeekday[day]
    const dayRows = rows.filter((r) => r.date === ymd && r.timeIn)
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

      for (let h = SCHEDULE_GRID_HOUR_START; h <= SCHEDULE_GRID_HOUR_END; h += 1) {
        if (hourSlotOverlapsInterval(h, start, endMin)) {
          out[day].add(h)
        }
      }
    }
  }

  return out
}

export function dutySetHasHour(
  sets: ScheduleDutySets,
  day: ScheduleWeekday,
  hour24: number,
): boolean {
  return sets[day]?.has(hour24) ?? false
}
