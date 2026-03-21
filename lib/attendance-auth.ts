import { NextResponse } from "next/server"
import { getFirebaseAdminAuth } from "@/lib/firebase-admin"

export type AttendanceAuthedUser = { email: string; firebaseUid: string }

export async function requireAttendanceAuth(
  request: Request,
): Promise<
  | { ok: true; user: AttendanceAuthedUser }
  | { ok: false; response: NextResponse }
> {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Sign in required (missing Firebase token)." },
        { status: 401 },
      ),
    }
  }

  const idToken = authHeader.slice(7).trim()
  if (!idToken) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Sign in required (empty token)." },
        { status: 401 },
      ),
    }
  }

  try {
    const decoded = await getFirebaseAdminAuth().verifyIdToken(idToken)
    if (!decoded.email) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error:
              "Your account has no email on file. Use email/password sign-in for attendance.",
          },
          { status: 403 },
        ),
      }
    }
    return {
      ok: true,
      user: { email: decoded.email, firebaseUid: decoded.uid },
    }
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: unknown }).code)
        : ""
    console.error("[attendance-auth] verifyIdToken", code, err)

    if (code === "auth/id-token-expired") {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Your session expired. Please sign in again." },
          { status: 401 },
        ),
      }
    }

    if (
      code === "auth/argument-error" ||
      code === "auth/invalid-id-token" ||
      code === "auth/invalid-credential"
    ) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error:
              "Sign-in could not be verified. Sign out and sign in again. If this keeps happening, the Firebase service account JSON must be from the same Firebase project as NEXT_PUBLIC_FIREBASE_PROJECT_ID.",
          },
          { status: 401 },
        ),
      }
    }

    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid or expired session. Sign in again." },
        { status: 401 },
      ),
    }
  }
}
