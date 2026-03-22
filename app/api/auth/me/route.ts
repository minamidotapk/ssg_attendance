import { NextResponse } from "next/server"
import { isAdminEmail } from "@/lib/admin"
import { requireAttendanceAuth } from "@/lib/attendance-auth"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const auth = await requireAttendanceAuth(request)
  if (!auth.ok) return auth.response

  const { email } = auth.user
  return NextResponse.json({
    email,
    isAdmin: isAdminEmail(email),
  })
}
