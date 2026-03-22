import { MongoClient } from "mongodb"

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

export function getMongoClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error(
      "Missing MONGODB_URI. Add it to .env.local and Vercel project env.",
    )
  }
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri)
    global._mongoClientPromise = client.connect().catch((err: unknown) => {
      global._mongoClientPromise = undefined
      return Promise.reject(err)
    })
  }
  return global._mongoClientPromise
}

export function getAttendanceDbName() {
  return process.env.MONGODB_DB ?? "ssg_attendance"
}
