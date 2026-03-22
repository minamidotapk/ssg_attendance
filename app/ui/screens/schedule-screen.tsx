"use client"

import { ScheduleColorLegend } from "@/app/ui/schedule/schedule-color-legend"
import { ScheduleWeeklyGrid } from "@/app/ui/schedule/schedule-weekly-grid"
import { useSchedulePageData } from "@/app/ui/schedule/use-schedule-page-data"
import { useRedirectAdminFromStudentRoutes } from "@/app/ui/use-redirect-admin-from-student-routes"
import {
  SCHEDULE_GRID_HOUR_END,
  SCHEDULE_GRID_HOUR_START,
  formatScheduleHourLabel,
} from "@/lib/schedule-grid"

export default function ScheduleScreen() {
  const { showSpinner } = useRedirectAdminFromStudentRoutes()
  const { hours, dutySets, initialLoading, error } = useSchedulePageData()

  if (showSpinner) {
    return (
      <div
        className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500"
        aria-busy="true"
      >
        Redirecting…
      </div>
    )
  }

  const rangeLabel = `${formatScheduleHourLabel(SCHEDULE_GRID_HOUR_START)}–${formatScheduleHourLabel(SCHEDULE_GRID_HOUR_END)}`

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
        <p className="mt-2 text-sm text-gray-600">
          Academic year <span className="font-medium text-gray-800">2025–2026</span>.
          Grid covers {rangeLabel}. Cyan fill = published schedule; solid line = your attendance
          (Mon–Sat, this week).
        </p>
      </header>

      <ScheduleColorLegend />

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {initialLoading ? (
        <div
          className="flex min-h-[min(45vh,280px)] flex-col items-center justify-center rounded-xl bg-gray-100 py-12"
          aria-busy="true"
          aria-label="Loading schedule"
        >
          <p className="text-sm text-gray-600">Loading schedule…</p>
        </div>
      ) : (
        <ScheduleWeeklyGrid hours={hours ?? {}} dutySets={dutySets} />
      )}

      <p className="text-xs text-gray-500">
        Cached on this device for faster return visits. New punches update the duty line in real
        time. Schedule shading is set by your admin.
      </p>
    </div>
  )
}
