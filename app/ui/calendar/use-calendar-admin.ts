"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { auth } from "@/firebase.config"
import { SCHEDULE_WEEKDAYS, type ScheduleWeekday, type WeeklyScheduleHours } from "@/lib/schedule-types"
import { draftFromHours, hoursFromDraft, newId, orderedSelectedUsers } from "@/app/ui/calendar/draft-utils"
import type { CalendarDraft, ListedUser, UserWithSchedule } from "@/app/ui/calendar/types"

export function useCalendarAdmin(isAdmin: boolean, isRoleLoading: boolean) {
  const [appliesGlobal, setAppliesGlobal] = useState(true)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [users, setUsers] = useState<ListedUser[]>([])
  const [usersWithSchedules, setUsersWithSchedules] = useState<UserWithSchedule[]>([])
  const [draft, setDraft] = useState<CalendarDraft>({})
  const [dayToAdd, setDayToAdd] = useState<ScheduleWeekday>(SCHEDULE_WEEKDAYS[0])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  const activeDays = useMemo(() => SCHEDULE_WEEKDAYS.filter((day) => day in draft), [draft])
  const availableDays = useMemo(
    () => SCHEDULE_WEEKDAYS.filter((day) => !activeDays.includes(day)),
    [activeDays],
  )

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return
    try {
      const user = auth.currentUser
      if (!user) return
      const token = await user.getIdToken()
      const res = await fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } })
      const data = (await res.json().catch(() => ({}))) as { users?: ListedUser[] }
      if (res.ok && Array.isArray(data.users)) setUsers(data.users)
    } catch {
      /* ignore */
    }
  }, [isAdmin])

  const loadUsersWithSchedules = useCallback(async () => {
    if (!isAdmin) return
    try {
      const user = auth.currentUser
      if (!user) return
      const token = await user.getIdToken()
      const res = await fetch("/api/admin/schedule?scope=users", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = (await res.json().catch(() => ({}))) as { users?: UserWithSchedule[] }
      if (res.ok && Array.isArray(data.users)) setUsersWithSchedules(data.users)
    } catch {
      /* ignore */
    }
  }, [isAdmin])

  useEffect(() => {
    if (!isRoleLoading && isAdmin) void Promise.all([loadUsers(), loadUsersWithSchedules()])
  }, [isAdmin, isRoleLoading, loadUsers, loadUsersWithSchedules])

  const loadSchedule = useCallback(async () => {
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
        const primary = selectedUserIds[0] ?? ""
        if (!primary) {
          setDraft({})
          return
        }
        url = `/api/admin/schedule?scope=user&firebaseUid=${encodeURIComponent(primary)}`
      }
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
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
  }, [appliesGlobal, isAdmin, selectedUserIds])

  useEffect(() => {
    if (!isRoleLoading && isAdmin) void loadSchedule()
  }, [isAdmin, isRoleLoading, loadSchedule])

  const addSegment = useCallback((day: ScheduleWeekday) => {
    setDraft((prev) => ({ ...prev, [day]: [...(prev[day] ?? []), { id: newId(), open: "", close: "" }] }))
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

  const updateSegment = useCallback((day: ScheduleWeekday, id: string, field: "open" | "close", value: string) => {
    setDraft((prev) => ({
      ...prev,
      [day]: (prev[day] ?? []).map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    }))
    setSavedMsg(null)
  }, [])

  const clearDay = useCallback((day: ScheduleWeekday) => {
    setDraft((prev) => {
      const next = { ...prev }
      delete next[day]
      return next
    })
    setSavedMsg(null)
  }, [])

  const addDay = useCallback((day: ScheduleWeekday) => {
    setDraft((prev) => {
      if (day in prev) return prev
      return { ...prev, [day]: [] }
    })
    setSavedMsg(null)
    const rest = SCHEDULE_WEEKDAYS.filter((d) => d !== day && !(d in draft))
    if (rest.length > 0) setDayToAdd(rest[0]!)
  }, [draft])

  const saveSchedule = useCallback(async () => {
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
      if (!appliesGlobal && selectedUserIds.length === 0) {
        setError("Select at least one user, or choose everyone (default).")
        return
      }
      const token = await user.getIdToken()
      const selectedListed = orderedSelectedUsers(users, selectedUserIds)
      const body = appliesGlobal
        ? { target: "global" as const, hours }
        : { target: { users: selectedListed.map((u) => ({ firebaseUid: u.firebaseUid, email: u.email })) }, hours }
      const res = await fetch("/api/admin/schedule", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        hours?: WeeklyScheduleHours
        count?: number
      }
      if (!res.ok) {
        setError(data.error ?? "Save failed.")
        return
      }
      setDraft(draftFromHours(data.hours ?? hours))
      void loadUsersWithSchedules()
      if (appliesGlobal) {
        setSavedMsg("Saved default schedule for everyone without a personal calendar.")
      } else if (selectedListed.length === 1) {
        setSavedMsg(`Saved personal schedule for ${selectedListed[0]!.email}.`)
      } else {
        setSavedMsg(`Saved the same personal schedule for ${data.count ?? selectedListed.length} users.`)
      }
    } catch {
      setError("Save failed.")
    } finally {
      setSaving(false)
    }
  }, [appliesGlobal, draft, loadUsersWithSchedules, selectedUserIds, users])

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
      const res = await fetch(`/api/admin/schedule?firebaseUids=${encodeURIComponent(q)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setError(data.error ?? "Could not remove override.")
        return
      }
      setDraft({})
      void loadUsersWithSchedules()
      setSavedMsg(
        selectedListed.length === 1
          ? `${selectedListed[0]!.email} will use the default schedule again.`
          : `${selectedListed.length} users will use the default schedule again.`,
      )
    } catch {
      setError("Could not remove override.")
    } finally {
      setSaving(false)
    }
  }, [appliesGlobal, loadUsersWithSchedules, selectedUserIds, users])

  return {
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
  }
}
