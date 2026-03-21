import { NextResponse } from "next/server"
import type { Document } from "mongodb"
import { parseAttendanceLocationPayload } from "@/lib/attendance-location"
import { requireAttendanceAuth } from "@/lib/attendance-auth"
import { ATTENDANCE_SESSIONS_COLLECTION } from "@/lib/attendance-collections"
import { getAttendanceDbName, getMongoClientPromise } from "@/lib/mongodb"

export const runtime = "nodejs"

/** Default rolling window when no single-day filter (avoids scanning entire collection). */
const DEFAULT_WINDOW_DAYS = 90
const MAX_WINDOW_DAYS = 366
const MAX_CUSTOM_RANGE_DAYS = 366
const MAX_SESSION_ROWS = 500

function isYmd(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

function formatYmdInTz(d: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d)
}

/**
 * One row per session document (IN + OUT in the same JSON).
 * Index: { firebaseUid: 1, date: -1 } on attendance_sessions.
 */
export async function GET(request: Request) {
  const auth = await requireAttendanceAuth(request)
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const dateFilter = searchParams.get("date")?.trim()
  const fromParam = searchParams.get("from")?.trim()
  const toParam = searchParams.get("to")?.trim()
  const windowDaysRaw = searchParams.get("windowDays")

  if (dateFilter && !isYmd(dateFilter)) {
    return NextResponse.json(
      { error: "Invalid date (use YYYY-MM-DD)" },
      { status: 400 },
    )
  }

  if (fromParam && !isYmd(fromParam)) {
    return NextResponse.json(
      { error: "Invalid from (use YYYY-MM-DD)" },
      { status: 400 },
    )
  }

  if (toParam && !isYmd(toParam)) {
    return NextResponse.json(
      { error: "Invalid to (use YYYY-MM-DD)" },
      { status: 400 },
    )
  }

  if (fromParam && toParam && fromParam > toParam) {
    return NextResponse.json(
      { error: "from must be on or before to" },
      { status: 400 },
    )
  }

  let windowDays = DEFAULT_WINDOW_DAYS
  if (windowDaysRaw !== null && windowDaysRaw !== "") {
    const n = Number.parseInt(windowDaysRaw, 10)
    if (!Number.isFinite(n) || n < 1 || n > MAX_WINDOW_DAYS) {
      return NextResponse.json(
        { error: `windowDays must be 1–${MAX_WINDOW_DAYS}` },
        { status: 400 },
      )
    }
    windowDays = n
  }

  if (fromParam && toParam) {
    const spanMs =
      Date.parse(`${toParam}T12:00:00Z`) - Date.parse(`${fromParam}T12:00:00Z`)
    const spanDays = spanMs / 86400000
    if (spanDays > MAX_CUSTOM_RANGE_DAYS) {
      return NextResponse.json(
        {
          error: `Date range cannot exceed ${MAX_CUSTOM_RANGE_DAYS} days`,
        },
        { status: 400 },
      )
    }
  }

  const tz = process.env.ATTENDANCE_TIMEZONE ?? "Asia/Manila"
  const now = new Date()
  const todayYmd = formatYmdInTz(now, tz)

  let rangeFrom: string
  let rangeTo: string
  let rangeMode: "single" | "custom" | "rolling"

  if (dateFilter) {
    rangeFrom = dateFilter
    rangeTo = dateFilter
    rangeMode = "single"
  } else if (fromParam && toParam) {
    rangeFrom = fromParam
    rangeTo = toParam
    rangeMode = "custom"
  } else {
    const startAnchor = new Date(now.getTime() - windowDays * 86400000)
    rangeFrom = formatYmdInTz(startAnchor, tz)
    rangeTo = todayYmd
    rangeMode = "rolling"
  }

  const match: Document = {
    firebaseUid: auth.user.firebaseUid,
    date: { $gte: rangeFrom, $lte: rangeTo },
  }

  try {
    const client = await getMongoClientPromise()
    const db = client.db(getAttendanceDbName())
    const coll = db.collection(ATTENDANCE_SESSIONS_COLLECTION)

    const docs = await coll
      .find(match)
      .sort({ date: -1, createdAt: -1 })
      .limit(MAX_SESSION_ROWS)
      .toArray()

    const rows = docs.map((d) => ({
      date: d.date as string,
      timeIn: (d.timeIn as string) ?? null,
      timeOut: (d.timeOut as string | null | undefined) ?? null,
      sessionId: String(d._id),
      locationIn:
        parseAttendanceLocationPayload(d.locationIn) ??
        null,
      locationOut:
        parseAttendanceLocationPayload(d.locationOut) ??
        null,
    }))

    return NextResponse.json({
      rows,
      range: {
        mode: rangeMode,
        from: rangeFrom,
        to: rangeTo,
        windowDays: rangeMode === "rolling" ? windowDays : undefined,
      },
    })
  } catch (e) {
    console.error("[api/attendance/logs]", e)
    return NextResponse.json(
      { error: "Failed to load attendance logs" },
      { status: 500 },
    )
  }
}
