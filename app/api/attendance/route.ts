import { NextResponse } from "next/server"
import { Binary, ReturnDocument, type Document } from "mongodb"
import { requireAttendanceAuth } from "@/lib/attendance-auth"
import { ATTENDANCE_SESSIONS_COLLECTION } from "@/lib/attendance-collections"
import {
  getAttendanceDbName,
  getMongoClientPromise,
} from "@/lib/mongodb"

export const runtime = "nodejs"

const MAX_IMAGE_BYTES = 4 * 1024 * 1024

function formatDateTimeInZone(now: Date, timeZone: string) {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)

  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now)

  return { date, time }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAttendanceAuth(request)
    if (!auth.ok) return auth.response

    const { email, firebaseUid } = auth.user

    const body = (await request.json()) as {
      kind?: string
      imageBase64?: string
    }

    const kind = body.kind
    const imageBase64 = body.imageBase64

    if (!imageBase64) {
      return NextResponse.json(
        { error: "imageBase64 is required" },
        { status: 400 },
      )
    }

    if (kind !== "in" && kind !== "out") {
      return NextResponse.json(
        { error: 'kind must be "in" or "out"' },
        { status: 400 },
      )
    }

    const base64Payload = imageBase64.includes(",")
      ? imageBase64.slice(imageBase64.indexOf(",") + 1)
      : imageBase64

    let buffer: Buffer
    try {
      buffer = Buffer.from(base64Payload, "base64")
    } catch {
      return NextResponse.json({ error: "Invalid image data" }, { status: 400 })
    }

    if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Image is empty or too large" },
        { status: 413 },
      )
    }

    const now = new Date()
    const tz = process.env.ATTENDANCE_TIMEZONE ?? "Asia/Manila"
    const { date, time } = formatDateTimeInZone(now, tz)

    const client = await getMongoClientPromise()
    const db = client.db(getAttendanceDbName())
    const coll = db.collection(ATTENDANCE_SESSIONS_COLLECTION)

    if (kind === "in") {
      const open = await coll.findOne({
        firebaseUid,
        timeOut: null,
      })
      if (open) {
        return NextResponse.json(
          {
            error:
              "You already clocked in. Clock out first before clocking in again.",
          },
          { status: 409 },
        )
      }

      const result = await coll.insertOne({
        email,
        firebaseUid,
        date,
        timeIn: time,
        imageIn: new Binary(buffer),
        contentTypeIn: "image/jpeg",
        timeOut: null,
        imageOut: null,
        contentTypeOut: null,
        createdAt: now,
        updatedAt: now,
      })

      return NextResponse.json({
        ok: true,
        id: result.insertedId.toString(),
        date,
        time,
      })
    }

    const updated = await coll.findOneAndUpdate(
      { firebaseUid, timeOut: null },
      {
        $set: {
          timeOut: time,
          imageOut: new Binary(buffer),
          contentTypeOut: "image/jpeg",
          updatedAt: now,
        },
      },
      { sort: { createdAt: -1 }, returnDocument: ReturnDocument.AFTER },
    )

    /** Driver may return `ModifyResult` (`value`) or the document itself. */
    let after: Document | null = null
    if (updated && typeof updated === "object") {
      const u = updated as unknown as Record<string, unknown>
      if ("ok" in u && "value" in u) {
        after = (u.value as Document | null | undefined) ?? null
      } else if ("_id" in u) {
        after = updated as Document
      }
    }

    if (!after?._id) {
      return NextResponse.json(
        { error: "No open clock-in found. Clock in first." },
        { status: 400 },
      )
    }

    return NextResponse.json({
      ok: true,
      id: String(after._id),
      date,
      time,
    })
  } catch (e) {
    console.error("[api/attendance]", e)
    return NextResponse.json(
      { error: "Failed to save attendance" },
      { status: 500 },
    )
  }
}
