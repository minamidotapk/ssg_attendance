/**
 * Inline grid template — Tailwind cannot see dynamic arbitrary values for this.
 * First column is row # (paginated).
 */
export const ATTENDANCE_LOG_GRID_TEMPLATE =
  "minmax(2.75rem, 0.45fr) minmax(6rem, 1fr) minmax(4.25rem, 0.7fr) minmax(6.5rem, 1.7fr) minmax(5.5rem, 1fr) minmax(4.25rem, 0.7fr) minmax(6.5rem, 1.7fr) minmax(5.5rem, 1fr) minmax(4.5rem, 0.65fr)"

/** Admin: #, User email, then same as student columns. */
export const ADMIN_ATTENDANCE_LOG_GRID_TEMPLATE =
  "minmax(2.75rem, 0.45fr) minmax(10rem, 1.15fr) minmax(6rem, 1fr) minmax(4.25rem, 0.7fr) minmax(6.5rem, 1.7fr) minmax(5.5rem, 1fr) minmax(4.25rem, 0.7fr) minmax(6.5rem, 1.7fr) minmax(5.5rem, 1fr) minmax(4.5rem, 0.65fr)"

/** Data rows shown per page (pagination). */
export const ATTENDANCE_LOG_PAGE_SIZE = 5

export const ATTENDANCE_LOG_TABLE_COLUMNS = [
  "#",
  "Date",
  "Time IN",
  "Picture of Time IN",
  "Location IN",
  "Time OUT",
  "Picture of Time OUT",
  "Location OUT",
  "Duty hours",
] as const

export const ADMIN_ATTENDANCE_LOG_TABLE_COLUMNS = [
  "#",
  "User",
  "Date",
  "Time IN",
  "Picture of Time IN",
  "Location IN",
  "Time OUT",
  "Picture of Time OUT",
  "Location OUT",
  "Duty hours",
] as const
