import { useCallback, useState, type RefObject } from "react"
import { auth } from "@/firebase.config"
import {
  clearClockedInStorage,
  persistClockedInUid,
} from "@/lib/attendance-clock-storage"
import { captureFrameFromVideo } from "@/lib/attendance-video-capture"
import { requestDeviceLocation } from "@/lib/attendance-location"
import {
  applyLiveUpdateToLogCaches,
  dispatchAttendanceLogLiveUpdate,
} from "@/lib/attendance-log-client-cache"
import type { AttendancePostResponse } from "@/app/ui/attendance/attendance-api-types"
import type { AttendanceMessageVariant } from "@/app/ui/attendance/attendance-message-modal"

export type AttendanceModalPayload = {
  message: string
  variant: AttendanceMessageVariant
}

type UseAttendanceSubmitParams = {
  videoRef: RefObject<HTMLVideoElement | null>
  cameraOn: boolean
  streamError: string | null
  isClockedIn: boolean
  setIsClockedIn: (value: boolean) => void
}

export function useAttendanceSubmit({
  videoRef,
  cameraOn,
  streamError,
  isClockedIn,
  setIsClockedIn,
}: UseAttendanceSubmitParams) {
  const [submitting, setSubmitting] = useState<"in" | "out" | null>(null)
  const [modal, setModal] = useState<AttendanceModalPayload | null>(null)

  const dismissModal = useCallback(() => setModal(null), [])

  const showModal = useCallback((message: string, variant: AttendanceMessageVariant) => {
    setModal({ message, variant })
  }, [])

  const submitAttendance = useCallback(
    async (kind: "in" | "out") => {
      if (kind === "in" && isClockedIn) {
        showModal(
          "You are already logged in. log out first before logging in again.",
          "info",
        )
        return
      }
      if (kind === "out" && !isClockedIn) {
        showModal("You must log in first before you can log out.", "info")
        return
      }

      const user = auth.currentUser
      if (!user?.email) {
        showModal(
          "You must be signed in with email to record attendance.",
          "error",
        )
        return
      }

      if (!cameraOn || streamError) {
        showModal(
          "Turn the camera on and wait for the preview before recording attendance.",
          "info",
        )
        return
      }

      const video = videoRef.current
      if (!video) {
        showModal("The camera is not ready yet. Try again in a moment.", "info")
        return
      }

      const imageBase64 = captureFrameFromVideo(video)
      if (!imageBase64) {
        showModal(
          "Could not capture a photo. Wait for the video preview to load, then try again.",
          "info",
        )
        return
      }

      setSubmitting(kind)
      try {
        let location: Awaited<ReturnType<typeof requestDeviceLocation>>
        let idToken: string
        try {
          ;[location, idToken] = await Promise.all([
            requestDeviceLocation(),
            user.getIdToken(false),
          ])
        } catch (locErr) {
          showModal(
            locErr instanceof Error
              ? locErr.message
              : "Could not read your location.",
            "error",
          )
          return
        }

        const body = JSON.stringify({
          kind,
          imageBase64,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
          },
        })

        let res = await fetch("/api/attendance", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body,
        })

        if (res.status === 401) {
          const fresh = await user.getIdToken(true)
          res = await fetch("/api/attendance", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${fresh}`,
            },
            body,
          })
        }
        const data = (await res.json().catch(() => ({}))) as AttendancePostResponse

        if (!res.ok) {
          showModal(
            data.error ?? "Could not save attendance.",
            res.status === 409 ? "info" : "error",
          )
          return
        }

        const locPayload = {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
        }

        if (data.id && data.date && data.time) {
          if (kind === "in") {
            const update = {
              type: "session-in" as const,
              row: {
                date: data.date,
                timeIn: data.time,
                timeOut: null,
                sessionId: data.id,
                locationIn: locPayload,
                locationOut: null,
              },
            }
            applyLiveUpdateToLogCaches(user.uid, update)
            dispatchAttendanceLogLiveUpdate(update)
          } else {
            const update = {
              type: "session-out" as const,
              sessionId: data.id,
              date: data.date,
              timeOut: data.time,
              locationOut: locPayload,
            }
            applyLiveUpdateToLogCaches(user.uid, update)
            dispatchAttendanceLogLiveUpdate(update)
          }
        }

        if (kind === "in") {
          persistClockedInUid(user.uid)
          setIsClockedIn(true)
        } else {
          clearClockedInStorage()
          setIsClockedIn(false)
        }

        showModal(
          `${kind === "in" ? "Clock-in" : "Clock-out"} saved for ${data.date} at ${data.time}.`,
          "success",
        )
      } catch {
        showModal("Network error. Check your connection and try again.", "error")
      } finally {
        setSubmitting(null)
      }
    },
    [
      cameraOn,
      streamError,
      isClockedIn,
      setIsClockedIn,
      showModal,
      videoRef,
    ],
  )

  const handleIn = useCallback(() => {
    void submitAttendance("in")
  }, [submitAttendance])

  const handleOut = useCallback(() => {
    void submitAttendance("out")
  }, [submitAttendance])

  const busy = submitting !== null

  return {
    submitting,
    modal,
    dismissModal,
    handleIn,
    handleOut,
    busy,
  }
}
