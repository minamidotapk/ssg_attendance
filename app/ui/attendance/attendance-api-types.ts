export type AttendancePostResponse = {
  error?: string
  ok?: boolean
  /** Session document id (Mongo ObjectId string). */
  id?: string
  date?: string
  time?: string
}
