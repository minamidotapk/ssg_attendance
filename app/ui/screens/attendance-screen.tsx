"use client"

import { AttendanceCameraPreview } from "@/app/ui/attendance/attendance-camera-preview"
import { AttendanceControlBar } from "@/app/ui/attendance/attendance-control-bar"
import { AttendanceLocationHint } from "@/app/ui/attendance/attendance-location-hint"
import { AttendanceMessageModal } from "@/app/ui/attendance/attendance-message-modal"
import { useAttendanceCamera } from "@/app/ui/attendance/use-attendance-camera"
import { useAttendanceSubmit } from "@/app/ui/attendance/use-attendance-submit"
import { useClockedInSession } from "@/app/ui/attendance/use-clocked-in-session"

export default function AttendanceScreen() {
  const { videoRef, cameraOn, streamError, cameraReady, toggleCamera } =
    useAttendanceCamera()
  const { isClockedIn, setIsClockedIn } = useClockedInSession()

  const {
    submitting,
    modal,
    dismissModal,
    handleIn,
    handleOut,
    busy,
  } = useAttendanceSubmit({
    videoRef,
    cameraOn,
    streamError,
    isClockedIn,
    setIsClockedIn,
  })

  return (
    <div className="space-y-6">
      <AttendanceCameraPreview
        videoRef={videoRef}
        cameraOn={cameraOn}
        streamError={streamError}
      />

      <AttendanceLocationHint />

      <AttendanceControlBar
        cameraOn={cameraOn}
        busy={busy}
        submitting={submitting}
        onToggleCamera={toggleCamera}
        onIn={handleIn}
        onOut={handleOut}
      />

      <AttendanceMessageModal
        open={modal !== null}
        message={modal?.message ?? ""}
        variant={modal?.variant ?? "info"}
        onClose={dismissModal}
      />
    </div>
  )
}
