import fs from "node:fs"
import path from "node:path"
import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"

type ServiceAccountShape = {
  project_id: string
  client_email: string
  private_key: string
}

function credentialFromServiceAccount(o: ServiceAccountShape) {
  return cert({
    projectId: o.project_id,
    clientEmail: o.client_email,
    privateKey: o.private_key.replace(/\\n/g, "\n"),
  })
}

function parseServiceAccountFromEnv(): ServiceAccountShape | null {
  const jsonRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()
  if (!jsonRaw) return null
  try {
    const o = JSON.parse(jsonRaw) as ServiceAccountShape
    if (o.project_id && o.client_email && o.private_key) return o
  } catch {
    /* fall through to file */
  }
  return null
}

function loadServiceAccountFromFile(): ServiceAccountShape | null {
  const candidates = [
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    path.join(process.cwd(), "firebase-adminsdk.local.json"),
  ].filter(Boolean) as string[]

  for (const p of candidates) {
    const resolved = path.isAbsolute(p) ? p : path.join(process.cwd(), p)
    if (!fs.existsSync(resolved)) continue
    try {
      const raw = fs.readFileSync(resolved, "utf8")
      const o = JSON.parse(raw) as ServiceAccountShape
      if (o.project_id && o.client_email && o.private_key) return o
    } catch {
      /* try next */
    }
  }
  return null
}

function initFirebaseAdmin() {
  if (getApps().length > 0) return

  const fromEnv = parseServiceAccountFromEnv()
  const o = fromEnv ?? loadServiceAccountFromFile()

  if (o) {
    initializeApp({ credential: credentialFromServiceAccount(o) })
    return
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n")

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin: use a single-line FIREBASE_SERVICE_ACCOUNT_JSON, place firebase-adminsdk.local.json in the project root, set FIREBASE_SERVICE_ACCOUNT_PATH, or set FIREBASE_ADMIN_PROJECT_ID + FIREBASE_ADMIN_CLIENT_EMAIL + FIREBASE_ADMIN_PRIVATE_KEY.",
    )
  }

  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  })
}

export function getFirebaseAdminAuth() {
  initFirebaseAdmin()
  return getAuth()
}
