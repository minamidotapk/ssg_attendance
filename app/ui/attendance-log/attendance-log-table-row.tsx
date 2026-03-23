import type { AttendanceLogRow } from "@/lib/attendance-log-client-cache"
import {
  formatDutyHours,
  formatLogDate,
  formatLogTime,
} from "@/lib/attendance-log-display"
import {
  ADMIN_ATTENDANCE_LOG_GRID_TEMPLATE,
  ATTENDANCE_LOG_GRID_TEMPLATE,
} from "@/app/ui/attendance-log/attendance-log-table.constants"
import { LocationCell } from "@/app/ui/attendance-log/location-cell"
import { PhotoCell } from "@/app/ui/attendance-log/photo-cell"

type AttendanceLogTableRowProps = {
  row: AttendanceLogRow
  rowNumber: number
  variant?: "student" | "admin"
}

export function AttendanceLogTableRow({
  row,
  rowNumber,
  variant = "student",
}: AttendanceLogTableRowProps) {
  const isAdmin = variant === "admin"
  const gridTemplate = isAdmin
    ? ADMIN_ATTENDANCE_LOG_GRID_TEMPLATE
    : ATTENDANCE_LOG_GRID_TEMPLATE
  const isEven = rowNumber % 2 === 0
  return (
    <div
      role="row"
      className={`grid border-b border-gray-100 ${
        isEven
          ? "bg-cyan-600/20 hover:bg-cyan-600/30"
          : "bg-white hover:bg-gray-200/90"
      }`}
      style={{ gridTemplateColumns: gridTemplate }}
    >
      <div
        role="cell"
        className="flex items-center justify-center px-2 py-3 tabular-nums text-sm text-gray-500"
      >
        {rowNumber}
      </div>
      {isAdmin ? (
        <div
          role="cell"
          className="flex min-w-0 items-center truncate px-4 py-3 text-sm text-gray-900"
          title={row.userEmail ?? ""}
        >
          {row.userEmail?.trim() || "—"}
        </div>
      ) : null}
      <div
        role="cell"
        className="flex items-center whitespace-nowrap px-4 py-3 font-medium text-gray-900"
      >
        {formatLogDate(row.date)}
      </div>
      <div
        role="cell"
        className="flex items-center whitespace-nowrap px-4 py-3 text-gray-700"
      >
        {formatLogTime(row.timeIn)}
      </div>
      <div
        role="cell"
        className="flex items-center justify-center px-4 py-3"
      >
        <PhotoCell
          photoId={row.sessionId}
          side="in"
          dateYmd={row.date}
          timeRaw={row.timeIn}
          location={row.locationIn ?? null}
        />
      </div>
      <div
        role="cell"
        className="flex items-center px-4 py-3 text-gray-700"
      >
        <LocationCell loc={row.locationIn ?? null} />
      </div>
      <div
        role="cell"
        className="flex items-center whitespace-nowrap px-4 py-3 text-gray-700"
      >
        {formatLogTime(row.timeOut)}
      </div>
      <div
        role="cell"
        className="flex items-center justify-center px-4 py-3"
      >
        <PhotoCell
          photoId={row.timeOut ? row.sessionId : null}
          side="out"
          dateYmd={row.date}
          timeRaw={row.timeOut}
          location={row.locationOut ?? null}
        />
      </div>
      <div
        role="cell"
        className="flex items-center px-4 py-3 text-gray-700"
      >
        <LocationCell loc={row.locationOut ?? null} />
      </div>
      <div
        role="cell"
        className="flex items-center whitespace-nowrap px-4 py-3 tabular-nums text-gray-700"
      >
        {formatDutyHours(row.timeIn, row.timeOut)}
      </div>
    </div>
  )
}
