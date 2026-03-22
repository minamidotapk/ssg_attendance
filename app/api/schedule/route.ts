import { NextResponse } from "next/server"
import type { WeeklyScheduleHours } from "@/lib/schedule-types"
import { requireAttendanceAuth } from "@/lib/attendance-auth"
import {
  SCHEDULE_SETTINGS_COLLECTION,
  SCHEDULE_WEEKLY_DOC_ID,
  type ScheduleSettingsDoc,
} from "@/lib/schedule-collections"
import { getAttendanceDbName, getMongoClientPromise } from "@/lib/mongodb"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const auth = await requireAttendanceAuth(request)
  if (!auth.ok) return auth.response

  try {
    const client = await getMongoClientPromise()
    const db = client.db(getAttendanceDbName())
    const coll = db.collection<ScheduleSettingsDoc>(SCHEDULE_SETTINGS_COLLECTION)
    const doc = await coll.findOne({ _id: SCHEDULE_WEEKLY_DOC_ID })

    return NextResponse.json({
      hours: (doc?.hours ?? {}) as WeeklyScheduleHours,
    })
  } catch (e) {
    console.error("[api/schedule GET]", e)
    return NextResponse.json(
      { error: "Failed to load schedule" },
      { status: 500 },
    )
  }
}
