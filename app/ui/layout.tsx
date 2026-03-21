"use client"

import { ReactNode, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "../../firebase.config"
import { Spinner } from "@/app/components/spinner"
import { UiShell } from "@/app/components/ui-shell"

type UiLayoutProps = {
  children: ReactNode
}

export default function UiLayout({ children }: UiLayoutProps) {
  const router = useRouter()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/")
      } else {
        setIsCheckingAuth(false)
      }
    })

    return () => unsubscribe()
  }, [router])

  if (isCheckingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
        <Spinner />
      </main>
    )
  }

  return <UiShell>{children}</UiShell>
}
