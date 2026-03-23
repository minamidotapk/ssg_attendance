"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUiRole } from "@/app/context/ui-role-context"
import { Spinner } from "@/app/components/spinner"

/**
 * /ui → students default to Attendance; admins default to Attendance Log.
 */
export default function UiIndexPage() {
  const router = useRouter()
  const { isAdmin, isRoleLoading } = useUiRole()

  useEffect(() => {
    if (isRoleLoading) return
    router.replace(isAdmin ? "/ui/attendance-log" : "/ui/attendance")
  }, [isAdmin, isRoleLoading, router])

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner />
    </div>
  )
}
