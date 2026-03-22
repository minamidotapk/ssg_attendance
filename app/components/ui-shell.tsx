"use client"

import { ReactNode, useCallback, useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
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
  const pathname = usePathname()
  const [userEmail, setUserEmail] = useState<string | null>(
    () => auth.currentUser?.email ?? null,
  )
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isRoleLoading, setIsRoleLoading] = useState(true)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

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

  useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileNavOpen) {
      return
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileNavOpen])

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
      <div className="relative flex min-h-screen flex-col bg-gray-100 md:flex-row">
        {mobileNavOpen ? (
          <div
            className="fixed inset-x-0 bottom-0 top-14 z-40 bg-black/40 md:hidden"
            aria-hidden
            onClick={() => setMobileNavOpen(false)}
            role="presentation"
          />
        ) : null}

        <UiSidebar
          id="main-nav"
          userEmail={userEmail}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
          isAdmin={isAdmin}
          isRoleLoading={isRoleLoading}
          mobileOpen={mobileNavOpen}
          onNavigate={() => setMobileNavOpen(false)}
        />

        <header className="fixed left-0 right-0 top-0 z-[60] flex h-14 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 shadow-sm md:hidden">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-gray-800 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600"
            aria-controls="main-nav"
            aria-expanded={mobileNavOpen}
            aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            {mobileNavOpen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
          <span className="text-sm font-semibold text-gray-900">SSG Portal</span>
        </header>

        <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col px-4 pb-4 pt-14 sm:px-6 sm:pb-6 md:px-6 md:pb-6 md:pt-6">
          <section className="mx-auto w-full min-w-0 flex-1 rounded-lg bg-white p-4 sm:p-6">
            <AttendanceLogLiveVersionProvider>
              {children}
            </AttendanceLogLiveVersionProvider>
          </section>
        </main>
      </div>
    </UiRoleProvider>
  )
}
