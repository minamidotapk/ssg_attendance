"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useRouter } from "next/navigation"
import { auth } from "@/firebase.config"
import { useUiRole } from "@/app/context/ui-role-context"
import { ScheduleColorLegend } from "@/app/ui/schedule/schedule-color-legend"
import { ScheduleWeeklyGrid } from "@/app/ui/schedule/schedule-weekly-grid"
import {
  SCHEDULE_GRID_HOUR_END_BOUNDARY,
  SCHEDULE_GRID_HOUR_START,
  formatScheduleHourLabel,
} from "@/lib/schedule-grid"
import type { ScheduleWeekday, WeeklyScheduleHours } from "@/lib/schedule-types"
import { SCHEDULE_WEEKDAYS } from "@/lib/schedule-types"

type DraftSeg = { id: string; open: string; close: string }

function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function draftFromHours(h: WeeklyScheduleHours): Partial<Record<ScheduleWeekday, DraftSeg[]>> {
  const d: Partial<Record<ScheduleWeekday, DraftSeg[]>> = {}
  for (const day of SCHEDULE_WEEKDAYS) {
    const segs = h[day]
    if (!segs?.length) continue
    d[day] = segs.map((s) => ({
      id: newId(),
      open: s.open,
      close: s.close,
    }))
  }
  return d
}

function isValidHm(s: string) {
  return /^([01]?\d|2[0-3]):[0-5]\d$/.test(s.trim())
}

function hoursFromDraft(
  draft: Partial<Record<ScheduleWeekday, DraftSeg[]>>,
): WeeklyScheduleHours {
  const out: WeeklyScheduleHours = {}
  for (const day of SCHEDULE_WEEKDAYS) {
    const segs = draft[day]
    if (!segs?.length) continue
    const windows: { open: string; close: string }[] = []
    for (const s of segs) {
      const open = s.open?.trim() ?? ""
      const close = s.close?.trim() ?? ""
      if (!open || !close) continue
      if (!isValidHm(open) || !isValidHm(close)) continue
      const [oh, om] = open.split(":").map(Number)
      const [ch, cm] = close.split(":").map(Number)
      const oMin = oh * 60 + om
      const cMin = ch * 60 + cm
      if (cMin <= oMin) continue
      windows.push({ open, close })
    }
    if (windows.length > 0) out[day] = windows
  }
  return out
}

type ListedUser = {
  firebaseUid: string
  email: string
  displayName?: string
  photoURL?: string
}

function orderedSelectedUsers(
  allUsers: ListedUser[],
  selectedUserIds: string[],
): ListedUser[] {
  return selectedUserIds
    .map((id) => allUsers.find((u) => u.firebaseUid === id))
    .filter((u): u is ListedUser => u != null)
}

function userInitials(u: ListedUser): string {
  const n = u.displayName?.trim()
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return (
        parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)
      ).toUpperCase()
    }
    return n.slice(0, 2).toUpperCase()
  }
  return u.email.slice(0, 2).toUpperCase()
}

function UserAvatar({ user, className }: { user: ListedUser; className?: string }) {
  const url = user.photoURL?.trim()
  const size = className ?? "h-6 w-6"
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className={`shrink-0 rounded-full object-cover ${size}`}
        width={24}
        height={24}
        referrerPolicy="no-referrer"
      />
    )
  }
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-gray-200 text-[10px] font-semibold text-gray-600 ${size}`}
      aria-hidden
    >
      {userInitials(user)}
    </span>
  )
}

function ScheduleUserPicker({
  users,
  selectedUserIds,
  onSelectedChange,
}: {
  users: ListedUser[]
  selectedUserIds: string[]
  onSelectedChange: (ids: string[]) => void
}) {
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedSet = useMemo(() => new Set(selectedUserIds), [selectedUserIds])

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users
      .filter((u) => {
        if (selectedSet.has(u.firebaseUid)) return false
        if (!q) return true
        const email = u.email.toLowerCase()
        const name = (u.displayName ?? "").toLowerCase()
        return email.includes(q) || name.includes(q)
      })
      .slice(0, 25)
  }, [users, selectedSet, search])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  const pick = (uid: string) => {
    if (selectedUserIds.includes(uid)) return
    onSelectedChange([...selectedUserIds, uid])
    setSearch("")
    inputRef.current?.focus()
  }

  const remove = (uid: string) => {
    onSelectedChange(selectedUserIds.filter((id) => id !== uid))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="text-xs font-medium text-cyan-800 underline decoration-cyan-600/40 hover:decoration-cyan-700"
          onClick={() => onSelectedChange(users.map((u) => u.firebaseUid))}
        >
          Select all
        </button>
        <button
          type="button"
          className="text-xs font-medium text-gray-600 underline decoration-gray-400 hover:decoration-gray-700"
          onClick={() => onSelectedChange([])}
        >
          Clear selection
        </button>
      </div>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
        <span className="shrink-0 pt-2 text-sm font-medium text-gray-800 sm:w-28">
          Select user
        </span>
        <div ref={wrapRef} className="relative min-w-0 flex-1">
          <div
            className="flex min-h-[42px] cursor-text flex-wrap items-center gap-1.5 rounded-md border border-gray-400 bg-white px-2 py-1.5 shadow-sm focus-within:border-cyan-600 focus-within:ring-1 focus-within:ring-cyan-600"
            onClick={() => inputRef.current?.focus()}
            role="group"
            aria-label="Search and select users"
          >
            {selectedUserIds.map((id) => {
              const u = users.find((x) => x.firebaseUid === id)
              if (!u) return null
              return (
                <span
                  key={id}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-gray-400 bg-white py-0.5 pl-1 pr-0.5 shadow-sm"
                >
                  <UserAvatar user={u} />
                  <span className="flex min-w-0 flex-col text-left leading-tight">
                    <span className="max-w-[220px] truncate text-xs font-medium text-gray-900 sm:max-w-[280px]">
                      {u.displayName?.trim() ? u.displayName.trim() : u.email}
                    </span>
                    {u.displayName?.trim() ? (
                      <span className="max-w-[220px] truncate text-[11px] text-gray-500 sm:max-w-[280px]">
                        {u.email}
                      </span>
                    ) : null}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 rounded-full p-0.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                    aria-label={`Remove ${u.email}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      remove(id)
                    }}
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </span>
              )
            })}
            <input
              ref={inputRef}
              type="text"
              className="min-w-[10rem] flex-1 border-0 bg-transparent py-1 text-sm text-gray-900 outline-none placeholder:text-gray-400"
              placeholder={
                selectedUserIds.length ? "Add another…" : "Search by name or email…"
              }
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={(e) => {
                if (
                  e.key === "Backspace" &&
                  search === "" &&
                  selectedUserIds.length > 0
                ) {
                  e.preventDefault()
                  onSelectedChange(selectedUserIds.slice(0, -1))
                }
                if (e.key === "Escape") setOpen(false)
              }}
            />
          </div>
          {open && suggestions.length > 0 ? (
            <ul
              className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
              role="listbox"
            >
              {suggestions.map((u) => (
                <li key={u.firebaseUid} role="presentation">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                    role="option"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(u.firebaseUid)}
                  >
                    <UserAvatar user={u} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-gray-900">
                        {u.displayName?.trim() || u.email}
                      </span>
                      {u.displayName?.trim() ? (
                        <span className="block truncate text-xs text-gray-500">
                          {u.email}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {open && search.trim() && suggestions.length === 0 ? (
            <p className="absolute left-0 right-0 top-full z-20 mt-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 shadow-lg">
              No matches.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default function CalendarScreen() {
  const router = useRouter()
  const { isAdmin, isRoleLoading } = useUiRole()
  const [appliesGlobal, setAppliesGlobal] = useState(true)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [users, setUsers] = useState<ListedUser[]>([])
  const [draft, setDraft] = useState<Partial<Record<ScheduleWeekday, DraftSeg[]>>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  useEffect(() => {
    if (isRoleLoading) return
    if (!isAdmin) {
      router.replace("/ui/schedule")
    }
  }, [isAdmin, isRoleLoading, router])

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return
    try {
      const user = auth.currentUser
      if (!user) return
      const token = await user.getIdToken()
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = (await res.json().catch(() => ({}))) as {
        users?: ListedUser[]
      }
      if (res.ok && Array.isArray(data.users)) {
        setUsers(data.users)
      }
    } catch {
      /* ignore */
    }
  }, [isAdmin])

  useEffect(() => {
    if (!isRoleLoading && isAdmin) void loadUsers()
  }, [isAdmin, isRoleLoading, loadUsers])

  const load = useCallback(async () => {
    if (!isAdmin) return
    setError(null)
    setLoading(true)
    setSavedMsg(null)
    try {
      const user = auth.currentUser
      if (!user) {
        setError("Sign in required.")
        setDraft({})
        return
      }
      const token = await user.getIdToken()

      let url = "/api/admin/schedule?scope=global"
      if (!appliesGlobal) {
        if (selectedUserIds.length === 0) {
          setDraft({})
          return
        }
        const primary = selectedUserIds[0] ?? ""
        if (!primary) {
          setDraft({})
          return
        }
        url = `/api/admin/schedule?scope=user&firebaseUid=${encodeURIComponent(primary)}`
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = (await res.json().catch(() => ({}))) as {
        hours?: WeeklyScheduleHours
        error?: string
      }
      if (!res.ok) {
        setError(data.error ?? "Could not load schedule.")
        setDraft({})
        return
      }
      setDraft(draftFromHours(data.hours ?? {}))
    } catch {
      setError("Could not load schedule.")
      setDraft({})
    } finally {
      setLoading(false)
    }
  }, [appliesGlobal, isAdmin, selectedUserIds, users])

  useEffect(() => {
    if (!isRoleLoading && isAdmin) void load()
  }, [isAdmin, isRoleLoading, load])

  const addSegment = useCallback((day: ScheduleWeekday) => {
    setDraft((prev) => ({
      ...prev,
      [day]: [...(prev[day] ?? []), { id: newId(), open: "", close: "" }],
    }))
    setSavedMsg(null)
  }, [])

  const removeSegment = useCallback((day: ScheduleWeekday, id: string) => {
    setDraft((prev) => {
      const list = (prev[day] ?? []).filter((s) => s.id !== id)
      const next = { ...prev }
      if (list.length === 0) delete next[day]
      else next[day] = list
      return next
    })
    setSavedMsg(null)
  }, [])

  const updateSegment = useCallback(
    (day: ScheduleWeekday, id: string, field: "open" | "close", value: string) => {
      setDraft((prev) => ({
        ...prev,
        [day]: (prev[day] ?? []).map((s) =>
          s.id === id ? { ...s, [field]: value } : s,
        ),
      }))
      setSavedMsg(null)
    },
    [],
  )

  const clearDay = useCallback((day: ScheduleWeekday) => {
    setDraft((prev) => {
      const next = { ...prev }
      delete next[day]
      return next
    })
    setSavedMsg(null)
  }, [])

  const save = useCallback(async () => {
    const hours = hoursFromDraft(draft)
    setSaving(true)
    setError(null)
    setSavedMsg(null)
    try {
      const user = auth.currentUser
      if (!user) {
        setError("Sign in required.")
        return
      }
      const token = await user.getIdToken()
      if (!appliesGlobal && selectedUserIds.length === 0) {
        setError("Select at least one user, or choose everyone (default).")
        return
      }

      const selectedListed = orderedSelectedUsers(users, selectedUserIds)
      const body = appliesGlobal
        ? { target: "global" as const, hours }
        : {
            target: {
              users: selectedListed.map((u) => ({
                firebaseUid: u.firebaseUid,
                email: u.email,
              })),
            },
            hours,
          }
      const res = await fetch("/api/admin/schedule", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        ok?: boolean
        hours?: WeeklyScheduleHours
        count?: number
        users?: { email?: string }[]
      }
      if (!res.ok) {
        setError(data.error ?? "Save failed.")
        return
      }
      setDraft(draftFromHours(data.hours ?? hours))
      if (appliesGlobal) {
        setSavedMsg(
          "Saved default schedule for everyone without a personal calendar.",
        )
      } else if (selectedListed.length === 1) {
        setSavedMsg(
          `Saved personal schedule for ${selectedListed[0]!.email}.`,
        )
      } else {
        setSavedMsg(
          `Saved the same personal schedule for ${data.count ?? selectedListed.length} users.`,
        )
      }
    } catch {
      setError("Save failed.")
    } finally {
      setSaving(false)
    }
  }, [appliesGlobal, draft, selectedUserIds, users])

  const removeUserOverride = useCallback(async () => {
    if (appliesGlobal || selectedUserIds.length === 0) return
    const selectedListed = orderedSelectedUsers(users, selectedUserIds)
    if (selectedListed.length === 0) return
    setSaving(true)
    setError(null)
    setSavedMsg(null)
    try {
      const user = auth.currentUser
      if (!user) return
      const token = await user.getIdToken()
      const q = selectedListed.map((u) => u.firebaseUid).join(",")
      const res = await fetch(
        `/api/admin/schedule?firebaseUids=${encodeURIComponent(q)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setError(data.error ?? "Could not remove override.")
        return
      }
      setDraft({})
      if (selectedListed.length === 1) {
        setSavedMsg(
          `${selectedListed[0]!.email} will use the default schedule again.`,
        )
      } else {
        setSavedMsg(
          `${selectedListed.length} users will use the default schedule again.`,
        )
      }
    } catch {
      setError("Could not remove override.")
    } finally {
      setSaving(false)
    }
  }, [appliesGlobal, selectedUserIds, users])

  if (isRoleLoading || !isAdmin) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        {isRoleLoading ? "Loading…" : "Redirecting…"}
      </div>
    )
  }

  const rangeLabel = `${formatScheduleHourLabel(SCHEDULE_GRID_HOUR_START)}–${formatScheduleHourLabel(SCHEDULE_GRID_HOUR_END_BOUNDARY)}`
  const previewHours = hoursFromDraft(draft)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <p className="mt-2 text-sm text-gray-600">
          Choose <span className="font-medium">everyone (default)</span> or{" "}
          <span className="font-medium">one or more users</span> — the same weekly hours are
          saved to every account you add. The editor loads the{" "}
          <span className="font-medium">first chip’s</span> saved hours (left to right).
          Each weekday can have <span className="font-medium">several time windows</span>.
          Students without a personal calendar use the default ({rangeLabel} grid).
        </p>
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
        <p className="mt-1 text-xs text-gray-500">
          Default applies to everyone without a personal calendar. Choose specific users to set
          or overwrite their personal weekly hours.
        </p>
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
            <ul className="space-y-6">
              {SCHEDULE_WEEKDAYS.map((day) => {
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
                onClick={() => void save()}
                disabled={
                  saving || (!appliesGlobal && selectedUserIds.length === 0)
                }
                className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-cyan-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => void load()}
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
            <h2 className="mb-2 text-sm font-semibold text-gray-900">
              Preview (schedule shading, :00 left → :60 right per column)
            </h2>
            <ScheduleWeeklyGrid hours={previewHours} showDutyLines={false} />
          </div>
        </>
      )}
    </div>
  )
}
