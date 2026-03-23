import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"
import { getAnalytics } from "firebase/analytics"
import { getAuth, type Auth } from "firebase/auth"
import type { FirebaseWebConfig } from "@/lib/firebase-web-config"
import { getPlaceholderFirebaseConfig } from "@/lib/firebase-web-config"

let initPromise: Promise<void> | null = null
let app: FirebaseApp

/** Set after initFirebaseClient() resolves. Safe to use from any client code that runs under FirebaseProvider. */
export let auth = null as unknown as Auth

/** True when real project keys were loaded (not placeholders). */
export let isFirebaseClientConfigured = false

async function initFirebaseClientImpl(): Promise<void> {
  const res = await fetch("/api/firebase-public-config", { cache: "no-store" })
  const data: unknown = await res.json()

  let config: FirebaseWebConfig
  let configured: boolean

  if (
    res.ok &&
    data &&
    typeof data === "object" &&
    "ok" in data &&
    (data as { ok: unknown }).ok === true &&
    "config" in data &&
    (data as { config: unknown }).config &&
    typeof (data as { config: unknown }).config === "object"
  ) {
    config = (data as { config: FirebaseWebConfig }).config
    configured = true
  } else {
    config = getPlaceholderFirebaseConfig()
    configured = false
    if (typeof console !== "undefined") {
      console.warn(
        "[firebase] Missing or incomplete NEXT_PUBLIC_FIREBASE_* on the server. Using placeholders until env is set and the deployment is redeployed.",
      )
    }
  }

  isFirebaseClientConfigured = configured
  app = getApps().length ? getApp() : initializeApp(config)
  auth = getAuth(app)

  if (typeof window !== "undefined" && config.measurementId && configured) {
    try {
      getAnalytics(app)
    } catch (e) {
      console.warn("[firebase] Analytics disabled:", e)
    }
  }
}

/** Call once on the client before using `auth`. Idempotent. */
export async function initFirebaseClient(): Promise<void> {
  if (auth) {
    return
  }
  if (!initPromise) {
    initPromise = initFirebaseClientImpl().catch((e) => {
      initPromise = null
      throw e
    })
  }
  await initPromise
}
