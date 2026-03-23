"use client"

import {
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react"
import { auth } from "@/firebase.config"
import {
  ATTENDANCE_LOG_LIVE_UPDATE_EVENT,
  type AttendanceLogLiveUpdate,
  type AttendanceLogRow,
} from "@/lib/attendance-log-client-cache"
import {
  readScheduleHoursCache,
  readScheduleWeekLogsCache,
  writeScheduleHoursCache,
  writeScheduleWeekLogsCache,
} from "@/lib/schedule-client-cache"
import {
  buildDutySegmentsByWeekday,
  type ScheduleDutySegments,
} from "@/lib/schedule-duty"
import { scheduleHourColumns } from "@/lib/schedule-grid"
import {
  getMondayToSaturdayYmdPack,
  getTodayYmd,
  SCHEDULE_APP_TIMEZONE,
} from "@/lib/schedule-week"
import type { WeeklyScheduleHours } from "@/lib/schedule-types"

function mergeWeekRows(
  rows: AttendanceLogRow[],
  update: AttendanceLogLiveUpdate,
  weekDates: Set<string>,
): AttendanceLogRow[] {
  if (update.type === "session-in") {
    if (!weekDates.has(update.row.date)) return rows
    if (rows.some((r) => r.sessionId === update.row.sessionId)) return rows
    return [update.row, ...rows]
  }
  if (!weekDates.has(update.date)) return rows
  return rows.map((r) =>
    r.sessionId === update.sessionId
      ? {
          ...r,
          timeOut: update.timeOut,
          locationOut: update.locationOut,
        }
      : r,
  )
}

export function useSchedulePageData() {
  const [hours, setHours] = useState<WeeklyScheduleHours | null>(null)
  const [weekRows, setWeekRows] = useState<AttendanceLogRow[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dutySegments: ScheduleDutySegments = useMemo(() => {
    const todayYmd = getTodayYmd(SCHEDULE_APP_TIMEZONE)
    const freshPack = getMondayToSaturdayYmdPack(SCHEDULE_APP_TIMEZONE)
    return buildDutySegmentsByWeekday(
      weekRows,
      freshPack.ymdByWeekday,
      todayYmd,
      SCHEDULE_APP_TIMEZONE,
      scheduleHourColumns(),
    )
  }, [weekRows])

  useLayoutEffect(() => {
    const user = auth.currentUser
    if (!user) {
      setInitialLoading(false)
      return
    }
    const pack = getMondayToSaturdayYmdPack(SCHEDULE_APP_TIMEZONE)
    const ch = readScheduleHoursCache(user.uid)
    const cr = readScheduleWeekLogsCache(user.uid, pack.mondayYmd)
    if (ch !== null) setHours(ch)
    if (cr !== null) setWeekRows(cr)
    if (ch !== null || cr !== null) {
      setInitialLoading(false)
    }
  }, [])

  const load = useCallback(async () => {
    const user = auth.currentUser
    if (!user) {
      setHours({})
      setWeekRows([])
      setInitialLoading(false)
      setIsRefreshing(false)
      setError(null)
      return
    }

    const freshPack = getMondayToSaturdayYmdPack(SCHEDULE_APP_TIMEZONE)
    const cachedH = readScheduleHoursCache(user.uid)
    const cachedR = readScheduleWeekLogsCache(user.uid, freshPack.mondayYmd)
    const hadCache = cachedH !== null || cachedR !== null

    if (cachedH !== null) setHours(cachedH)
    if (cachedR !== null) setWeekRows(cachedR)
    if (hadCache) {
      setInitialLoading(false)
      setIsRefreshing(true)
    } else {
      setInitialLoading(true)
    }

    setError(null)

    try {
      const token = await user.getIdToken()
      const logsUrl = `/api/attendance/logs?from=${encodeURIComponent(freshPack.from)}&to=${encodeURIComponent(freshPack.to)}`

      const [sRes, lRes] = await Promise.all([
        fetch("/api/schedule", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(logsUrl, { headers: { Authorization: `Bearer ${token}` } }),
      ])

      const msgs: string[] = []

      let nextHours: WeeklyScheduleHours = {}
      let nextRows: AttendanceLogRow[] = []

      if (!sRes.ok) {
        msgs.push("Could not load schedule.")
        if (cachedH === null) nextHours = {}
        else nextHours = cachedH
      } else {
        const sData = (await sRes.json()) as { hours?: WeeklyScheduleHours }
        nextHours = sData.hours ?? {}
        writeScheduleHoursCache(user.uid, nextHours)
      }

      if (!lRes.ok) {
        msgs.push("Could not load attendance for this week.")
        if (cachedR === null) nextRows = []
        else nextRows = cachedR
      } else {
        const lData = (await lRes.json()) as { rows?: AttendanceLogRow[] }
        nextRows = lData.rows ?? []
        writeScheduleWeekLogsCache(user.uid, freshPack.mondayYmd, nextRows)
      }

      const apply = () => {
        if (sRes.ok) setHours(nextHours)
        else if (cachedH === null) setHours({})

        if (lRes.ok) setWeekRows(nextRows)
        else if (cachedR === null) setWeekRows([])

        setError(msgs.length ? msgs.join(" ") : null)
      }

      const finish = () => {
        setInitialLoading(false)
        setIsRefreshing(false)
      }

      if (hadCache) {
        startTransition(() => {
          apply()
          finish()
        })
      } else {
        apply()
        finish()
      }
    } catch {
      setError("Could not load schedule data.")
      if (cachedH === null) setHours({})
      if (cachedR === null) setWeekRows([])
      setInitialLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const onLive = (ev: Event) => {
      const user = auth.currentUser
      if (!user) return
      const detail = (ev as CustomEvent<AttendanceLogLiveUpdate>).detail
      const freshPack = getMondayToSaturdayYmdPack(SCHEDULE_APP_TIMEZONE)
      const weekDates = new Set(Object.values(freshPack.ymdByWeekday))
      startTransition(() => {
        setWeekRows((prev) => {
          const merged = mergeWeekRows(prev, detail, weekDates)
          writeScheduleWeekLogsCache(user.uid, freshPack.mondayYmd, merged)
          return merged
        })
      })
    }
    window.addEventListener(ATTENDANCE_LOG_LIVE_UPDATE_EVENT, onLive)
    return () =>
      window.removeEventListener(ATTENDANCE_LOG_LIVE_UPDATE_EVENT, onLive)
  }, [])

  return {
    hours,
    dutySegments,
    initialLoading,
    isRefreshing,
    error,
    reload: load,
  }
}
