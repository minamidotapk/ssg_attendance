"use client"

import { useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useUiRole } from "@/app/context/ui-role-context"
import { ScheduleColorLegend } from "@/app/ui/schedule/schedule-color-legend"
import { ScheduleWeeklyGrid } from "@/app/ui/schedule/schedule-weekly-grid"
import {
  SCHEDULE_GRID_HOUR_END_BOUNDARY,
  SCHEDULE_GRID_HOUR_START,
  formatScheduleHourLabel,
} from "@/lib/schedule-grid"
import { SCHEDULE_WEEKDAYS, type ScheduleWeekday } from "@/lib/schedule-types"
import { hoursFromDraft, orderedSelectedUsers } from "@/app/ui/calendar/draft-utils"
import { ScheduleUserPicker } from "@/app/ui/calendar/schedule-user-picker"
import { useCalendarAdmin } from "@/app/ui/calendar/use-calendar-admin"

const CALENDAR_PREVIEW_COLORS = [
  "#0ea5e9",
  "#8b5cf6",
  "#f97316",
  "#10b981",
  "#ef4444",
  "#6366f1",
  "#14b8a6",
  "#ec4899",
  "#84cc16",
  "#f59e0b",
  "#06b6d4",
  "#a855f7",
  "#22c55e",
  "#f43f5e",
  "#3b82f6",
  "#eab308",
  "#4f46e5",
  "#16a34a",
  "#db2777",
  "#f97316",
] as const

export default function CalendarScreen() {
  const router = useRouter()
  const { isAdmin, isRoleLoading } = useUiRole()
  const {
    appliesGlobal,
    setAppliesGlobal,
    selectedUserIds,
    setSelectedUserIds,
    users,
    usersWithSchedules,
    draft,
    dayToAdd,
    setDayToAdd,
    loading,
    saving,
    error,
    savedMsg,
    setSavedMsg,
    activeDays,
    availableDays,
    loadSchedule,
    addSegment,
    removeSegment,
    updateSegment,
    clearDay,
    addDay,
    saveSchedule,
    removeUserOverride,
  } = useCalendarAdmin(isAdmin, isRoleLoading)

  useEffect(() => {
    if (isRoleLoading) return
    if (!isAdmin) {
      router.replace("/ui/schedule")
    }
  }, [isAdmin, isRoleLoading, router])

  const rangeLabel = `${formatScheduleHourLabel(SCHEDULE_GRID_HOUR_START)}–${formatScheduleHourLabel(SCHEDULE_GRID_HOUR_END_BOUNDARY)}`
  const previewHours = hoursFromDraft(draft)
  const userByUid = useMemo(
    () => new Map(users.map((u) => [u.firebaseUid, u] as const)),
    [users],
  )
  const previewLegendEntries = useMemo(
    () =>
      usersWithSchedules.map((u, i) => {
        const listed = userByUid.get(u.firebaseUid)
        return {
          key: u.firebaseUid,
          label: listed?.displayName?.trim() || listed?.email || u.email || u.firebaseUid,
          color: CALENDAR_PREVIEW_COLORS[i % CALENDAR_PREVIEW_COLORS.length]!,
          hours: u.hours,
        }
      }),
    [userByUid, usersWithSchedules],
  )
  const previewOverlaySchedules = useMemo(
    () =>
      previewLegendEntries.map((entry) => ({
        color: entry.color,
        hours: entry.hours,
      })),
    [previewLegendEntries],
  )

  if (isRoleLoading || !isAdmin) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        {isRoleLoading ? "Loading…" : "Redirecting…"}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
      </header>

      <ScheduleColorLegend />

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {savedMsg ? (
        <p className="text-sm text-cyan-800" role="status">
          {savedMsg}
        </p>
      ) : null}

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <span className="block text-sm font-semibold text-gray-900">
          Schedule assignment
        </span>
        <div className="mt-3 space-y-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
            <input
              type="radio"
              name="applies-to"
              className="h-4 w-4 border-gray-300 text-cyan-600"
              checked={appliesGlobal}
              onChange={() => {
                setAppliesGlobal(true)
                setSavedMsg(null)
              }}
            />
            Everyone (default schedule)
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
            <input
              type="radio"
              name="applies-to"
              className="h-4 w-4 border-gray-300 text-cyan-600"
              checked={!appliesGlobal}
              onChange={() => {
                setAppliesGlobal(false)
                setSavedMsg(null)
              }}
            />
            Specific users — personal calendar
          </label>
        </div>
        {!appliesGlobal ? (
          <div className="mt-4 border-t border-gray-100 pt-4">
            {users.length === 0 ? (
              <p className="text-sm text-gray-500">No users loaded yet.</p>
            ) : (
              <ScheduleUserPicker
                users={users}
                selectedUserIds={selectedUserIds}
                onSelectedChange={(ids) => {
                  setSelectedUserIds(ids)
                  setSavedMsg(null)
                }}
              />
            )}
            <p className="mt-3 text-xs text-gray-500">
              Type to search, then pick a user to add a chip. Remove with ✕. Save applies the same
              hours to every chip.
              {selectedUserIds.length > 1 ? (
                <>
                  {" "}
                  Reload loads the first chip (
                  {orderedSelectedUsers(users, selectedUserIds)[0]?.email ?? "—"}).
                </>
              ) : null}
            </p>
          </div>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-gray-600">Loading…</p>
      ) : (
        <>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Edit weekly hours</h2>
            <div className="mb-4 flex flex-wrap items-end gap-2 rounded-md border border-gray-100 bg-gray-50/70 p-3">
              <label className="flex min-w-[12rem] flex-col gap-1 text-xs text-gray-600">
                Add day
                <select
                  value={dayToAdd}
                  onChange={(e) => setDayToAdd(e.target.value as ScheduleWeekday)}
                  disabled={availableDays.length === 0}
                  className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                >
                  {availableDays.length === 0 ? (
                    <option value="">All days already added</option>
                  ) : (
                    availableDays.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <button
                type="button"
                onClick={() => addDay(dayToAdd)}
                disabled={availableDays.length === 0}
                className="rounded-md bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-cyan-400"
              >
                Add day
              </button>
            </div>
            <ul className="space-y-6">
              {activeDays.length === 0 ? (
                <li className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                  No day selected yet. Choose a weekday above, then click Add day.
                </li>
              ) : null}
              {activeDays.map((day) => {
                const segs = draft[day] ?? []
                return (
                  <li
                    key={day}
                    className="border-b border-gray-100 pb-6 last:border-0 last:pb-0"
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-800">{day}</span>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => addSegment(day)}
                          className="rounded-md bg-cyan-600/15 px-3 py-1.5 text-sm font-medium text-cyan-900 hover:bg-cyan-600/25"
                        >
                          Add time window
                        </button>
                        <button
                          type="button"
                          onClick={() => clearDay(day)}
                          className="rounded-md px-3 py-1.5 text-sm text-red-700 ring-1 ring-red-200 hover:bg-red-50"
                        >
                          Clear day
                        </button>
                      </div>
                    </div>
                    {segs.length === 0 ? (
                      <p className="text-sm text-gray-500">No windows — day stays unshaded.</p>
                    ) : (
                      <ul className="space-y-3">
                        {segs.map((s, idx) => (
                          <li
                            key={s.id}
                            className="flex flex-wrap items-end gap-3 rounded-md bg-gray-50/80 p-3"
                          >
                            <span className="text-xs font-medium text-gray-500">
                              Window {idx + 1}
                            </span>
                            <label className="flex flex-col gap-1 text-xs text-gray-600">
                              Open
                              <input
                                type="time"
                                step={60}
                                value={s.open}
                                onChange={(e) =>
                                  updateSegment(day, s.id, "open", e.target.value)
                                }
                                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-xs text-gray-600">
                              Close
                              <input
                                type="time"
                                step={60}
                                value={s.close}
                                onChange={(e) =>
                                  updateSegment(day, s.id, "close", e.target.value)
                                }
                                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => removeSegment(day, s.id)}
                              className="rounded-md px-2 py-1.5 text-xs text-red-700 hover:bg-red-50"
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void saveSchedule()}
                disabled={
                  saving || (!appliesGlobal && selectedUserIds.length === 0)
                }
                className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-cyan-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => void loadSchedule()}
                disabled={saving || loading}
                className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-800 ring-1 ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
              >
                Reload
              </button>
              {!appliesGlobal && selectedUserIds.length > 0 ? (
                <button
                  type="button"
                  onClick={() => void removeUserOverride()}
                  disabled={saving}
                  className="rounded-md bg-white px-4 py-2 text-sm font-medium text-red-800 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-50"
                >
                  {selectedUserIds.length === 1
                    ? "Remove personal calendar (use default)"
                    : `Remove personal calendars (${selectedUserIds.length} users)`}
                </button>
              ) : null}
            </div>
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-gray-200 bg-white p-3">
              {previewLegendEntries.length === 0 ? (
                <span className="text-sm text-gray-500">
                  No personal schedules found yet.
                </span>
              ) : (
                previewLegendEntries.map((entry) => (
                  <span
                    key={entry.key}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700"
                    title={entry.label}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: entry.color }}
                      aria-hidden
                    />
                    <span className="max-w-[14rem] truncate">{entry.label}</span>
                  </span>
                ))
              )}
            </div>
            <ScheduleWeeklyGrid
              hours={previewHours}
              showDutyLines={false}
              overlaySchedules={previewOverlaySchedules}
            />
          </div>
        </>
      )}
    </div>
  )
}
