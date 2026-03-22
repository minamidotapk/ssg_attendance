import { NextResponse } from "next/server"
import { Binary, ObjectId } from "mongodb"
import { requireAttendanceAuth } from "@/lib/attendance-auth"
import {
  ATTENDANCE_LOGS_LEGACY_COLLECTION,
  ATTENDANCE_SESSIONS_COLLECTION,
} from "@/lib/attendance-collections"
import { getAttendanceDbName, getMongoClientPromise } from "@/lib/mongodb"

export const runtime = "nodejs"

type Props = { params: Promise<{ id: string }> }

function bufferFromBinaryField(raw: unknown): Buffer | null {
  if (!raw) return null
  if (Buffer.isBuffer(raw)) return raw
  if (raw instanceof Binary) return Buffer.from(raw.buffer)
  const buf = (raw as { buffer?: ArrayBufferLike }).buffer
  if (buf) return Buffer.from(buf)
  return null
}

/**
 * Node `Buffer` is a valid fetch body at runtime; TS `BodyInit` does not list it.
 * `Blob` is typed as `BodyInit` and avoids copying the buffer.
 */
function bodyInitFromBuffer(buf: Buffer): Blob {
  return new Blob([buf as unknown as BlobPart])
}

export async function GET(request: Request, props: Props) {
  const auth = await requireAttendanceAuth(request)
  if (!auth.ok) return auth.response

  const { id } = await props.params
  if (!id || !ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid photo id" }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const sideRaw = searchParams.get("side")?.toLowerCase() ?? "in"
  if (sideRaw !== "in" && sideRaw !== "out") {
    return NextResponse.json(
      { error: 'side must be "in" or "out"' },
      { status: 400 },
    )
  }

  try {
    const client = await getMongoClientPromise()
    const db = client.db(getAttendanceDbName())
    const oid = new ObjectId(id)

    const sessionDoc = await db.collection(ATTENDANCE_SESSIONS_COLLECTION).findOne({
      _id: oid,
      firebaseUid: auth.user.firebaseUid,
    })

    if (sessionDoc) {
      if (sideRaw === "out" && !sessionDoc.timeOut) {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
      }
      const raw =
        sideRaw === "in" ? sessionDoc.imageIn : sessionDoc.imageOut
      const buf = bufferFromBinaryField(raw)
      if (!buf || buf.length === 0) {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
      }
      const contentType =
        (sideRaw === "in"
          ? sessionDoc.contentTypeIn
          : sessionDoc.contentTypeOut) ?? "image/jpeg"
      return new NextResponse(bodyInitFromBuffer(buf), {
        status: 200,
        headers: {
          "Content-Type": String(contentType),
          "Cache-Control": "private, max-age=3600",
        },
      })
    }

    const legacy = await db.collection(ATTENDANCE_LOGS_LEGACY_COLLECTION).findOne({
      _id: oid,
      firebaseUid: auth.user.firebaseUid,
    })

    if (legacy?.image) {
      const buf = bufferFromBinaryField(legacy.image)
      if (!buf || buf.length === 0) {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
      }
      const contentType =
        typeof legacy.contentType === "string" ? legacy.contentType : "image/jpeg"
      return new NextResponse(bodyInitFromBuffer(buf), {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "private, max-age=3600",
        },
      })
    }

    return NextResponse.json({ error: "Not found" }, { status: 404 })
  } catch (e) {
    console.error("[api/attendance/photo]", e)
    return NextResponse.json(
      { error: "Failed to load photo" },
      { status: 500 },
    )
  }
}
