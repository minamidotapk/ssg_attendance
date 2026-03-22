import { NextResponse } from "next/server"
import { requireAdminAuth } from "@/lib/admin-auth"
import { parseWeeklyScheduleBody } from "@/lib/schedule-validate"
import {
  SCHEDULE_SETTINGS_COLLECTION,
  SCHEDULE_WEEKLY_DOC_ID,
  type ScheduleSettingsDoc,
} from "@/lib/schedule-collections"
import { getAttendanceDbName, getMongoClientPromise } from "@/lib/mongodb"

export const runtime = "nodejs"

/** Admin publishes weekly open/close windows (shading on the student schedule grid). */
export async function PUT(request: Request) {
  const auth = await requireAdminAuth(request)
  if (!auth.ok) return auth.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const hours = parseWeeklyScheduleBody(body)
  if (hours === null) {
    return NextResponse.json(
      {
        error:
          "Invalid body. Send { hours: { Monday?: { open, close }, ... } } with times HH:mm (open < close).",
      },
      { status: 400 },
    )
  }

  try {
    const client = await getMongoClientPromise()
    const db = client.db(getAttendanceDbName())
    const coll = db.collection<ScheduleSettingsDoc>(SCHEDULE_SETTINGS_COLLECTION)
    const now = new Date()

    await coll.updateOne(
      { _id: SCHEDULE_WEEKLY_DOC_ID },
      { $set: { hours, updatedAt: now, updatedByEmail: auth.user.email } },
      { upsert: true },
    )

    return NextResponse.json({ ok: true, hours })
  } catch (e) {
    console.error("[api/admin/schedule PUT]", e)
    return NextResponse.json(
      { error: "Failed to save schedule" },
      { status: 500 },
    )
  }
}
