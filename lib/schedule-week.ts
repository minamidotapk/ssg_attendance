import type { ScheduleWeekday } from "@/lib/schedule-types"
import { SCHEDULE_WEEKDAYS } from "@/lib/schedule-types"

/** Align with server `ATTENDANCE_TIMEZONE` default. */
export const SCHEDULE_APP_TIMEZONE =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_ATTENDANCE_TIMEZONE?.trim()
    ? process.env.NEXT_PUBLIC_ATTENDANCE_TIMEZONE.trim()
    : "Asia/Manila"

function formatYmdInTz(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d)
}

function weekdayLongInTz(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
  }).format(d)
}

/**
 * Monday–Saturday calendar dates (YYYY-MM-DD) for the week that contains `now`,
 * using wall calendar in `timeZone`.
 */
export function getMondayToSaturdayYmdPack(timeZone: string, now = new Date()): {
  mondayYmd: string
  saturdayYmd: string
  from: string
  to: string
  ymdByWeekday: Record<ScheduleWeekday, string>
} {
  let mondayYmd = formatYmdInTz(now, timeZone)
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(now.getTime() - i * 86400000)
    if (weekdayLongInTz(d, timeZone) === "Monday") {
      mondayYmd = formatYmdInTz(d, timeZone)
      break
    }
  }

  const ymdByWeekday = {} as Record<ScheduleWeekday, string>
  const mondayNoon = new Date(`${mondayYmd}T12:00:00+08:00`)
  for (let i = 0; i < SCHEDULE_WEEKDAYS.length; i += 1) {
    const d = new Date(mondayNoon.getTime() + i * 86400000)
    ymdByWeekday[SCHEDULE_WEEKDAYS[i]!] = formatYmdInTz(d, timeZone)
  }

  const saturdayYmd = ymdByWeekday.Saturday
  return {
    mondayYmd,
    saturdayYmd,
    from: mondayYmd,
    to: saturdayYmd,
    ymdByWeekday,
  }
}

export function getTodayYmd(timeZone: string, now = new Date()): string {
  return formatYmdInTz(now, timeZone)
}
