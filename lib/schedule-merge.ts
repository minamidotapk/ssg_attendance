import type { WeeklyScheduleHours } from "@/lib/schedule-types"
import { SCHEDULE_WEEKDAYS } from "@/lib/schedule-types"

/**
 * Effective hours for an account with a personal doc: each day uses personal
 * windows when that day has at least one valid window; otherwise the global
 * default for that day (so partial overrides in Mongo still inherit the rest).
 */
export function mergePersonalScheduleOverGlobal(
  globalHours: WeeklyScheduleHours,
  personalHours: WeeklyScheduleHours,
): WeeklyScheduleHours {
  const out: WeeklyScheduleHours = { ...globalHours }
  for (const day of SCHEDULE_WEEKDAYS) {
    const pw = personalHours[day]
    if (pw?.length) out[day] = pw
  }
  return out
}

export function personalScheduleHasAnyWindow(
  personalHours: WeeklyScheduleHours,
): boolean {
  return SCHEDULE_WEEKDAYS.some((d) => (personalHours[d]?.length ?? 0) > 0)
}
