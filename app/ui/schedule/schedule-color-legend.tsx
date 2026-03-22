"use client"

/**
 * Legend: schedule window (fill) vs duty (accent line), matching grid styling.
 */
export function ScheduleColorLegend() {
  return (
    <div
      className="flex flex-wrap items-center gap-6 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700"
      role="group"
      aria-label="Schedule color key"
    >
      <div className="flex items-center gap-2">
        <span
          className="h-5 w-10 shrink-0 rounded border border-gray-200/80 bg-cyan-600/20"
          aria-hidden
        />
        <span>Time schedule</span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="flex h-5 w-10 shrink-0 items-center justify-center rounded border border-gray-200/80 bg-gray-50/90"
          aria-hidden
        >
          <span className="h-1 w-10 rounded-sm bg-cyan-600" />
        </span>
        <span>Time on duty</span>
      </div>
    </div>
  )
}
