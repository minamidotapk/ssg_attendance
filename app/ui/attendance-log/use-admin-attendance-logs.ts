import { useCallback, useEffect, useState } from "react"
import { auth } from "@/firebase.config"
import type { AttendanceLogRow } from "@/lib/attendance-log-client-cache"
import { DEFAULT_ATTENDANCE_LOG_WINDOW_DAYS } from "@/lib/attendance-log-constants"
import {
  type AttendanceLogsApiResponse,
  rangeHintFromApiResponse,
} from "./logs-api"

const ADMIN_PREFIX = "ssg_admin_attendance_logs_v3:"

function filterStorageKey(trimmedDate: string): string {
  return trimmedDate
    ? `d:${trimmedDate}`
    : `w:${DEFAULT_ATTENDANCE_LOG_WINDOW_DAYS}`
}

function cacheKey(uid: string, filterKey: string) {
  return `${ADMIN_PREFIX}${uid}:${filterKey}`
}

function readAdminCache(uid: string, filterKey: string): AttendanceLogRow[] | null {
  if (typeof sessionStorage === "undefined") return null
  try {
    const raw = sessionStorage.getItem(cacheKey(uid, filterKey))
    if (!raw) return null
    const parsed = JSON.parse(raw) as { rows: AttendanceLogRow[]; at: number }
    if (!Array.isArray(parsed.rows) || typeof parsed.at !== "number") return null
    if (Date.now() - parsed.at > 30 * 60 * 1000) return null
    return parsed.rows
  } catch {
    return null
  }
}

function writeAdminCache(uid: string, filterKey: string, rows: AttendanceLogRow[]) {
  if (typeof sessionStorage === "undefined") return
  try {
    sessionStorage.setItem(
      cacheKey(uid, filterKey),
      JSON.stringify({ rows, at: Date.now() }),
    )
  } catch {
    /* quota */
  }
}

export function useAdminAttendanceLogs(enabled: boolean) {
  const [filterDate, setFilterDate] = useState("")
  const [rows, setRows] = useState<AttendanceLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rangeHint, setRangeHint] = useState<string | null>(null)

  const loadLogs = useCallback(
    async (opts?: { force?: boolean }) => {
      if (!enabled) return
      setError(null)
      const user = auth.currentUser
      if (!user) {
        setError("Sign in required.")
        setRows([])
        setRangeHint(null)
        setLoading(false)
        return
      }

      const trimmed = filterDate.trim()
      const filterKey = filterStorageKey(trimmed)

      if (!opts?.force) {
        const cached = readAdminCache(user.uid, filterKey)
        if (cached) {
          setRows(cached)
          setRangeHint(
            trimmed
              ? null
              : `All users — cached rolling window (~${DEFAULT_ATTENDANCE_LOG_WINDOW_DAYS} days).`,
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
        const res = await fetch(`/api/admin/attendance/logs${q}`, {
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
        writeAdminCache(user.uid, filterKey, nextRows)
        if (trimmed) {
          setRangeHint(null)
        } else {
          const base = rangeHintFromApiResponse(data.range)
          setRangeHint(
            base ? `All users — ${base}` : "All users — attendance records.",
          )
        }
      } catch {
        setError("Network error.")
        setRows([])
        setRangeHint(null)
      } finally {
        setLoading(false)
      }
    },
    [enabled, filterDate],
  )

  useEffect(() => {
    if (!enabled) {
      setRows([])
      setLoading(false)
      setRangeHint(null)
      setError(null)
      return
    }
    void loadLogs()
  }, [enabled, loadLogs])

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
