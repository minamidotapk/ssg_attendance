"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export default function AttendanceLogScreen() {
  const [cameraOn, setCameraOn] = useState(false)
  const [streamError, setStreamError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!cameraOn) {
      const el = videoRef.current
      if (el?.srcObject) {
        const stream = el.srcObject as MediaStream
        stream.getTracks().forEach((track) => track.stop())
        el.srcObject = null
      }
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
      const el = videoRef.current
      if (el?.srcObject) {
        const stream = el.srcObject as MediaStream
        stream.getTracks().forEach((track) => track.stop())
        el.srcObject = null
      }
    }
  }, [cameraOn])

  const toggleCamera = useCallback(() => {
    setCameraOn((prev) => !prev)
  }, [])

  const handleIn = useCallback(() => {
    // TODO: connect to attendance “in” API / Firestore, etc.
  }, [])

  const handleOut = useCallback(() => {
    // TODO: connect to attendance “out” API / Firestore, etc.
  }, [])

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

        <div
          className="mt-6 flex w-full flex-wrap items-center justify-center gap-3"
          role="group"
          aria-label="Attendance controls"
        >
          <button
            type="button"
            aria-pressed={cameraOn}
            title={cameraOn ? "Turn camera off" : "Turn camera on"}
            onClick={toggleCamera}
            className={`min-w-[6.5rem] rounded-md px-5 py-2.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2 ${
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
            className="min-w-[6.5rem] rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            In
          </button>
          <button
            type="button"
            onClick={handleOut}
            className="min-w-[6.5rem] rounded-md bg-amber-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2"
          >
            Out
          </button>
        </div>
      </div>
  )
}

