"use client"

import { useCallback, useEffect, useState } from "react"
import { auth } from "@/firebase.config"
import { getCachedPhotoBlob } from "@/lib/attendance-log-client-cache"
import type { AttendanceLocation } from "@/lib/attendance-location"
import {
  formatLocationPlace,
  hasPlaceLabels,
  mapsUrl,
} from "@/lib/attendance-location"
import { formatLogDate, formatLogTime } from "@/lib/attendance-log-display"

type PhotoCellProps = {
  photoId: string | null
  side: "in" | "out"
  dateYmd: string
  timeRaw: string | null
  location?: AttendanceLocation | null
}

function PhotoPreviewModal({
  open,
  onClose,
  src,
  sideLabel,
  dateYmd,
  timeRaw,
  location,
}: {
  open: boolean
  onClose: () => void
  src: string
  sideLabel: string
  dateYmd: string
  timeRaw: string | null
  location?: AttendanceLocation | null
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="attendance-photo-preview-title"
        className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="attendance-photo-preview-title"
          className="text-lg font-semibold text-gray-900"
        >
          {sideLabel}
        </h2>
        {/* eslint-disable-next-line @next/next/no-img-element -- blob URLs from authenticated API */}
        <img
          src={src}
          alt=""
          className="mt-3 max-h-[65vh] w-full rounded-lg bg-gray-100 object-contain"
        />
        <dl className="mt-4 space-y-1 text-sm text-gray-700">
          <div>
            <dt className="inline font-medium text-gray-600">Date: </dt>
            <dd className="inline">{formatLogDate(dateYmd)}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-gray-600">Time: </dt>
            <dd className="inline">{formatLogTime(timeRaw)}</dd>
          </div>
          {location ? (
            <div className="space-y-2">
              {hasPlaceLabels(location) ? (
                <dl className="space-y-1">
                  {location.barangay ? (
                    <div>
                      <dd>{location.barangay}</dd>
                      <dd>{location.municipality}</dd>
                      <dd>{location.province}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : (
                <dl>
                  <dt className="font-medium text-gray-600">Location</dt>
                  <dd className="text-gray-700">{formatLocationPlace(location)}</dd>
                </dl>
              )}
              <a
                href={mapsUrl(location.latitude, location.longitude)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-cyan-700 underline-offset-2 hover:underline"
              >
                Open in map
                {location.accuracy != null
                  ? ` (±${Math.round(location.accuracy)} m)`
                  : ""}
              </a>
            </div>
          ) : null}
        </dl>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600"
        >
          Close
        </button>
      </div>
    </div>
  )
}

export function PhotoCell({
  photoId,
  side,
  dateYmd,
  timeRaw,
  location,
}: PhotoCellProps) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  useEffect(() => {
    if (!photoId) {
      setSrc(null)
      setFailed(false)
      return
    }

    const cacheKey = `${photoId}:${side}`
    let cancelled = false
    let objectUrl: string | null = null

    void (async () => {
      const user = auth.currentUser
      if (!user) {
        setFailed(true)
        return
      }
      try {
        const blob = await getCachedPhotoBlob(cacheKey, async () => {
          const token = await user.getIdToken()
          const res = await fetch(
            `/api/attendance/photo/${photoId}?side=${side}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          )
          if (!res.ok) throw new Error("photo fetch failed")
          return res.blob()
        })
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setSrc(objectUrl)
        setFailed(false)
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [photoId, side])

  const closePreview = useCallback(() => setPreviewOpen(false), [])
  const sideLabel = side === "in" ? "Clock in" : "Clock out"

  if (!photoId) {
    return <span className="text-sm text-gray-400">—</span>
  }
  if (failed) {
    return <span className="text-xs text-red-600">Failed to load</span>
  }
  if (!src) {
    return <span className="text-xs text-gray-400">Loading…</span>
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        className="mx-auto block rounded-md ring-1 ring-gray-200 transition hover:ring-cyan-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600"
        aria-label={`View ${sideLabel} photo: ${formatLogDate(dateYmd)} ${formatLogTime(timeRaw)}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- blob URLs from authenticated API */}
        <img
          src={src}
          alt=""
          className="h-16 w-auto max-w-[100px] rounded object-cover"
        />
      </button>
      <PhotoPreviewModal
        open={previewOpen}
        onClose={closePreview}
        src={src}
        sideLabel={sideLabel}
        dateYmd={dateYmd}
        timeRaw={timeRaw}
        location={location}
      />
    </>
  )
}
