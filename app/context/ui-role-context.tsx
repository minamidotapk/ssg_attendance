"use client"

import { createContext, useContext, type ReactNode } from "react"

type UiRoleContextValue = {
  /** True when signed-in user is an admin (server-verified). */
  isAdmin: boolean
  /** True until /api/auth/me has resolved for the current user. */
  isRoleLoading: boolean
}

const UiRoleContext = createContext<UiRoleContextValue | null>(null)

export function UiRoleProvider({
  children,
  value,
}: {
  children: ReactNode
  value: UiRoleContextValue
}) {
  return (
    <UiRoleContext.Provider value={value}>{children}</UiRoleContext.Provider>
  )
}

export function useUiRole() {
  const ctx = useContext(UiRoleContext)
  if (!ctx) {
    throw new Error("useUiRole must be used within UiRoleProvider")
  }
  return ctx
}
