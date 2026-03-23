import { SCHEDULE_WEEKDAYS, type WeeklyScheduleHours } from "@/lib/schedule-types"
import type { CalendarDraft, ListedUser } from "@/app/ui/calendar/types"

export function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function isValidHm(s: string) {
  return /^([01]?\d|2[0-3]):[0-5]\d$/.test(s.trim())
}

export function draftFromHours(hours: WeeklyScheduleHours): CalendarDraft {
  const draft: CalendarDraft = {}
  for (const day of SCHEDULE_WEEKDAYS) {
    const segs = hours[day]
    if (!segs?.length) continue
    draft[day] = segs.map((s) => ({ id: newId(), open: s.open, close: s.close }))
  }
  return draft
}

export function hoursFromDraft(draft: CalendarDraft): WeeklyScheduleHours {
  const out: WeeklyScheduleHours = {}
  for (const day of SCHEDULE_WEEKDAYS) {
    const segs = draft[day]
    if (!segs?.length) continue
    const windows: { open: string; close: string }[] = []
    for (const s of segs) {
      const open = s.open?.trim() ?? ""
      const close = s.close?.trim() ?? ""
      if (!open || !close || !isValidHm(open) || !isValidHm(close)) continue
      const [oh, om] = open.split(":").map(Number)
      const [ch, cm] = close.split(":").map(Number)
      const oMin = oh * 60 + om
      const cMin = ch * 60 + cm
      if (cMin <= oMin) continue
      windows.push({ open, close })
    }
    if (windows.length > 0) out[day] = windows
  }
  return out
}

export function orderedSelectedUsers(
  allUsers: ListedUser[],
  selectedUserIds: string[],
): ListedUser[] {
  return selectedUserIds
    .map((id) => allUsers.find((u) => u.firebaseUid === id))
    .filter((u): u is ListedUser => u != null)
}

export function userInitials(user: ListedUser): string {
  const name = user.displayName?.trim()
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }
  return user.email.slice(0, 2).toUpperCase()
}
