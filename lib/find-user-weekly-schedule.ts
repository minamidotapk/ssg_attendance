import type { Db } from "mongodb"
import {
  USER_WEEKLY_SCHEDULES_COLLECTION,
  type UserWeeklyScheduleDoc,
} from "@/lib/schedule-collections"

/**
 * Resolve a personal weekly schedule row by Firebase uid (document _id or field)
 * or case-insensitive email — fixes mismatches between Auth and Mongo.
 */
export async function findUserWeeklyScheduleDoc(
  db: Db,
  firebaseUid: string,
  email: string,
): Promise<UserWeeklyScheduleDoc | null> {
  const coll = db.collection<UserWeeklyScheduleDoc>(
    USER_WEEKLY_SCHEDULES_COLLECTION,
  )

  const byId = await coll.findOne({ _id: firebaseUid })
  if (byId) return byId

  const byUidField = await coll.findOne({ firebaseUid })
  if (byUidField) return byUidField

  const el = email.trim().toLowerCase()
  if (!el) return null

  const byEmail = await coll.findOne({
    $expr: { $eq: [{ $toLower: "$email" }, el] },
  })
  return byEmail ?? null
}
