export const SCHEDULE_WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const

export type ScheduleWeekday = (typeof SCHEDULE_WEEKDAYS)[number]

/** One open→close window (HH:mm). */
export type DayScheduleWindow = {
  open: string
  close: string
}

/** @deprecated use DayScheduleWindow */
export type DaySchedule = DayScheduleWindow

/**
 * Per weekday: one or more time windows (e.g. Mon 11:00–12:00 and 15:30–16:40).
 * Stored in MongoDB / API JSON as arrays per day.
 */
export type WeeklyScheduleHours = Partial<
  Record<ScheduleWeekday, DayScheduleWindow[]>
>
