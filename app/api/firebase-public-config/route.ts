import { NextResponse } from "next/server"
import {
  buildFirebaseConfigFromEnv,
  getPlaceholderFirebaseConfig,
  REQUIRED_FIREBASE_OPTION_KEYS,
  ENV_NAMES,
  type FirebaseWebConfig,
} from "@/lib/firebase-web-config"

/**
 * Serves Firebase web client config from server env at request time.
 * Avoids relying on NEXT_PUBLIC_* values baked into the browser bundle at build time.
 */
export async function GET() {
  const { config: partial, missingKeys } = buildFirebaseConfigFromEnv()
  const allMissing = missingKeys.length === REQUIRED_FIREBASE_OPTION_KEYS.length

  if (allMissing) {
    return NextResponse.json(
      {
        ok: false as const,
        reason: "missing_all" as const,
        placeholder: getPlaceholderFirebaseConfig(),
      },
      { status: 503 },
    )
  }

  if (missingKeys.length > 0) {
    const missingEnvNames = missingKeys.map((k) => ENV_NAMES[k]).join(", ")
    return NextResponse.json(
      {
        ok: false as const,
        reason: "partial" as const,
        missingEnvNames,
      },
      { status: 503 },
    )
  }

  return NextResponse.json({ ok: true as const, config: partial as FirebaseWebConfig })
}
