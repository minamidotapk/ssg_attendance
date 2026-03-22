"use client"

import { memo, useMemo } from "react"
import type { WeeklyScheduleHours } from "@/lib/schedule-types"
import { SCHEDULE_WEEKDAYS } from "@/lib/schedule-types"
import {
  formatScheduleHourLabel,
  hourCellIsWithinRange,
  scheduleHourColumns,
} from "@/lib/schedule-grid"
import { dutySetHasHour, type ScheduleDutySets } from "@/lib/schedule-duty"

type ScheduleWeeklyGridProps = {
  hours: WeeklyScheduleHours
  dutySets: ScheduleDutySets
}

/** Precompute cell flags once per props change (few rows/cols, but avoids work during scroll). */
function buildCellMatrix(
  hours: WeeklyScheduleHours,
  dutySets: ScheduleDutySets,
  cols: readonly number[],
) {
  return SCHEDULE_WEEKDAYS.map((day) =>
    cols.map((h) => ({
      scheduleShade: hourCellIsWithinRange(hours[day], h),
      dutyLine: dutySetHasHour(dutySets, day, h),
    })),
  )
}

function ScheduleWeeklyGridInner({ hours, dutySets }: ScheduleWeeklyGridProps) {
  const cols = scheduleHourColumns()
  const matrix = useMemo(
    () => buildCellMatrix(hours, dutySets, cols),
    [hours, dutySets, cols],
  )

  return (
    <div className="relative max-h-[min(68vh,480px)] overflow-auto rounded-lg border border-gray-200 [contain:content]">
      <table className="w-full min-w-[560px] border-collapse text-center text-[11px] sm:text-xs">
        <thead className="sticky top-0 z-30 bg-gray-100 shadow-[0_1px_0_0_rgb(229_231_235)]">
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-40 w-24 min-w-[5.5rem] border-b border-r border-gray-200 bg-gray-100 px-1.5 py-1.5 text-left text-[10px] font-semibold text-gray-700 sm:px-2 sm:py-2 sm:text-xs"
            >
              Day / Hour
            </th>
            {cols.map((h) => (
              <th
                key={h}
                scope="col"
                className="min-w-[2.25rem] border-b border-l border-gray-200 px-0.5 py-1.5 font-medium whitespace-nowrap text-gray-600 sm:min-w-[2.5rem] sm:px-1"
              >
                {formatScheduleHourLabel(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SCHEDULE_WEEKDAYS.map((day, di) => (
            <tr key={day}>
              <th
                scope="row"
                className="sticky left-0 z-20 border border-gray-200 bg-white px-1.5 py-1.5 text-left text-[11px] font-medium text-gray-800 sm:px-2 sm:text-sm"
              >
                {day}
              </th>
              {cols.map((h, hi) => {
                const cell = matrix[di]![hi]!
                return (
                  <td
                    key={`${day}-${h}`}
                    className={`relative h-8 overflow-hidden border border-gray-200 sm:h-9 ${
                      cell.scheduleShade ? "bg-cyan-600/20" : "bg-gray-50/90"
                    }`}
                    title={
                      cell.dutyLine
                        ? `${day}: on duty (attendance)`
                        : cell.scheduleShade
                          ? `${day}: published schedule`
                          : `${day}: outside published hours`
                    }
                  >
                    {cell.dutyLine ? (
                      <span
                        className="pointer-events-none absolute bottom-0.5 left-0.5 right-0.5 h-0.5 rounded-full bg-cyan-600"
                        aria-hidden
                      />
                    ) : null}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export const ScheduleWeeklyGrid = memo(ScheduleWeeklyGridInner)
