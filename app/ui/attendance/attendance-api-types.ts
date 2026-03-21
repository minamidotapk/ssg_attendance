import type { AttendanceLocation } from "@/lib/attendance-location"

export type AttendancePostResponse = {
  error?: string
  ok?: boolean
  /** Session document id (Mongo ObjectId string). */
  id?: string
  date?: string
  time?: string
  /** Enriched place labels from server reverse geocode. */
  location?: AttendanceLocation
}
