/**
 * Client-side caches for the attendance log UI so refreshes reuse data
 * and avoid re-downloading the same photos.
 */

/** One MongoDB session document per row (`sessionId`); IN/OUT photos use `?side=in|out`. */
export type AttendanceLogRow = {
  date: string
  timeIn: string | null
  timeOut: string | null
  sessionId: string
}

const LOGS_PREFIX = "ssg_attendance_logs_v2:"
/** How long JSON rows stay valid without hitting Refresh */
export const ATTENDANCE_LOGS_TTL_MS = 30 * 60 * 1000

function logsStorageKey(uid: string, filterKey: string) {
  return `${LOGS_PREFIX}${uid}:${filterKey}`
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
