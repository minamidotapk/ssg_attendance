"use client"

import { DEFAULT_ATTENDANCE_LOG_WINDOW_DAYS } from "@/lib/attendance-log-constants"
import { AttendanceLogTable } from "@/app/ui/attendance-log/attendance-log-table"
import { AttendanceLogToolbar } from "@/app/ui/attendance-log/attendance-log-toolbar"
import { useAttendanceLogs } from "@/app/ui/attendance-log/use-attendance-logs"

export default function AttendanceLogScreen() {
  const {
    filterDate,
    setFilterDate,
    clearDateFilter,
    rows,
    loading,
    error,
    rangeHint,
  } = useAttendanceLogs()

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Attendance log</h1>
        <p className="mt-2 text-sm text-gray-600">
          Your clock-in and clock-out records with photos and GPS at each punch.
        </p>
      </header>

      <AttendanceLogToolbar
        filterDate={filterDate}
        onFilterDateChange={setFilterDate}
        onClearDate={clearDateFilter}
      />

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {rangeHint ? (
        <p className="text-sm text-gray-600" role="status">
          {rangeHint}
        </p>
      ) : null}

      <AttendanceLogTable
        rows={rows}
        loading={loading}
        filterDate={filterDate}
      />
    </div>
  )
}
