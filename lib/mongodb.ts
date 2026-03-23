import { MongoClient, type MongoClientOptions } from "mongodb"

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

/** Strip whitespace and accidental wrapping quotes from Vercel / .env paste. */
function normalizeMongoUri(raw: string): string {
  let s = raw.trim()
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim()
  }
  return s
}

/** Tuned for Atlas + Vercel serverless (cold starts, short-lived instances). */
const MONGO_OPTIONS: MongoClientOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 25_000,
  connectTimeoutMS: 25_000,
  socketTimeoutMS: 45_000,
}

export function getMongoClientPromise(): Promise<MongoClient> {
  const raw = process.env.MONGODB_URI
  if (!raw) {
    throw new Error(
      "Missing MONGODB_URI. Add it to .env.local and Vercel project env.",
    )
  }
  const uri = normalizeMongoUri(raw)
  if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) {
    throw new Error(
      "MONGODB_URI must start with mongodb:// or mongodb+srv:// (check for stray quotes or spaces).",
    )
  }
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, MONGO_OPTIONS)
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
