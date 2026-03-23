/**
 * Client-side caches for the attendance log UI so refreshes reuse data
 * and avoid re-downloading the same photos.
 */

import type { AttendanceLocation } from "@/lib/attendance-location"

/** One MongoDB session document per row (`sessionId`); IN/OUT photos use `?side=in|out`. */
export type AttendanceLogRow = {
  date: string
  timeIn: string | null
  timeOut: string | null
  sessionId: string
  /** Present on admin “all users” log rows. */
  userEmail?: string
  locationIn: AttendanceLocation | null
  locationOut: AttendanceLocation | null
}

const LOGS_PREFIX = "ssg_attendance_logs_v3:"
/** How long JSON rows stay valid before the next full fetch from the API */
export const ATTENDANCE_LOGS_TTL_MS = 30 * 60 * 1000

/** Dispatched on window after a successful IN/OUT so the log table can sync. */
export const ATTENDANCE_LOG_LIVE_UPDATE_EVENT = "ssg:attendance-log-live-update"

export type AttendanceLogLiveUpdate =
  | { type: "session-in"; row: AttendanceLogRow }
  | {
      type: "session-out"
      sessionId: string
      /** Manila calendar date for this punch (matches API `date`). */
      date: string
      timeOut: string
      locationOut: AttendanceLocation | null
    }

function logsStorageKey(uid: string, filterKey: string) {
  return `${LOGS_PREFIX}${uid}:${filterKey}`
}

function parseFilterKeyFromStorageKey(
  fullKey: string,
  uid: string,
): string | null {
  const head = `${LOGS_PREFIX}${uid}:`
  if (!fullKey.startsWith(head)) return null
  return fullKey.slice(head.length)
}

/**
 * Merge a live IN/OUT into rows for one cache bucket (`d:YYYY-MM-DD` or `w:N`).
 */
export function mergeLiveIntoCachedRows(
  rows: AttendanceLogRow[],
  filterKey: string,
  update: AttendanceLogLiveUpdate,
): AttendanceLogRow[] {
  if (filterKey.startsWith("d:")) {
    const ymd = filterKey.slice(2)
    if (update.type === "session-in") {
      if (update.row.date !== ymd) return rows
      if (rows.some((r) => r.sessionId === update.row.sessionId)) return rows
      return [update.row, ...rows]
    }
    if (update.date !== ymd) return rows
    return rows.map((r) =>
      r.sessionId === update.sessionId
        ? {
            ...r,
            timeOut: update.timeOut,
            locationOut: update.locationOut,
          }
        : r,
    )
  }

  if (update.type === "session-in") {
    if (rows.some((r) => r.sessionId === update.row.sessionId)) return rows
    return [update.row, ...rows]
  }
  return rows.map((r) =>
    r.sessionId === update.sessionId
      ? {
          ...r,
          timeOut: update.timeOut,
          locationOut: update.locationOut,
        }
      : r,
  )
}

/**
 * Patch every sessionStorage log cache for this user (rolling + any date filters).
 */
export function applyLiveUpdateToLogCaches(
  uid: string,
  update: AttendanceLogLiveUpdate,
): void {
  if (typeof sessionStorage === "undefined") return
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i)
    if (!key) continue
    const filterKey = parseFilterKeyFromStorageKey(key, uid)
    if (!filterKey) continue
    try {
      const raw = sessionStorage.getItem(key)
      if (!raw) continue
      const parsed = JSON.parse(raw) as { rows: AttendanceLogRow[]; at: number }
      if (!Array.isArray(parsed.rows)) continue
      const merged = mergeLiveIntoCachedRows(parsed.rows, filterKey, update)
      if (JSON.stringify(merged) === JSON.stringify(parsed.rows)) continue
      sessionStorage.setItem(
        key,
        JSON.stringify({ rows: merged, at: Date.now() }),
      )
    } catch {
      /* ignore corrupt entries */
    }
  }
}

export function dispatchAttendanceLogLiveUpdate(update: AttendanceLogLiveUpdate) {
  if (typeof window === "undefined") return
  window.dispatchEvent(
    new CustomEvent<AttendanceLogLiveUpdate>(ATTENDANCE_LOG_LIVE_UPDATE_EVENT, {
      detail: update,
    }),
  )
}

export function isAttendanceLogStorageKeyForUser(
  key: string | null,
  uid: string,
): boolean {
  return key !== null && key.startsWith(`${LOGS_PREFIX}${uid}:`)
}

export function readLogsCache(
  uid: string,
  filterKey: string,
  ttlMs = ATTENDANCE_LOGS_TTL_MS,
): AttendanceLogRow[] | null {
  if (typeof sessionStorage === "undefined") return null
  try {
    const raw = sessionStorage.getItem(logsStorageKey(uid, filterKey))
    if (!raw) return null
    const parsed = JSON.parse(raw) as { rows: AttendanceLogRow[]; at: number }
    if (!Array.isArray(parsed.rows) || typeof parsed.at !== "number") return null
    if (Date.now() - parsed.at > ttlMs) return null
    return parsed.rows
  } catch {
    return null
  }
}

export function writeLogsCache(
  uid: string,
  filterKey: string,
  rows: AttendanceLogRow[],
) {
  if (typeof sessionStorage === "undefined") return
  try {
    sessionStorage.setItem(
      logsStorageKey(uid, filterKey),
      JSON.stringify({ rows, at: Date.now() }),
    )
  } catch {
    /* quota / private mode */
  }
}

const PHOTO_DB = "ssg-attendance-cache"
const PHOTO_DB_VER = 1
const PHOTO_STORE = "photos"

function openPhotoDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null)
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(PHOTO_DB, PHOTO_DB_VER)
      req.onerror = () => resolve(null)
      req.onsuccess = () => resolve(req.result)
      req.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(PHOTO_STORE)) {
          db.createObjectStore(PHOTO_STORE)
        }
      }
    } catch {
      resolve(null)
    }
  })
}

async function idbGetPhoto(id: string): Promise<Blob | null> {
  const db = await openPhotoDb()
  if (!db) return null
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(PHOTO_STORE, "readonly")
      const r = tx.objectStore(PHOTO_STORE).get(id)
      r.onsuccess = () => resolve((r.result as Blob | undefined) ?? null)
      r.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

async function idbSetPhoto(id: string, blob: Blob): Promise<void> {
  const db = await openPhotoDb()
  if (!db) return
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(PHOTO_STORE, "readwrite")
      tx.objectStore(PHOTO_STORE).put(blob, id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    } catch {
      resolve()
    }
  })
}

const photoBlobInflight = new Map<string, Promise<Blob>>()

/**
 * Returns a Blob for this attendance photo id, using IndexedDB then network.
 * Concurrent callers share one fetch per id.
 */
export function getCachedPhotoBlob(
  photoId: string,
  fetchBlob: () => Promise<Blob>,
): Promise<Blob> {
  let p = photoBlobInflight.get(photoId)
  if (p) return p

  p = (async () => {
    const fromIdb = await idbGetPhoto(photoId)
    if (fromIdb && fromIdb.size > 0) return fromIdb
    const fresh = await fetchBlob()
    if (fresh.size > 0) void idbSetPhoto(photoId, fresh)
    return fresh
  })().finally(() => {
    photoBlobInflight.delete(photoId)
  })

  photoBlobInflight.set(photoId, p)
  return p
}
