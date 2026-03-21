"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Spinner } from "@/app/components/spinner"

/**
 * /ui → send users to the default area (Attendance).
 */
export default function UiIndexPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/ui/attendance")
  }, [router])

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner />
    </div>
  )
}
