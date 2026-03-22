/**
 * Server-side admin check. Keep in sync with optional ADMIN_EMAILS in .env
 * (comma-separated). Default includes the project admin account.
 */
const DEFAULT_ADMIN_EMAILS = new Set([
  "ssg20252026@gmail.com",
])

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function adminEmailsFromEnv(): Set<string> {
  const raw = process.env.ADMIN_EMAILS?.trim()
  if (!raw) return new Set()
  return new Set(
    raw
      .split(",")
      .map((s) => normalizeEmail(s))
      .filter(Boolean),
  )
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const n = normalizeEmail(email)
  if (DEFAULT_ADMIN_EMAILS.has(n)) return true
  return adminEmailsFromEnv().has(n)
}
