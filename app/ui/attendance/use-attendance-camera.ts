import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Front-camera preview for attendance: stream lifecycle + error handling.
 */
export function useAttendanceCamera() {
  const [cameraOn, setCameraOn] = useState(false)
  const [streamError, setStreamError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
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

  return {
    videoRef,
    cameraOn,
    streamError,
    cameraReady,
    toggleCamera,
  }
}
