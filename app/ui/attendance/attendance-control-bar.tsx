import { Spinner } from "@/app/components/spinner"

type AttendanceControlBarProps = {
  cameraOn: boolean
  busy: boolean
  submitting: "in" | "out" | null
  onToggleCamera: () => void
  onIn: () => void
  onOut: () => void
}

export function AttendanceControlBar({
  cameraOn,
  busy,
  submitting,
  onToggleCamera,
  onIn,
  onOut,
}: AttendanceControlBarProps) {
  return (
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
        onClick={onToggleCamera}
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
        onClick={onIn}
        disabled={busy}
        title="Clock in"
        className="min-w-[6.5rem] rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:opacity-50"
      >
        {submitting === "in" ? <Spinner /> : "In"}
      </button>
      <button
        type="button"
        onClick={onOut}
        disabled={busy}
        title="Clock out"
        className="min-w-[6.5rem] rounded-md bg-amber-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 disabled:opacity-50"
      >
        {submitting === "out" ? <Spinner /> : "Out"}
      </button>
    </div>
  )
}
