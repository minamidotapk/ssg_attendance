"use client"

import { ReactNode, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { auth } from "@/firebase.config"
import { UiSidebar } from "@/app/components/ui-sidebar"

type UiShellProps = {
  children: ReactNode
}

export function UiShell({ children }: UiShellProps) {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(
    () => auth.currentUser?.email ?? null,
  )
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserEmail(user?.email ?? null)
    })
    return () => unsubscribe()
  }, [])

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
    <div className="flex min-h-screen bg-gray-100">
      <UiSidebar
        userEmail={userEmail}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />

      <main className="flex flex-1 flex-col p-6">
        <section className="mx-auto w-full flex-1 rounded-lg bg-white p-6 ">
          {children}
        </section>
      </main>
    </div>
  )
}
