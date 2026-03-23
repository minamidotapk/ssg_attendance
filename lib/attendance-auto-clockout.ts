import type { Collection, Document } from "mongodb"

const AUTO_CLOCK_OUT_TIME = "17:00:00"
const AUTO_CLOCK_OUT_MINUTES = 17 * 60

type OpenSessionDoc = Document & {
  _id: unknown
  firebaseUid?: string
  date?: string
  timeIn?: string | null
  timeOut?: string | null
}

function formatYmdInTimezone(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

function getNowMinutesInTimezone(now: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now)
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "NaN")
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "NaN")
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0
  return h * 60 + m
}

function normalizeHmsToSeconds(raw: string | null | undefined): number | null {
  if (!raw) return null
  const p = raw.trim().split(":")
  const h = Number(p[0])
  const mi = Number(p[1] ?? 0)
  const s = Number(p[2] ?? 0)
  if (!Number.isFinite(h) || !Number.isFinite(mi) || !Number.isFinite(s)) return null
  return h * 3600 + mi * 60 + s
}

function shouldAutoCloseForToday(openDate: string, todayYmd: string, nowMin: number): boolean {
  if (openDate < todayYmd) return true
  if (openDate > todayYmd) return false
  return nowMin >= AUTO_CLOCK_OUT_MINUTES
}

/**
 * Auto-closes the latest open session at 17:00 local time if needed.
 * This sets OUT fields without photo/location to prevent stale "clocked in" sessions overnight.
 */
export async function autoClockOutOpenSessionIfNeeded(
  coll: Collection<Document>,
  firebaseUid: string,
  now: Date,
  timeZone: string,
): Promise<void> {
  const open = (await coll.findOne(
    { firebaseUid, timeOut: null },
    { sort: { createdAt: -1 } },
  )) as OpenSessionDoc | null

  if (!open?.date) return

  const todayYmd = formatYmdInTimezone(now, timeZone)
  const nowMin = getNowMinutesInTimezone(now, timeZone)
  if (!shouldAutoCloseForToday(open.date, todayYmd, nowMin)) return

  let autoOut = AUTO_CLOCK_OUT_TIME
  const inSeconds = normalizeHmsToSeconds(open.timeIn ?? null)
  const outSeconds = normalizeHmsToSeconds(AUTO_CLOCK_OUT_TIME)
  if (inSeconds !== null && outSeconds !== null && inSeconds > outSeconds) {
    autoOut = open.timeIn ?? AUTO_CLOCK_OUT_TIME
  }

  await coll.updateOne(
    { _id: open._id as never, firebaseUid, timeOut: null },
    {
      $set: {
        timeOut: autoOut,
        imageOut: null,
        contentTypeOut: null,
        locationOut: null,
        autoClockedOut: true,
        updatedAt: now,
      },
    },
  )
}
