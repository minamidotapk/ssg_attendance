import type { RefObject } from "react"

type AttendanceCameraPreviewProps = {
  videoRef: RefObject<HTMLVideoElement | null>
  cameraOn: boolean
  streamError: string | null
}

export function AttendanceCameraPreview({
  videoRef,
  cameraOn,
  streamError,
}: AttendanceCameraPreviewProps) {
  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-gray-900 ring-1 ring-gray-200">
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
  )
}
