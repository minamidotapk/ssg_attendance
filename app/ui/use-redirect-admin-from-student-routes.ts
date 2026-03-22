"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUiRole } from "@/app/context/ui-role-context"

/**
 * Admins only use Attendance; redirect away from student-only areas.
 */
export function useRedirectAdminFromStudentRoutes() {
  const router = useRouter()
  const { isAdmin, isRoleLoading } = useUiRole()

  useEffect(() => {
    if (!isRoleLoading && isAdmin) {
      router.replace("/ui/attendance")
    }
  }, [isAdmin, isRoleLoading, router])

  return { showSpinner: isRoleLoading || isAdmin }
}
