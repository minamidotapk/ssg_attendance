import { NextResponse } from "next/server"
import { Binary, ReturnDocument, type Document } from "mongodb"
import {
  parseAttendanceLocationPayload,
  type AttendanceLocation,
} from "@/lib/attendance-location"
import { reverseGeocodeToPhPlace } from "@/lib/reverse-geocode-nominatim"
import { requireAttendanceAuth } from "@/lib/attendance-auth"
import { ATTENDANCE_SESSIONS_COLLECTION } from "@/lib/attendance-collections"
import { logRouteError } from "@/lib/api-route-errors"
import { autoClockOutOpenSessionIfNeeded } from "@/lib/attendance-auto-clockout"
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

async function buildStoredLocation(
  loc: NonNullable<ReturnType<typeof parseAttendanceLocationPayload>>,
): Promise<AttendanceLocation> {
  const place = await reverseGeocodeToPhPlace(loc.latitude, loc.longitude)
  return {
    latitude: loc.latitude,
    longitude: loc.longitude,
    accuracy: loc.accuracy,
    barangay: place.barangay,
    municipality: place.municipality,
    province: place.province,
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAttendanceAuth(request)
    if (!auth.ok) return auth.response

    const { email, firebaseUid } = auth.user

    const body = (await request.json()) as {
      kind?: string
      imageBase64?: string
      location?: unknown
    }

    const kind = body.kind
    const imageBase64 = body.imageBase64
    const location = parseAttendanceLocationPayload(body.location)

    if (kind !== "in" && kind !== "out") {
      return NextResponse.json(
        { error: 'kind must be "in" or "out"' },
        { status: 400 },
      )
    }

    const now = new Date()
    const tz = process.env.ATTENDANCE_TIMEZONE ?? "Asia/Manila"
    const { date, time } = formatDateTimeInZone(now, tz)

    const client = await getMongoClientPromise()
    const db = client.db(getAttendanceDbName())
    const coll = db.collection(ATTENDANCE_SESSIONS_COLLECTION)
    await autoClockOutOpenSessionIfNeeded(coll, firebaseUid, now, tz)

    if (kind === "in") {
      if (!location) {
        return NextResponse.json(
          {
            error:
              "Valid location is required (latitude and longitude). Allow location access and try again.",
          },
          { status: 400 },
        )
      }
      if (!imageBase64) {
        return NextResponse.json(
          { error: "imageBase64 is required" },
          { status: 400 },
        )
      }
      const payload = imageBase64.includes(",")
        ? imageBase64.slice(imageBase64.indexOf(",") + 1)
        : imageBase64
      let inBuffer: Buffer
      try {
        inBuffer = Buffer.from(payload, "base64")
      } catch {
        return NextResponse.json({ error: "Invalid image data" }, { status: 400 })
      }
      if (inBuffer.length === 0 || inBuffer.length > MAX_IMAGE_BYTES) {
        return NextResponse.json(
          { error: "Image is empty or too large" },
          { status: 413 },
        )
      }
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

      const locationDoc = await buildStoredLocation(location)
      const result = await coll.insertOne({
        email,
        firebaseUid,
        date,
        timeIn: time,
        imageIn: new Binary(inBuffer),
        contentTypeIn: "image/jpeg",
        locationIn: locationDoc,
        timeOut: null,
        imageOut: null,
        contentTypeOut: null,
        locationOut: null,
        createdAt: now,
        updatedAt: now,
      })

      return NextResponse.json({
        ok: true,
        id: result.insertedId.toString(),
        date,
        time,
        location: locationDoc,
      })
    }

    const openForOut = await coll.findOne(
      { firebaseUid, timeOut: null },
      { sort: { createdAt: -1 } },
    )
    if (!openForOut?._id) {
      return NextResponse.json(
        { error: "No open clock-in found. Clock in first." },
        { status: 400 },
      )
    }

    const canAutoOutWithoutProof = date > String(openForOut.date ?? "") || time >= "17:00:00"
    if (!location || !imageBase64) {
      if (!canAutoOutWithoutProof) {
        return NextResponse.json(
          {
            error:
              "Turn on camera and allow location before clocking out. Auto clock-out without photo/location is only after 5:00 PM.",
          },
          { status: 400 },
        )
      }

      await coll.updateOne(
        { _id: openForOut._id, firebaseUid, timeOut: null },
        {
          $set: {
            timeOut: "17:00:00",
            imageOut: null,
            contentTypeOut: null,
            locationOut: null,
            autoClockedOut: true,
            updatedAt: now,
          },
        },
      )
      return NextResponse.json({
        ok: true,
        id: String(openForOut._id),
        date: String(openForOut.date ?? date),
        time: "17:00:00",
      })
    }

    let buffer: Buffer
    try {
      const payload = imageBase64.includes(",")
        ? imageBase64.slice(imageBase64.indexOf(",") + 1)
        : imageBase64
      buffer = Buffer.from(payload, "base64")
    } catch {
      return NextResponse.json({ error: "Invalid image data" }, { status: 400 })
    }
    if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Image is empty or too large" },
        { status: 413 },
      )
    }
    const locationDoc = await buildStoredLocation(location)

    const updated = await coll.findOneAndUpdate(
      { _id: openForOut._id, firebaseUid, timeOut: null },
      {
        $set: {
          timeOut: time,
          imageOut: new Binary(buffer),
          contentTypeOut: "image/jpeg",
          locationOut: locationDoc,
          autoClockedOut: false,
          updatedAt: now,
        },
      },
      { returnDocument: ReturnDocument.AFTER },
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
      location: locationDoc,
    })
  } catch (e) {
    return NextResponse.json(
      { error: logRouteError("api/attendance POST", e) },
      { status: 500 },
    )
  }
}
