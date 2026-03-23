import type { ScheduleWeekday, WeeklyScheduleHours } from "@/lib/schedule-types"

export type DraftSeg = { id: string; open: string; close: string }

export type CalendarDraft = Partial<Record<ScheduleWeekday, DraftSeg[]>>

export type ListedUser = {
  firebaseUid: string
  email: string
  displayName?: string
  photoURL?: string
}

export type UserWithSchedule = {
  firebaseUid: string
  email: string
  hours: WeeklyScheduleHours
}
