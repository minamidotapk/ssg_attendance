import type { WeeklyScheduleHours } from "@/lib/schedule-types"

/** Singleton doc id for the published weekly grid (rows = days, shading from open/close). */
export const SCHEDULE_SETTINGS_COLLECTION = "schedule_settings"
export const SCHEDULE_WEEKLY_DOC_ID = "weekly_hours"

/** Per-user weekly overrides (`_id` = firebaseUid). */
export const USER_WEEKLY_SCHEDULES_COLLECTION = "user_weekly_schedules"

/** Stored in `schedule_settings` with a fixed string `_id` (not ObjectId). */
export type ScheduleSettingsDoc = {
  _id: string
  hours?: WeeklyScheduleHours
  updatedAt?: Date
  updatedByEmail?: string
}

export type UserWeeklyScheduleDoc = {
  _id: string
  firebaseUid: string
  email: string
  hours: WeeklyScheduleHours
  updatedAt: Date
  updatedByEmail?: string
}
