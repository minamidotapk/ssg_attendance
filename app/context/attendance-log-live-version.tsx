"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { ATTENDANCE_LOG_LIVE_UPDATE_EVENT } from "@/lib/attendance-log-client-cache"

const AttendanceLogLiveVersionContext = createContext(0)

/**
 * Stays mounted while the user is in the app shell so In/Out on other routes
 * can trigger a cache re-read on the attendance log screen.
 */
export function AttendanceLogLiveVersionProvider({
  children,
}: {
  children: ReactNode
}) {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const bump = () => setVersion((v) => v + 1)
    window.addEventListener(ATTENDANCE_LOG_LIVE_UPDATE_EVENT, bump)
    return () =>
      window.removeEventListener(ATTENDANCE_LOG_LIVE_UPDATE_EVENT, bump)
  }, [])

  return (
    <AttendanceLogLiveVersionContext.Provider value={version}>
      {children}
    </AttendanceLogLiveVersionContext.Provider>
  )
}

export function useAttendanceLogLiveVersion() {
  return useContext(AttendanceLogLiveVersionContext)
}
