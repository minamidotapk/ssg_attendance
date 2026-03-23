"use client"

/**
 * Legend: schedule (light horizontal band by minute in hour) vs duty (12px bar + ring).
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
          className="relative h-5 w-10 shrink-0 overflow-hidden rounded border border-gray-200/80 bg-gray-50/90"
          aria-hidden
        >
          <span className="absolute inset-y-0.5 left-[20%] w-[45%] rounded-[1px] bg-cyan-600/25" />
        </span>
        <span>Time schedule</span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="relative h-5 w-10 shrink-0 overflow-hidden rounded border border-gray-200/80 bg-gray-50/90"
          aria-hidden
        >
          <span className="absolute top-1/2 left-[30%] h-1.5 w-[28%] min-w-[10px] -translate-y-1/2 rounded-sm bg-cyan-700 ring-1 ring-violet-500/90" />
        </span>
        <span>Time on duty</span>
      </div>
    </div>
  )
}
