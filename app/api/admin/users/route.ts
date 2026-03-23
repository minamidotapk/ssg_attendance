import { NextResponse } from "next/server"
import { requireAdminAuth } from "@/lib/admin-auth"
import { getFirebaseAdminAuth } from "@/lib/firebase-admin"
import { logRouteError } from "@/lib/api-route-errors"

export const runtime = "nodejs"

const MAX_USERS = 500

/** List Firebase Auth users for schedule assignment (paginated listUsers). */
export async function GET(request: Request) {
  const auth = await requireAdminAuth(request)
  if (!auth.ok) return auth.response

  try {
    const adminAuth = getFirebaseAdminAuth()
    const list = await adminAuth.listUsers(MAX_USERS)
    const users = list.users
      .filter((u) => u.email)
      .map((u) => ({
        firebaseUid: u.uid,
        email: u.email as string,
        displayName: (u.displayName ?? "").trim(),
        photoURL: (u.photoURL ?? "").trim(),
      }))
      .sort((a, b) => a.email.localeCompare(b.email, undefined, { sensitivity: "base" }))

    return NextResponse.json({
      users,
      truncated: list.users.length >= MAX_USERS,
    })
  } catch (e) {
    return NextResponse.json(
      { error: logRouteError("api/admin/users GET", e) },
      { status: 500 },
    )
  }
}
