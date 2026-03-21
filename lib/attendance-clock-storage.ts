/** Persists “clocked in” across routes until OUT (per signed-in uid). */
export const ATTENDANCE_CLOCKED_IN_STORAGE_KEY = "ssg_attendance_clocked_in_uid"

export function getStoredClockedInUid(): string | null {
  if (typeof sessionStorage === "undefined") return null
  try {
    return sessionStorage.getItem(ATTENDANCE_CLOCKED_IN_STORAGE_KEY)
  } catch {
    return null
  }
}

export function isUserClockedInStorage(uid: string): boolean {
  return getStoredClockedInUid() === uid
}

export function persistClockedInUid(uid: string): void {
  try {
    sessionStorage.setItem(ATTENDANCE_CLOCKED_IN_STORAGE_KEY, uid)
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearClockedInStorage(): void {
  try {
    sessionStorage.removeItem(ATTENDANCE_CLOCKED_IN_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
