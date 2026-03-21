import { DEFAULT_ATTENDANCE_LOG_WINDOW_DAYS } from "@/lib/attendance-log-constants"

type AttendanceLogToolbarProps = {
  filterDate: string
  onFilterDateChange: (value: string) => void
  onClearDate: () => void
}

export function AttendanceLogToolbar({
  filterDate,
  onFilterDateChange,
  onClearDate,
}: AttendanceLogToolbarProps) {
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border border-gray-200 bg-gray-50/80 p-4">
      <div className="flex flex-col gap-1">
        <label
          htmlFor="attendance-log-date"
          className="text-xs font-medium uppercase tracking-wide text-gray-500"
        >
          Filter by date
        </label>
        <input
          id="attendance-log-date"
          type="date"
          value={filterDate}
          onChange={(e) => onFilterDateChange(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
        />
      </div>
      <button
        type="button"
        onClick={onClearDate}
        className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-800 ring-1 ring-gray-300 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600"
      >
        Last {DEFAULT_ATTENDANCE_LOG_WINDOW_DAYS} days
      </button>
    </div>
  )
}
