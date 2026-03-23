import { NextResponse } from "next/server"
import { requireAdminAuth } from "@/lib/admin-auth"
import { getFirebaseAdminAuth } from "@/lib/firebase-admin"
import { parseWeeklyScheduleBody } from "@/lib/schedule-validate"
import {
  SCHEDULE_SETTINGS_COLLECTION,
  SCHEDULE_WEEKLY_DOC_ID,
  USER_WEEKLY_SCHEDULES_COLLECTION,
  type ScheduleSettingsDoc,
  type UserWeeklyScheduleDoc,
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

type ScheduleTarget =
  | { kind: "global" }
  | { kind: "user"; firebaseUid: string; email: string }
  | { kind: "users"; entries: { firebaseUid: string; email: string }[] }

function parseTarget(body: Record<string, unknown>): ScheduleTarget | null {
  const t = body.target
  if (
    t === undefined ||
    t === null ||
    t === "global" ||
    (typeof t === "string" && t.trim().toLowerCase() === "global")
  ) {
    return { kind: "global" }
  }
  if (typeof t !== "object" || t === null) return null
  const o = t as { firebaseUid?: unknown; email?: unknown; users?: unknown }

  if (Array.isArray(o.users) && o.users.length > 0) {
    const entries: { firebaseUid: string; email: string }[] = []
    for (const item of o.users) {
      if (typeof item !== "object" || item === null) return null
      const u = item as { firebaseUid?: unknown; email?: unknown }
      const uid = typeof u.firebaseUid === "string" ? u.firebaseUid.trim() : ""
      const email = typeof u.email === "string" ? u.email.trim() : ""
      if (uid) {
        entries.push({ firebaseUid: uid, email: email || uid })
      } else if (email) {
        entries.push({ firebaseUid: "", email })
      } else {
        return null
      }
    }
    return { kind: "users", entries }
  }

  const uid = typeof o.firebaseUid === "string" ? o.firebaseUid.trim() : ""
  const email = typeof o.email === "string" ? o.email.trim() : ""
  if (uid) {
    return { kind: "user", firebaseUid: uid, email: email || uid }
  }
  if (email) {
    return { kind: "user", firebaseUid: "", email }
  }
  return null
}

async function resolveUserTarget(t: {
  kind: "user"
  firebaseUid: string
  email: string
}): Promise<{ firebaseUid: string; email: string } | null> {
  const auth = getFirebaseAdminAuth()
  if (t.firebaseUid) {
    try {
      const u = await auth.getUser(t.firebaseUid)
      return { firebaseUid: u.uid, email: u.email ?? t.email }
    } catch {
      return null
    }
  }
  if (t.email) {
    try {
      const u = await auth.getUserByEmail(t.email)
      return { firebaseUid: u.uid, email: u.email ?? t.email }
    } catch {
      return null
    }
  }
  return null
}

/** Load global or a user’s saved weekly windows (for admin editor). */
export async function GET(request: Request) {
  const auth = await requireAdminAuth(request)
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const scope = searchParams.get("scope") ?? "global"
  const uidParam = searchParams.get("firebaseUid")?.trim() ?? ""

  try {
    const client = await getMongoClientPromise()
    const db = client.db(getAttendanceDbName())

    if (scope === "user") {
      if (!uidParam) {
        return NextResponse.json(
          { error: "firebaseUid query required when scope=user" },
          { status: 400 },
        )
      }
      const globalColl = db.collection<ScheduleSettingsDoc>(
        SCHEDULE_SETTINGS_COLLECTION,
      )
      const globalDoc = await globalColl.findOne({ _id: SCHEDULE_WEEKLY_DOC_ID })
      const globalHours = normalizeWeeklyHoursFromStored(globalDoc?.hours ?? {})

      let emailForLookup = ""
      try {
        const u = await getFirebaseAdminAuth().getUser(uidParam)
        emailForLookup = u.email ?? ""
      } catch {
        /* unknown uid */
      }
      const doc = await findUserWeeklyScheduleDoc(
        db,
        uidParam,
        emailForLookup,
      )
      const email = doc?.email ?? emailForLookup
      const personalNorm = normalizeWeeklyHoursFromStored(doc?.hours ?? {})
      const hours = personalScheduleHasAnyWindow(personalNorm)
        ? mergePersonalScheduleOverGlobal(globalHours, personalNorm)
        : globalHours
      return NextResponse.json({
        scope: "user" as const,
        firebaseUid: uidParam,
        email,
        hours,
      })
    }

    const globalColl = db.collection<ScheduleSettingsDoc>(SCHEDULE_SETTINGS_COLLECTION)
    const globalDoc = await globalColl.findOne({ _id: SCHEDULE_WEEKLY_DOC_ID })
    return NextResponse.json({
      scope: "global" as const,
      hours: normalizeWeeklyHoursFromStored(globalDoc?.hours ?? {}),
    })
  } catch (e) {
    return NextResponse.json(
      { error: logRouteError("api/admin/schedule GET", e) },
      { status: 500 },
    )
  }
}

/** Save global default or a specific user’s weekly windows (multiple segments per day allowed). */
export async function PUT(request: Request) {
  const auth = await requireAdminAuth(request)
  if (!auth.ok) return auth.response

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const hours = parseWeeklyScheduleBody(body)
  if (hours === null) {
    return NextResponse.json(
      {
        error:
          "Invalid hours. Each day is an array of { open, close } in HH:mm (open < close), or one legacy object per day.",
      },
      { status: 400 },
    )
  }

  const targetRaw = parseTarget(body)
  if (!targetRaw) {
    return NextResponse.json(
      {
        error:
          'Invalid target. Use target: "global", { firebaseUid } / { email }, or { users: [{ firebaseUid } | { email }, ...] }.',
      },
      { status: 400 },
    )
  }

  try {
    const client = await getMongoClientPromise()
    const db = client.db(getAttendanceDbName())
    const now = new Date()

    if (targetRaw.kind === "global") {
      const coll = db.collection<ScheduleSettingsDoc>(SCHEDULE_SETTINGS_COLLECTION)
      await coll.updateOne(
        { _id: SCHEDULE_WEEKLY_DOC_ID },
        { $set: { hours, updatedAt: now, updatedByEmail: auth.user.email } },
        { upsert: true },
      )
      return NextResponse.json({ ok: true, hours, scope: "global" as const })
    }

    const userColl = db.collection<UserWeeklyScheduleDoc>(
      USER_WEEKLY_SCHEDULES_COLLECTION,
    )

    const toResolve =
      targetRaw.kind === "user"
        ? [targetRaw]
        : targetRaw.entries.map((e) => ({ kind: "user" as const, ...e }))

    const resolvedList: { firebaseUid: string; email: string }[] = []
    for (const entry of toResolve) {
      const resolved = await resolveUserTarget(entry)
      if (!resolved) {
        return NextResponse.json(
          {
            error:
              targetRaw.kind === "users"
                ? "One or more users were not found (check firebaseUid / email)."
                : "User not found for target email or firebaseUid.",
          },
          { status: 404 },
        )
      }
      resolvedList.push(resolved)
    }

    const seen = new Set<string>()
    const uniqueResolved = resolvedList.filter((r) => {
      if (seen.has(r.firebaseUid)) return false
      seen.add(r.firebaseUid)
      return true
    })

    for (const resolved of uniqueResolved) {
      await userColl.updateOne(
        { _id: resolved.firebaseUid },
        {
          $set: {
            firebaseUid: resolved.firebaseUid,
            email: resolved.email,
            hours,
            updatedAt: now,
            updatedByEmail: auth.user.email,
          },
        },
        { upsert: true },
      )
    }

    if (targetRaw.kind === "user") {
      const resolved = uniqueResolved[0]!
      return NextResponse.json({
        ok: true,
        hours,
        scope: "user" as const,
        firebaseUid: resolved.firebaseUid,
        email: resolved.email,
      })
    }

    return NextResponse.json({
      ok: true,
      hours,
      scope: "users" as const,
      count: uniqueResolved.length,
      users: uniqueResolved.map((r) => ({
        firebaseUid: r.firebaseUid,
        email: r.email,
      })),
    })
  } catch (e) {
    return NextResponse.json(
      { error: logRouteError("api/admin/schedule PUT", e) },
      { status: 500 },
    )
  }
}

/** Remove a user’s custom weekly schedule (they fall back to global). */
export async function DELETE(request: Request) {
  const auth = await requireAdminAuth(request)
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const singleUid = searchParams.get("firebaseUid")?.trim() ?? ""
  const multiRaw = searchParams.get("firebaseUids")?.trim() ?? ""
  const uids = multiRaw
    ? multiRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : singleUid
      ? [singleUid]
      : []

  if (uids.length === 0) {
    return NextResponse.json(
      {
        error:
          "Query firebaseUid=… or firebaseUids=uid1,uid2,… is required.",
      },
      { status: 400 },
    )
  }

  try {
    const client = await getMongoClientPromise()
    const db = client.db(getAttendanceDbName())
    const userColl = db.collection<UserWeeklyScheduleDoc>(
      USER_WEEKLY_SCHEDULES_COLLECTION,
    )
    const result = await userColl.deleteMany({ _id: { $in: uids } })
    return NextResponse.json({ ok: true, deletedCount: result.deletedCount })
  } catch (e) {
    return NextResponse.json(
      { error: logRouteError("api/admin/schedule DELETE", e) },
      { status: 500 },
    )
  }
}
