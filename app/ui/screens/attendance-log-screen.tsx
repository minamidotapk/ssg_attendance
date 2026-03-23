"use client"

import { AttendanceLogTable } from "@/app/ui/attendance-log/attendance-log-table"
import { AttendanceLogToolbar } from "@/app/ui/attendance-log/attendance-log-toolbar"
import { useAdminAttendanceLogs } from "@/app/ui/attendance-log/use-admin-attendance-logs"
import { useAttendanceLogs } from "@/app/ui/attendance-log/use-attendance-logs"
import { useUiRole } from "@/app/context/ui-role-context"

export default function AttendanceLogScreen() {
  const { isAdmin, isRoleLoading } = useUiRole()
  const student = useAttendanceLogs({
    enabled: !isRoleLoading && !isAdmin,
  })
  const admin = useAdminAttendanceLogs(!isRoleLoading && isAdmin)

  const pack = isAdmin ? admin : student

  if (isRoleLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        Loading…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Attendance log</h1>
      </header>

      <AttendanceLogToolbar
        filterDate={pack.filterDate}
        onFilterDateChange={pack.setFilterDate}
        onClearDate={pack.clearDateFilter}
      />

      {pack.error ? (
        <p className="text-sm text-red-600" role="alert">
          {pack.error}
        </p>
      ) : null}

      {pack.rangeHint ? (
        <p className="text-sm text-gray-600" role="status">
          {pack.rangeHint}
        </p>
      ) : null}

      <AttendanceLogTable
        rows={pack.rows}
        loading={pack.loading}
        filterDate={pack.filterDate}
        variant={isAdmin ? "admin" : "student"}
      />
    </div>
  )
}
