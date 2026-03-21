"use client"

import { useEffect } from "react"

export type AttendanceMessageVariant = "success" | "error" | "info"

type AttendanceMessageModalProps = {
  open: boolean
  message: string
  variant: AttendanceMessageVariant
  onClose: () => void
}

export function AttendanceMessageModal({
  open,
  message,
  variant,
  onClose,
}: AttendanceMessageModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  const accent =
    variant === "success"
      ? "border-emerald-200 bg-emerald-50/90 text-emerald-900"
      : variant === "error"
        ? "border-red-200 bg-red-50/90 text-red-900"
        : "border-gray-200 bg-white text-gray-900"

  const title =
    variant === "success"
      ? "Success"
      : variant === "error"
        ? "Something went wrong"
        : "Notice"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="attendance-modal-title"
        aria-describedby="attendance-modal-desc"
        className={`w-full max-w-md rounded-xl border p-5 shadow-xl ${accent}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="attendance-modal-title"
          className="text-lg font-semibold"
        >
          {title}
        </h2>
        <p id="attendance-modal-desc" className="mt-3 text-sm leading-relaxed">
          {message}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600"
        >
          OK
        </button>
      </div>
    </div>
  )
}
