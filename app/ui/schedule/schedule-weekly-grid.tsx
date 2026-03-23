"use client"

import { memo, useMemo } from "react"
import type { WeeklyScheduleHours } from "@/lib/schedule-types"
import { SCHEDULE_WEEKDAYS } from "@/lib/schedule-types"
import {
  formatScheduleHeaderCellLabel,
  scheduleHourColumns,
  scheduleShadeSegmentsInHour,
  type HourTimelineSegmentPercent,
} from "@/lib/schedule-grid"
import {
  EMPTY_DUTY_SEGMENTS,
  type DutySegmentInCell,
  type ScheduleDutySegments,
} from "@/lib/schedule-duty"

type CellModel = {
  scheduleSegments: HourTimelineSegmentPercent[]
  dutySegments: DutySegmentInCell[]
}

/** Precompute cell flags once per props change (few rows/cols, but avoids work during scroll). */
function buildCellMatrix(
  hours: WeeklyScheduleHours,
  dutySegments: ScheduleDutySegments,
  cols: readonly number[],
  showDutyLines: boolean,
): CellModel[][] {
  return SCHEDULE_WEEKDAYS.map((day) =>
    cols.map((h, hi) => ({
      scheduleSegments: scheduleShadeSegmentsInHour(hours[day], h),
      dutySegments:
        showDutyLines && dutySegments[day]?.[hi]?.length
          ? dutySegments[day]![hi]!
          : [],
    })),
  )
}

function scheduleTooltip(segs: HourTimelineSegmentPercent[]): string {
  if (segs.length === 0) return "Outside published hours"
  if (segs.length === 1 && segs[0]!.width >= 99.5) {
    return "Published schedule (full hour)"
  }
  return "Published schedule (partial hour)"
}

function dutyTooltip(segs: DutySegmentInCell[]): string {
  if (segs.length === 0) return ""
  if (segs.length === 1 && segs[0]!.width >= 99.5) {
    return "On duty (attendance, full hour)"
  }
  return "On duty (attendance)"
}

type ScheduleWeeklyGridProps = {
  hours: WeeklyScheduleHours
  /** Attendance intervals as horizontal bars positioned by minute within each hour column. */
  dutySegments?: ScheduleDutySegments
  /** When false, hide attendance duty overlay (e.g. admin calendar preview). */
  showDutyLines?: boolean
  /**
   * Optional per-user overlays (colored strike lines) used by admin calendar preview.
   * Each entry renders lines only where that user has schedule windows.
   */
  overlaySchedules?: ReadonlyArray<{ color: string; hours: WeeklyScheduleHours }>
}

function ScheduleWeeklyGridInner({
  hours,
  dutySegments = EMPTY_DUTY_SEGMENTS,
  showDutyLines = true,
  overlaySchedules = [],
}: ScheduleWeeklyGridProps) {
  const cols = scheduleHourColumns()
  const matrix = useMemo(
    () => buildCellMatrix(hours, dutySegments, cols, showDutyLines),
    [hours, dutySegments, cols, showDutyLines],
  )
  const overlayMatrix = useMemo(
    () =>
      SCHEDULE_WEEKDAYS.map((day) =>
        cols.map((h) =>
          overlaySchedules.flatMap((entry, idx) =>
            scheduleShadeSegmentsInHour(entry.hours[day], h).map((seg) => ({
              ...seg,
              color: entry.color,
              index: idx,
            })),
          ),
        ),
      ),
    [cols, overlaySchedules],
  )

  return (
    <div className="relative max-h-[min(68vh,480px)] overflow-auto rounded-lg border border-gray-200 [contain:content]">
      <table className="w-full min-w-[640px] border-collapse text-center text-[11px] sm:text-xs">
        <thead className="sticky top-0 z-30 bg-gray-100 shadow-[0_1px_0_0_rgb(229_231_235)]">
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-40 w-24 min-w-[5.5rem] border-b border-r border-gray-200 bg-gray-100 px-1.5 py-2 text-left text-[12px] font-semibold text-gray-700"
            >
              <span className="block pb-1.5 pt-1">Day / Hour</span>
            </th>
            {cols.map((h, i) => {
              const isLast = i === cols.length - 1
              return (
                <th
                  key={h}
                  scope="col"
                  aria-label={`${formatScheduleHeaderCellLabel(h, 0)}–${formatScheduleHeaderCellLabel(h + 1, 0)}`}
                  className={`relative min-w-[4.5rem] border-b border-l border-gray-200 bg-gray-100 px-0 py-2 font-normal sm:min-w-[5rem] ${
                    i === 0 ? "pl-1.5" : ""
                  } ${isLast ? "border-r border-gray-200 pr-1.5" : ""}`}
                >
                  <div className="relative min-h-[2.5rem]">
                    <span className="pointer-events-none absolute left-0 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[12px] font-medium tabular-nums tracking-tight text-gray-700">
                      {i === 0 ? "" : formatScheduleHeaderCellLabel(h, 0)}
                    </span>
                    <span className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[12px] tabular-nums text-gray-600">
                      {i === 0 ? "" : formatScheduleHeaderCellLabel(h, 30)}
                    </span>
                    {isLast ? (
                      <span className="pointer-events-none absolute right-0 top-1/2 z-10 translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[12px] font-medium tabular-nums tracking-tight text-gray-700">
                        {formatScheduleHeaderCellLabel(h + 1, 0)}
                      </span>
                    ) : null}
                  </div>
                </th>
              )
            })}
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
                const hasSchedule = cell.scheduleSegments.length > 0
                const hasDuty = cell.dutySegments.length > 0
                const tipParts: string[] = [`${day}`]
                if (hasSchedule) tipParts.push(scheduleTooltip(cell.scheduleSegments))
                if (hasDuty) tipParts.push(dutyTooltip(cell.dutySegments))
                if (!hasSchedule && !hasDuty) tipParts.push("outside published hours")
                return (
                  <td
                    key={`${day}-${h}`}
                    className="relative h-8 overflow-hidden border border-gray-200 bg-gray-50/90 sm:h-9"
                    title={tipParts.join(" · ")}
                  >
                    {cell.scheduleSegments.map((seg, i) => (
                      <div
                        key={`s-${i}`}
                        className="pointer-events-none absolute top-0.5 bottom-0.5 z-0 rounded-[1px] bg-cyan-600/25"
                        style={{
                          left: `${seg.left}%`,
                          width: `max(2px, ${seg.width}%)`,
                        }}
                        aria-hidden
                      />
                    ))}
                    {(overlayMatrix[di]?.[hi] ?? []).map((seg, oi, arr) => {
                      // Stack active overlays in this cell so identical schedules don't overlap.
                      const total = arr.length
                      const center = (total - 1) / 2
                      const offsetPx = (oi - center) * 3
                      return (
                        <div
                          key={`o-${oi}-${seg.index}`}
                          className="pointer-events-none absolute z-10 rounded-full"
                          style={{
                            left: `${seg.left}%`,
                            width: `max(8px, ${seg.width}%)`,
                            top: "50%",
                            height: "2px",
                            transform: `translateY(calc(-50% + ${offsetPx}px))`,
                            backgroundColor: seg.color,
                          }}
                          aria-hidden
                        />
                      )
                    })}
                    {cell.dutySegments.map((seg, i) => (
                      <div
                        key={`d-${i}`}
                        className="pointer-events-none absolute z-10 rounded-sm bg-cyan-700 ring-1 ring-violet-500/90"
                        style={{
                          left: `${seg.left}%`,
                          width: `max(12px, ${seg.width}%)`,
                          top: "50%",
                          height: "12px",
                          transform: "translateY(-50%)",
                        }}
                        aria-hidden
                      />
                    ))}
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
