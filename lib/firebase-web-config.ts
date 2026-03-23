/** Public Firebase web app options (same names as Firebase JS SDK). */
export type FirebaseWebConfig = {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
  measurementId?: string
}

export const REQUIRED_FIREBASE_OPTION_KEYS = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
] as const

export const ENV_NAMES: Record<(typeof REQUIRED_FIREBASE_OPTION_KEYS)[number], string> = {
  apiKey: "NEXT_PUBLIC_FIREBASE_API_KEY",
  authDomain: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  projectId: "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  storageBucket: "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  appId: "NEXT_PUBLIC_FIREBASE_APP_ID",
}

/** Non-empty string or undefined (empty env values count as missing). */
export function readEnv(name: string): string | undefined {
  const v = process.env[name]
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined
}

export function buildFirebaseConfigFromEnv(): {
  config: Partial<FirebaseWebConfig>
  missingKeys: (typeof REQUIRED_FIREBASE_OPTION_KEYS)[number][]
} {
  const config: Partial<FirebaseWebConfig> = {
    apiKey: readEnv("NEXT_PUBLIC_FIREBASE_API_KEY"),
    authDomain: readEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    projectId: readEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    storageBucket: readEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: readEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
    appId: readEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
  }
  const measurementId = readEnv("NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID")
  if (measurementId) {
    config.measurementId = measurementId
  }
  const missingKeys = REQUIRED_FIREBASE_OPTION_KEYS.filter((k) => !config[k])
  return { config, missingKeys }
}

export function getPlaceholderFirebaseConfig(): FirebaseWebConfig {
  return {
    apiKey: "build-placeholder",
    authDomain: "build-placeholder.firebaseapp.com",
    projectId: "build-placeholder",
    storageBucket: "build-placeholder.appspot.com",
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:0000000000000000000000",
  }
}
