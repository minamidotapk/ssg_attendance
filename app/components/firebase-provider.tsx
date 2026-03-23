"use client"

import { ReactNode, useEffect, useState } from "react"
import { initFirebaseClient } from "@/firebase.config"
import { Spinner } from "@/app/components/spinner"

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    initFirebaseClient()
      .then(() => setReady(true))
      .catch((e: unknown) => {
        console.error(e)
        setLoadError(e instanceof Error ? e.message : "Could not load Firebase.")
      })
  }, [])

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-100 p-6 text-center">
        <p className="text-sm text-red-600">{loadError}</p>
        <button
          type="button"
          className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
          onClick={() => {
            setLoadError(null)
            setReady(false)
            initFirebaseClient()
              .then(() => setReady(true))
              .catch((e: unknown) => {
                setLoadError(e instanceof Error ? e.message : "Could not load Firebase.")
              })
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <Spinner />
      </div>
    )
  }

  return <>{children}</>
}
