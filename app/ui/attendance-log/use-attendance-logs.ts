import { useCallback, useEffect, useState } from "react"
import { auth } from "@/firebase.config"
import {
  isAttendanceLogStorageKeyForUser,
  readLogsCache,
  writeLogsCache,
  type AttendanceLogRow,
} from "@/lib/attendance-log-client-cache"
import { DEFAULT_ATTENDANCE_LOG_WINDOW_DAYS } from "@/lib/attendance-log-constants"
import { useAttendanceLogLiveVersion } from "@/app/context/attendance-log-live-version"
import {
  type AttendanceLogsApiResponse,
  rangeHintFromApiResponse,
} from "./logs-api"

function filterStorageKey(trimmedDate: string): string {
  return trimmedDate
    ? `d:${trimmedDate}`
    : `w:${DEFAULT_ATTENDANCE_LOG_WINDOW_DAYS}`
}

export function useAttendanceLogs() {
  const liveLogVersion = useAttendanceLogLiveVersion()
  const [filterDate, setFilterDate] = useState("")
  const [rows, setRows] = useState<AttendanceLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rangeHint, setRangeHint] = useState<string | null>(null)

  const loadLogs = useCallback(
    async (opts?: { force?: boolean }) => {
      setError(null)
      const user = auth.currentUser
      if (!user) {
        setError("Sign in to view your attendance log.")
        setRows([])
        setRangeHint(null)
        setLoading(false)
        return
      }

      const trimmed = filterDate.trim()
      const filterKey = filterStorageKey(trimmed)

      if (!opts?.force) {
        const cached = readLogsCache(user.uid, filterKey)
        if (cached) {
          setRows(cached)
          setRangeHint(
            trimmed
              ? null
              : `Showing cached rolling window (~${DEFAULT_ATTENDANCE_LOG_WINDOW_DAYS} days). New punches appear automatically.`,
          )
          setLoading(false)
          return
        }
      }

      setLoading(true)
      try {
        const token = await user.getIdToken()
        const q = trimmed
          ? `?date=${encodeURIComponent(trimmed)}`
          : `?windowDays=${DEFAULT_ATTENDANCE_LOG_WINDOW_DAYS}`
        const res = await fetch(`/api/attendance/logs${q}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = (await res.json().catch(() => ({}))) as AttendanceLogsApiResponse
        if (!res.ok) {
          setError(data.error ?? "Could not load logs.")
          setRows([])
          setRangeHint(null)
          return
        }
        const nextRows = data.rows ?? []
        setRows(nextRows)
        writeLogsCache(user.uid, filterKey, nextRows)
        setRangeHint(rangeHintFromApiResponse(data.range))
      } catch {
        setError("Network error.")
        setRows([])
        setRangeHint(null)
      } finally {
        setLoading(false)
      }
    },
    [filterDate],
  )

  useEffect(() => {
    void loadLogs()
  }, [loadLogs])

  /** After In/Out, caches are patched globally — pull the current filter from storage. */
  useEffect(() => {
    if (liveLogVersion === 0) return
    const user = auth.currentUser
    if (!user) return
    const fk = filterStorageKey(filterDate.trim())
    const fresh = readLogsCache(user.uid, fk)
    if (fresh) setRows(fresh)
  }, [liveLogVersion, filterDate])

  /** Other tabs/windows: sessionStorage updates do not fire `storage` in the same tab. */
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      const uid = auth.currentUser?.uid
      if (!uid || !isAttendanceLogStorageKeyForUser(e.key, uid)) return
      const fk = filterStorageKey(filterDate.trim())
      const fresh = readLogsCache(uid, fk)
      if (fresh) setRows(fresh)
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [filterDate])

  const clearDateFilter = useCallback(() => {
    setFilterDate("")
  }, [])

  return {
    filterDate,
    setFilterDate,
    clearDateFilter,
    rows,
    loading,
    error,
    rangeHint,
  }
}
