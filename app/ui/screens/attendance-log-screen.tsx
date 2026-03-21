"use client"

import { useCallback, useEffect, useState } from "react"
import { auth } from "@/firebase.config"
import {
  type AttendanceLogRow,
  getCachedPhotoBlob,
  readLogsCache,
  writeLogsCache,
} from "@/lib/attendance-log-client-cache"
import {
  type AttendanceLocation,
  mapsUrl,
} from "@/lib/attendance-location"

/** Must match default `windowDays` used by GET /api/attendance/logs (rolling window). */
const DEFAULT_LOG_WINDOW_DAYS = 90

/** Philippines — used for calendar labels (DB still stores `YYYY-MM-DD`). */
const MANILA_TZ = "Asia/Manila"

/**
 * Display only — format a stored `YYYY-MM-DD` as a long date in Manila.
 * Anchor at local noon (+08) so the calendar day matches Philippines date.
 */
function formatLogDate(ymd: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd
  const dt = new Date(`${ymd}T12:00:00+08:00`)
  if (Number.isNaN(dt.getTime())) return ymd
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: MANILA_TZ,
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(dt)
}

/**
 * Display only — stored times are shown as Philippines wall clock with AM/PM.
 * Accepts `HH:MM:SS` or `HH:MM` (24h) from the API.
 */
function formatLogTime(t: string | null): string {
  if (!t) return "—"
  const parts = t.split(":")
  const h24 = Number(parts[0])
  const mi = Number((parts[1] ?? "0").slice(0, 2))
  if (!Number.isFinite(h24) || !Number.isFinite(mi)) return t
  const h = ((h24 % 24) + 24) % 24
  const ampm = h < 12 ? "AM" : "PM"
  let h12 = h % 12
  if (h12 === 0) h12 = 12
  return `${h12}:${String(mi).padStart(2, "0")} ${ampm}`
}

/** Minutes since midnight from `HH:MM:SS` / `HH:MM` (same-day duty math, TZ-agnostic). */
function minutesSinceMidnight(hms: string): number | null {
  const parts = hms.split(":")
  const h = Number(parts[0])
  const m = Number(parts[1] ?? 0)
  const s = Number(parts[2] ?? 0)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m + (Number.isFinite(s) ? s / 60 : 0)
}

/** Duty length from same-row time strings (Manila wall clock, same calendar day). */
function formatDutyHours(
  timeIn: string | null,
  timeOut: string | null,
): string {
  if (!timeIn || !timeOut) return "—"
  const start = minutesSinceMidnight(timeIn)
  const end = minutesSinceMidnight(timeOut)
  if (start === null || end === null || end <= start) return "—"
  const totalMins = Math.round(end - start)
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/** Inline style avoids Tailwind not seeing dynamic arbitrary grid templates. */
const LOG_GRID_TEMPLATE =
  "minmax(6rem, 1fr) minmax(4.25rem, 0.7fr) minmax(6.5rem, 1.7fr) minmax(5.5rem, 1fr) minmax(4.25rem, 0.7fr) minmax(6.5rem, 1.7fr) minmax(5.5rem, 1fr) minmax(4.5rem, 0.65fr)"

function LocationCell({ loc }: { loc: AttendanceLocation | null | undefined }) {
  if (!loc) {
    return <span className="text-xs text-gray-400">—</span>
  }
  const href = mapsUrl(loc.latitude, loc.longitude)
  const label = `${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`
  const title =
    loc.accuracy != null
      ? `${label} (±${Math.round(loc.accuracy)} m)`
      : label
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      className="text-xs font-medium text-cyan-700 underline-offset-2 hover:underline"
    >
      Open map
    </a>
  )
}

function PhotoCell({
  photoId,
  side,
  dateYmd,
  timeRaw,
  location,
}: {
  photoId: string | null
  side: "in" | "out"
  dateYmd: string
  timeRaw: string | null
  location?: AttendanceLocation | null
}) {
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

  useEffect(() => {
    if (!previewOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [previewOpen])

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
      {previewOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="presentation"
          onClick={() => setPreviewOpen(false)}
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
              className="mt-3 max-h-[65vh] w-full rounded-lg object-contain bg-gray-100"
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
                <div>
                  <dt className="inline font-medium text-gray-600">
                    Location:{" "}
                  </dt>
                  <dd className="inline">
                    <a
                      href={mapsUrl(location.latitude, location.longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-700 underline-offset-2 hover:underline"
                    >
                      {location.latitude.toFixed(5)},{" "}
                      {location.longitude.toFixed(5)}
                    </a>
                    {location.accuracy != null ? (
                      <span className="text-gray-500">
                        {" "}
                        (±{Math.round(location.accuracy)} m)
                      </span>
                    ) : null}
                  </dd>
                </div>
              ) : null}
            </dl>
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="mt-4 w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default function AttendanceLogScreen() {
  const [filterDate, setFilterDate] = useState("")
  const [rows, setRows] = useState<AttendanceLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rangeHint, setRangeHint] = useState<string | null>(null)

  const loadLogs = useCallback(
    async (opts?: { force?: boolean }) => {
      setError(null)
      const user = auth.currentUser
      if (!user) {
        setError("Sign in to view your attendance log.")
        setRows([])
        setRangeHint(null)
        setLoading(false)
        return
      }

      const trimmed = filterDate.trim()
      const filterKey = trimmed
        ? `d:${trimmed}`
        : `w:${DEFAULT_LOG_WINDOW_DAYS}`

      if (!opts?.force) {
        const cached = readLogsCache(user.uid, filterKey)
        if (cached) {
          setRows(cached)
          setRangeHint(
            trimmed
              ? null
              : `Showing cached rolling window (~${DEFAULT_LOG_WINDOW_DAYS} days). Refresh to sync.`,
          )
          setLoading(false)
          return
        }
      }

      setLoading(true)
      try {
        const token = await user.getIdToken()
        const q = trimmed
          ? `?date=${encodeURIComponent(trimmed)}`
          : `?windowDays=${DEFAULT_LOG_WINDOW_DAYS}`
        const res = await fetch(`/api/attendance/logs${q}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = (await res.json().catch(() => ({}))) as {
          error?: string
          rows?: AttendanceLogRow[]
          range?: { mode: string; from: string; to: string; windowDays?: number }
        }
        if (!res.ok) {
          setError(data.error ?? "Could not load logs.")
          setRows([])
          setRangeHint(null)
          return
        }
        const nextRows = data.rows ?? []
        setRows(nextRows)
        writeLogsCache(user.uid, filterKey, nextRows)
        const r = data.range
        if (r?.mode === "rolling") {
          setRangeHint(
            `Loaded ${formatLogDate(r.from)} → ${formatLogDate(r.to)} (last ${r.windowDays ?? DEFAULT_LOG_WINDOW_DAYS} days). The database is not fully scanned—pick a date for a specific day.`,
          )
        } else if (r?.mode === "single") {
          setRangeHint(null)
        } else if (r?.mode === "custom") {
          setRangeHint(
            `Loaded ${formatLogDate(r.from)} → ${formatLogDate(r.to)}.`,
          )
        } else {
          setRangeHint(null)
        }
      } catch {
        setError("Network error.")
        setRows([])
        setRangeHint(null)
      } finally {
        setLoading(false)
      }
    },
    [filterDate],
  )

  useEffect(() => {
    void loadLogs()
  }, [loadLogs])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance log</h1>
        <p className="mt-2 text-sm text-gray-600">
          Your clock-in and clock-out records with photos and GPS at each punch.
          Dates and times are shown in{" "}
          <span className="font-medium text-gray-800">
            Philippines (Manila, UTC+8)
          </span>{" "}
          with 12-hour time and AM/PM. Without a date selected, the server
          loads a limited rolling window (default {DEFAULT_LOG_WINDOW_DAYS}{" "}
          days)—not the entire database—so large collections stay fast. Photos
          and rows are cached in this browser; use Refresh to sync.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-gray-200 bg-gray-50/80 p-4">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="attendance-log-date"
            className="text-xs font-medium uppercase tracking-wide text-gray-500"
          >
            Filter by date
          </label>
          <input
            id="attendance-log-date"
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
          />
        </div>
        <button
          type="button"
          onClick={() => setFilterDate("")}
          className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-800 ring-1 ring-gray-300 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600"
        >
          Last {DEFAULT_LOG_WINDOW_DAYS} days
        </button>
        <button
          type="button"
          onClick={() => void loadLogs({ force: true })}
          disabled={loading}
          className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-cyan-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {rangeHint ? (
        <p className="text-sm text-gray-600" role="status">
          {rangeHint}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        {/* CSS Grid (not <table>) so layout cannot collapse to a single column if global CSS alters table display. */}
        <div
          className="min-w-[80rem] text-left text-sm"
          role="table"
          aria-label="Attendance records"
        >
          <div
            role="row"
            className="grid border-b border-gray-200 bg-gray-50"
            style={{ gridTemplateColumns: LOG_GRID_TEMPLATE }}
          >
            <div
              role="columnheader"
              className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900"
            >
              Date
            </div>
            <div
              role="columnheader"
              className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900"
            >
              Time IN
            </div>
            <div
              role="columnheader"
              className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900"
            >
              Picture of Time IN
            </div>
            <div
              role="columnheader"
              className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900"
            >
              Location IN
            </div>
            <div
              role="columnheader"
              className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900"
            >
              Time OUT
            </div>
            <div
              role="columnheader"
              className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900"
            >
              Picture of Time OUT
            </div>
            <div
              role="columnheader"
              className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900"
            >
              Location OUT
            </div>
            <div
              role="columnheader"
              className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900"
            >
              Duty hours
            </div>
          </div>

          {loading ? (
            <div role="row" className="border-b border-gray-100">
              <div
                role="cell"
                className="px-4 py-8 text-center text-gray-500"
              >
                Loading…
              </div>
            </div>
          ) : rows.length === 0 ? (
            <div role="row" className="border-b border-gray-100">
              <div
                role="cell"
                className="px-4 py-8 text-center text-gray-500"
              >
                No records
                {filterDate
                  ? ` for ${formatLogDate(filterDate)}`
                  : ""}
                .
              </div>
            </div>
          ) : (
            rows.map((row) => (
              <div
                key={row.sessionId}
                role="row"
                className="grid border-b border-gray-100 hover:bg-gray-50/80"
                style={{ gridTemplateColumns: LOG_GRID_TEMPLATE }}
              >
                <div
                  role="cell"
                  className="flex items-center whitespace-nowrap px-4 py-3 font-medium text-gray-900"
                >
                  {formatLogDate(row.date)}
                </div>
                <div
                  role="cell"
                  className="flex items-center whitespace-nowrap px-4 py-3 text-gray-700"
                >
                  {formatLogTime(row.timeIn)}
                </div>
                <div
                  role="cell"
                  className="flex items-center justify-center px-4 py-3"
                >
                  <PhotoCell
                    photoId={row.sessionId}
                    side="in"
                    dateYmd={row.date}
                    timeRaw={row.timeIn}
                    location={row.locationIn ?? null}
                  />
                </div>
                <div
                  role="cell"
                  className="flex items-center px-4 py-3 text-gray-700"
                >
                  <LocationCell loc={row.locationIn ?? null} />
                </div>
                <div
                  role="cell"
                  className="flex items-center whitespace-nowrap px-4 py-3 text-gray-700"
                >
                  {formatLogTime(row.timeOut)}
                </div>
                <div
                  role="cell"
                  className="flex items-center justify-center px-4 py-3"
                >
                  <PhotoCell
                    photoId={row.timeOut ? row.sessionId : null}
                    side="out"
                    dateYmd={row.date}
                    timeRaw={row.timeOut}
                    location={row.locationOut ?? null}
                  />
                </div>
                <div
                  role="cell"
                  className="flex items-center px-4 py-3 text-gray-700"
                >
                  <LocationCell loc={row.locationOut ?? null} />
                </div>
                <div
                  role="cell"
                  className="flex items-center whitespace-nowrap px-4 py-3 tabular-nums text-gray-700"
                >
                  {formatDutyHours(row.timeIn, row.timeOut)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
