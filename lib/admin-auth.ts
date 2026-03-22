import { NextResponse } from "next/server"
import { isAdminEmail } from "@/lib/admin"
import {
  requireAttendanceAuth,
  type AttendanceAuthedUser,
} from "@/lib/attendance-auth"

export async function requireAdminAuth(
  request: Request,
): Promise<
  | { ok: true; user: AttendanceAuthedUser }
  | { ok: false; response: NextResponse }
> {
  const auth = await requireAttendanceAuth(request)
  if (!auth.ok) return auth
  if (!isAdminEmail(auth.user.email)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Admin access required." },
        { status: 403 },
      ),
    }
  }
  return { ok: true, user: auth.user }
}
