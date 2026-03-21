import { useEffect, useState } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/firebase.config"
import { isUserClockedInStorage } from "@/lib/attendance-clock-storage"

/**
 * Syncs “clocked in” UI with sessionStorage + Firebase auth uid.
 */
export function useClockedInSession() {
  const [isClockedIn, setIsClockedIn] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user?.uid) {
        setIsClockedIn(false)
        return
      }
      try {
        setIsClockedIn(isUserClockedInStorage(user.uid))
      } catch {
        setIsClockedIn(false)
      }
    })
    return () => unsub()
  }, [])

  return { isClockedIn, setIsClockedIn }
}
