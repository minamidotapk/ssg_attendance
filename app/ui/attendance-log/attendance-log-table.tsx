"use client"

import { useEffect, useMemo, useState } from "react"
import type { AttendanceLogRow } from "@/lib/attendance-log-client-cache"
import { formatLogDate } from "@/lib/attendance-log-display"
import {
  ADMIN_ATTENDANCE_LOG_GRID_TEMPLATE,
  ADMIN_ATTENDANCE_LOG_TABLE_COLUMNS,
  ATTENDANCE_LOG_GRID_TEMPLATE,
  ATTENDANCE_LOG_PAGE_SIZE,
  ATTENDANCE_LOG_TABLE_COLUMNS,
} from "@/app/ui/attendance-log/attendance-log-table.constants"
import { AttendanceLogTableRow } from "@/app/ui/attendance-log/attendance-log-table-row"

type AttendanceLogTableProps = {
  rows: AttendanceLogRow[]
  loading: boolean
  filterDate: string
  variant?: "student" | "admin"
}

export function AttendanceLogTable({
  rows,
  loading,
  filterDate,
  variant = "student",
}: AttendanceLogTableProps) {
  const [page, setPage] = useState(1)
  const isAdmin = variant === "admin"
  const gridTemplate = isAdmin
    ? ADMIN_ATTENDANCE_LOG_GRID_TEMPLATE
    : ATTENDANCE_LOG_GRID_TEMPLATE
  const columns = isAdmin
    ? ADMIN_ATTENDANCE_LOG_TABLE_COLUMNS
    : ATTENDANCE_LOG_TABLE_COLUMNS

  const totalPages = Math.max(1, Math.ceil(rows.length / ATTENDANCE_LOG_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const sliceStart = (currentPage - 1) * ATTENDANCE_LOG_PAGE_SIZE

  const pageRows = useMemo(
    () => rows.slice(sliceStart, sliceStart + ATTENDANCE_LOG_PAGE_SIZE),
    [rows, sliceStart],
  )

  useEffect(() => {
    setPage(1)
  }, [filterDate])

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages))
  }, [totalPages])

  const showPagination = !loading && rows.length > 0
  const fromN = rows.length === 0 ? 0 : sliceStart + 1
  const toN = sliceStart + pageRows.length

  const minWidthClass = isAdmin ? "min-w-[92rem]" : "min-w-[82rem]"

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <div
        className={`${minWidthClass} text-left text-sm`}
        role="table"
        aria-label={isAdmin ? "All users attendance" : "Attendance records"}
      >
        <div
          role="row"
          className="grid border-b border-cyan-700/20 bg-cyan-600/50"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          {columns.map((label) => (
            <div
              key={label}
              role="columnheader"
              className={`whitespace-nowrap py-3 font-semibold text-gray-900 ${
                label === "#" ? "px-2 text-center" : "px-4"
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        {loading ? (
          <div role="row" className="border-b border-gray-100">
            <div
              role="cell"
              className="px-4 py-8 text-center text-gray-500"
            >
              Loading…
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div role="row" className="border-b border-gray-100">
            <div
              role="cell"
              className="px-4 py-8 text-center text-gray-500"
            >
              No records
              {filterDate ? ` for ${formatLogDate(filterDate)}` : ""}.
            </div>
          </div>
        ) : (
          pageRows.map((row, i) => (
            <AttendanceLogTableRow
              key={row.sessionId}
              row={row}
              rowNumber={sliceStart + i + 1}
              variant={variant}
            />
          ))
        )}
      </div>

      {showPagination ? (
        <nav
          className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-gray-50/80 px-4 py-3 text-sm text-gray-700"
          aria-label="Attendance log pages"
        >
          <p className="tabular-nums text-gray-600">
            {fromN}–{toN} of {rows.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() =>
                setPage((p) => Math.max(1, Math.min(p, totalPages) - 1))
              }
              className="rounded-md bg-white px-3 py-1.5 font-medium text-gray-800 ring-1 ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Back
            </button>
            <span className="min-w-[7rem] text-center tabular-nums font-medium text-gray-900">
              Page {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() =>
                setPage((p) =>
                  Math.min(totalPages, Math.min(p, totalPages) + 1),
                )
              }
              className="rounded-md bg-white px-3 py-1.5 font-medium text-gray-800 ring-1 ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Forward
            </button>
          </div>
        </nav>
      ) : null}
    </div>
  )
}
