"use client"

import { ReactNode, useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { auth } from "@/firebase.config"
import { UiSidebar } from "@/app/components/ui-sidebar"
import { AttendanceLogLiveVersionProvider } from "@/app/context/attendance-log-live-version"
import { UiRoleProvider } from "@/app/context/ui-role-context"

type UiShellProps = {
  children: ReactNode
}

export function UiShell({ children }: UiShellProps) {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(
    () => auth.currentUser?.email ?? null,
  )
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isRoleLoading, setIsRoleLoading] = useState(true)

  const refreshRole = useCallback(async (user: typeof auth.currentUser) => {
    if (!user) {
      setIsAdmin(false)
      setIsRoleLoading(false)
      return
    }
    setIsRoleLoading(true)
    try {
      const idToken = await user.getIdToken()
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${idToken}` },
      })
      if (!res.ok) {
        setIsAdmin(false)
        return
      }
      const data = (await res.json()) as { isAdmin?: boolean }
      setIsAdmin(Boolean(data.isAdmin))
    } catch {
      setIsAdmin(false)
    } finally {
      setIsRoleLoading(false)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserEmail(user?.email ?? null)
      void refreshRole(user)
    })
    return () => unsubscribe()
  }, [refreshRole])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await signOut(auth)
      router.replace("/")
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <UiRoleProvider value={{ isAdmin, isRoleLoading }}>
      <div className="flex min-h-screen bg-gray-100">
        <UiSidebar
          userEmail={userEmail}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
          isAdmin={isAdmin}
          isRoleLoading={isRoleLoading}
        />

        <main className="flex flex-1 flex-col p-6">
          <section className="mx-auto w-full flex-1 rounded-lg bg-white p-6 ">
            <AttendanceLogLiveVersionProvider>
              {children}
            </AttendanceLogLiveVersionProvider>
          </section>
        </main>
      </div>
    </UiRoleProvider>
  )
}
