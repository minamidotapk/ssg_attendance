"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

import ssgLogo from "@/app/assets/ssg.png"
import { Spinner } from "@/app/components/spinner"

export type UiSidebarSection = "attendance" | "attendance-log" | "schedule"

export const UI_SIDEBAR_ITEMS: ReadonlyArray<{
  id: UiSidebarSection
  label: string
  href: string
}> = [
  { id: "attendance", label: "Attendance", href: "/ui/attendance" },
  { id: "attendance-log", label: "Attendance Log", href: "/ui/attendance-log" },
  { id: "schedule", label: "Schedule", href: "/ui/schedule" },
]

/** Items for non-admin users. Admins only use Attendance (see product rules). */
export function getUiSidebarItemsForUser(isAdmin: boolean) {
  if (isAdmin) {
    return UI_SIDEBAR_ITEMS.filter((item) => item.id === "attendance")
  }
  return UI_SIDEBAR_ITEMS
}

type UiSidebarProps = {
  id?: string
  /** Shown in the sidebar footer (e.g. signed-in user email) */
  userEmail?: string | null
  onLogout?: () => void | Promise<void>
  isLoggingOut?: boolean
  /** When true, only Attendance is shown in the nav. */
  isAdmin?: boolean
  /** While true, nav links are deferred to avoid the wrong set flashing. */
  isRoleLoading?: boolean
  /** Narrow viewports: when true, slide-in drawer is visible. Ignored at md and up. */
  mobileOpen?: boolean
  /** Called after nav link press (e.g. close mobile drawer). */
  onNavigate?: () => void
  className?: string
}

/**
 * Reusable vertical sidebar for the authenticated UI shell.
 * Navigates via Next.js routes; active item follows the current pathname.
 */
export function UiSidebar({
  id,
  userEmail = null,
  onLogout,
  isLoggingOut = false,
  isAdmin = false,
  isRoleLoading = false,
  mobileOpen = false,
  onNavigate,
  className = "",
}: UiSidebarProps) {
  const pathname = usePathname()
  const displayEmail = userEmail?.trim() || null
  const navItems = getUiSidebarItemsForUser(isAdmin)

  return (
    <aside
      id={id}
      className={`flex w-80 shrink-0 flex-col border-r border-gray-200 bg-gradient-to-b from-white to-gray-50/80 p-4 shadow-sm max-md:fixed max-md:bottom-0 max-md:left-0 max-md:top-14 max-md:z-50 max-md:shadow-xl max-md:transition-transform max-md:duration-200 max-md:ease-out md:static md:z-auto md:min-h-screen ${
        mobileOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full"
      } ${className}`}
      aria-label="Main navigation"
    >
      <header className="border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <Image src={ssgLogo} alt="SSG Logo" width={40} height={40} />
          <div>
            <p className="mt-1.5 text-small leading-snug text-gray-800">
              Supreme Student Government
            </p>
            <h1 className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-cyan-700">
              A.Y. 2025–2026
            </h1>
          </div>
        </div>
      </header>

      <nav
        className="flex flex-1 flex-col gap-2 py-5"
        role="navigation"
        aria-label="Sections"
      >
        {isRoleLoading ? (
          <div
            className="flex justify-center py-6"
            aria-busy="true"
            aria-label="Loading navigation"
          >
            <Spinner />
          </div>
        ) : (
          navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href === "/ui/attendance" && pathname === "/ui")
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => onNavigate?.()}
                className={`rounded-md px-4 py-3 text-left text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2 ${
                  isActive
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "bg-cyan-600/20 text-gray-900 hover:bg-cyan-600/50"
                }`}
              >
                {item.label}
              </Link>
            )
          })
        )}
      </nav>

      <footer className="mt-auto border-t border-gray-100 pt-4">
        <p className="text-[0.65rem] font-medium uppercase tracking-wide text-gray-400">
          Signed in as
        </p>
        {displayEmail ? (
          <p
            className="mt-1 truncate text-sm font-medium text-gray-800"
            title={displayEmail}
          >
            {displayEmail}
          </p>
        ) : (
          <p className="mt-1 text-sm italic text-gray-400">No email on file</p>
        )}
        {onLogout ? (
          <button
            type="button"
            onClick={() => {
              onNavigate?.()
              void onLogout()
            }}
            disabled={isLoggingOut}
            className="mt-4 w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-400"
          >
            {isLoggingOut ? <Spinner /> : "Logout"}
          </button>
        ) : null}
      </footer>
    </aside>
  )
}
