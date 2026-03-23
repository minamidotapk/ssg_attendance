import { NextResponse } from "next/server"
import type { WeeklyScheduleHours } from "@/lib/schedule-types"
import { requireAttendanceAuth } from "@/lib/attendance-auth"
import {
  SCHEDULE_SETTINGS_COLLECTION,
  SCHEDULE_WEEKLY_DOC_ID,
  type ScheduleSettingsDoc,
} from "@/lib/schedule-collections"
import { logRouteError } from "@/lib/api-route-errors"
import { findUserWeeklyScheduleDoc } from "@/lib/find-user-weekly-schedule"
import { getAttendanceDbName, getMongoClientPromise } from "@/lib/mongodb"
import {
  mergePersonalScheduleOverGlobal,
  personalScheduleHasAnyWindow,
} from "@/lib/schedule-merge"
import { normalizeWeeklyHoursFromStored } from "@/lib/schedule-normalize"

export const runtime = "nodejs"

/**
 * Effective schedule for the signed-in user: personal override if present, else global default.
 */
export async function GET(request: Request) {
  const auth = await requireAttendanceAuth(request)
  if (!auth.ok) return auth.response

  try {
    const client = await getMongoClientPromise()
    const db = client.db(getAttendanceDbName())

    const globalColl = db.collection<ScheduleSettingsDoc>(SCHEDULE_SETTINGS_COLLECTION)
    const globalDoc = await globalColl.findOne({ _id: SCHEDULE_WEEKLY_DOC_ID })
    const globalHours = normalizeWeeklyHoursFromStored(globalDoc?.hours)

    const userDoc = await findUserWeeklyScheduleDoc(
      db,
      auth.user.firebaseUid,
      auth.user.email,
    )

    const personalNorm = normalizeWeeklyHoursFromStored(userDoc?.hours)
    const hasPersonalWindows = personalScheduleHasAnyWindow(personalNorm)

    let hours: WeeklyScheduleHours
    if (hasPersonalWindows) {
      hours = mergePersonalScheduleOverGlobal(globalHours, personalNorm)
    } else {
      hours = globalHours
    }

    return NextResponse.json({
      hours,
      source: hasPersonalWindows ? ("user" as const) : ("global" as const),
    })
  } catch (e) {
    return NextResponse.json(
      { error: logRouteError("api/schedule GET", e) },
      { status: 500 },
    )
  }
}
