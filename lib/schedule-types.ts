export const SCHEDULE_WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const

export type ScheduleWeekday = (typeof SCHEDULE_WEEKDAYS)[number]

export type DaySchedule = {
  open: string
  close: string
}

/** Stored under `hours` on the weekly document. */
export type WeeklyScheduleHours = Partial<Record<ScheduleWeekday, DaySchedule>>
