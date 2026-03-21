"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/firebase.config"

/** Persists “clocked in” across routes until OUT (per signed-in uid). */
const CLOCKED_IN_STORAGE_KEY = "ssg_attendance_clocked_in_uid"

function captureFrameFromVideo(video: HTMLVideoElement): string | null {
  if (video.readyState < 2 || video.videoWidth === 0) {
    return null
  }
  const maxW = 960
  const scale = Math.min(1, maxW / video.videoWidth)
  const w = Math.round(video.videoWidth * scale)
  const h = Math.round(video.videoHeight * scale)
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")
  if (!ctx) return null
  ctx.drawImage(video, 0, 0, w, h)
  return canvas.toDataURL("image/jpeg", 0.82)
}

export default function AttendanceLogScreen() {
  const [cameraOn, setCameraOn] = useState(false)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState<"in" | "out" | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  /** After a successful IN, OUT is required before IN is allowed again (persists across routes). */
  const [isClockedIn, setIsClockedIn] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  /** Holds the active stream so we always stop tracks on unmount / navigation. */
  const mediaStreamRef = useRef<MediaStream | null>(null)

  const cameraReady = cameraOn && !streamError

  const releaseMediaStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }
    const el = videoRef.current
    if (el?.srcObject) {
      el.srcObject = null
    }
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user?.uid) {
        setIsClockedIn(false)
        return
      }
      try {
        const stored = sessionStorage.getItem(CLOCKED_IN_STORAGE_KEY)
        setIsClockedIn(stored === user.uid)
      } catch {
        setIsClockedIn(false)
      }
    })
    return () => unsub()
  }, [])

  /** Always release the camera when leaving this screen (or closing the tab flow). */
  useEffect(() => {
    return () => {
      releaseMediaStream()
    }
  }, [releaseMediaStream])

  useEffect(() => {
    if (!cameraOn) {
      releaseMediaStream()
      setStreamError(null)
      return
    }

    let cancelled = false
    setStreamError(null)

    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
        mediaStreamRef.current = stream
        const el = videoRef.current
        if (el) {
          el.srcObject = stream
          await el.play().catch(() => {
            /* autoplay policies; user gesture already occurred */
          })
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Could not access the camera."
          setStreamError(message)
          setCameraOn(false)
        }
      }
    })()

    return () => {
      cancelled = true
      releaseMediaStream()
    }
  }, [cameraOn, releaseMediaStream])

  const toggleCamera = useCallback(() => {
    setCameraOn((prev) => !prev)
  }, [])

  const submitAttendance = useCallback(
    async (kind: "in" | "out") => {
      setStatusMessage(null)

      const user = auth.currentUser
      if (!user?.email) {
        setStatusMessage(
          "You must be signed in with email to record attendance.",
        )
        return
      }

      if (!cameraOn || streamError) {
        setStatusMessage("Turn the camera on and wait for the preview first.")
        return
      }

      const video = videoRef.current
      if (!video) {
        setStatusMessage("Camera is not ready.")
        return
      }

      const imageBase64 = captureFrameFromVideo(video)
      if (!imageBase64) {
        setStatusMessage("Could not capture a frame. Wait for the video to load.")
        return
      }

      setSubmitting(kind)
      try {
        const idToken = await user.getIdToken(true)
        const res = await fetch("/api/attendance", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            kind,
            imageBase64,
          }),
        })
        const data = (await res.json().catch(() => ({}))) as {
          error?: string
          date?: string
          time?: string
        }

        if (!res.ok) {
          setStatusMessage(data.error ?? "Could not save attendance.")
          return
        }

        if (kind === "in") {
          try {
            sessionStorage.setItem(CLOCKED_IN_STORAGE_KEY, user.uid)
          } catch {
            /* ignore */
          }
          setIsClockedIn(true)
        } else {
          try {
            sessionStorage.removeItem(CLOCKED_IN_STORAGE_KEY)
          } catch {
            /* ignore */
          }
          setIsClockedIn(false)
        }

        setStatusMessage(
          `Saved ${kind === "in" ? "IN" : "OUT"} for ${data.date} at ${data.time}.`,
        )
      } catch {
        setStatusMessage("Network error. Try again.")
      } finally {
        setSubmitting(null)
      }
    },
    [cameraOn, streamError],
  )

  const handleIn = useCallback(() => {
    void submitAttendance("in")
  }, [submitAttendance])

  const handleOut = useCallback(() => {
    void submitAttendance("out")
  }, [submitAttendance])

  const busy = submitting !== null
  const inDisabled = busy || !cameraReady || isClockedIn
  const outDisabled = busy || !cameraReady || !isClockedIn

  return (
    <div className="space-y-6">
      <div className="relative w-full overflow-hidden rounded-lg bg-gray-900 ring-1 ring-gray-200 aspect-[16/9]">
        <video
          ref={videoRef}
          className={`h-full w-full object-cover transition-opacity duration-200 ${
            cameraOn && !streamError ? "opacity-100" : "opacity-0"
          }`}
          muted
          playsInline
          autoPlay
        />
        {!cameraOn && !streamError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center text-sm text-gray-400">
            <span>Camera is off</span>
            <span className="text-xs text-gray-500">
              Turn the camera on to see the live feed here.
            </span>
          </div>
        ) : null}
        {streamError ? (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-red-200">
            {streamError}
          </div>
        ) : null}
      </div>

      {statusMessage ? (
        <p
          className={`text-center text-sm ${
            statusMessage.startsWith("Saved")
              ? "text-emerald-700"
              : "text-red-600"
          }`}
          role="status"
        >
          {statusMessage}
        </p>
      ) : null}

      <div
        className="mt-6 flex w-full flex-wrap items-center justify-center gap-3"
        role="group"
        aria-label="Attendance controls"
      >
        <button
          type="button"
          aria-pressed={cameraOn}
          title={cameraOn ? "Turn camera off" : "Turn camera on"}
          disabled={busy}
          onClick={toggleCamera}
          className={`min-w-[6.5rem] rounded-md px-5 py-2.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2 disabled:opacity-50 ${
            cameraOn
              ? "bg-cyan-600 text-white shadow-sm hover:bg-cyan-700"
              : "bg-white text-gray-800 ring-1 ring-gray-300 hover:bg-gray-50"
          }`}
        >
          Camera
        </button>
        <button
          type="button"
          onClick={handleIn}
          disabled={inDisabled}
          title={
            !cameraReady
              ? "Turn the camera on to clock in"
              : isClockedIn
                ? "Clock out before clocking in again"
                : "Clock in"
          }
          className="min-w-[6.5rem] rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {submitting === "in" ? "Saving…" : "In"}
        </button>
        <button
          type="button"
          onClick={handleOut}
          disabled={outDisabled}
          title={
            !cameraReady
              ? "Turn the camera on to clock out"
              : !isClockedIn
                ? "Clock in first"
                : "Clock out"
          }
          className="min-w-[6.5rem] rounded-md bg-amber-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {submitting === "out" ? "Saving…" : "Out"}
        </button>
      </div>
    </div>
  )
}
