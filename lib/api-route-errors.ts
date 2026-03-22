/**
 * Maps server errors to a safe client message. Logs full error server-side.
 */
export function logRouteError(routeLabel: string, err: unknown): string {
  console.error(`[${routeLabel}]`, err)

  const msg = err instanceof Error ? err.message : String(err)
  const lower = msg.toLowerCase()

  if (
    lower.includes("mongodb_uri") ||
    lower.includes("mongonetwork") ||
    lower.includes("mongoserver") ||
    lower.includes("enotfound") ||
    lower.includes("querysrv") ||
    lower.includes("authentication failed") ||
    lower.includes("bad auth") ||
    lower.includes("econnrefused") ||
    lower.includes("ssl")
  ) {
    return (
      "Database connection failed. In Vercel: confirm MONGODB_URI is set, MongoDB Atlas Network Access allows connections " +
      "(for serverless, often add 0.0.0.0/0), then redeploy."
    )
  }

  if (
    lower.includes("firebase admin") ||
    lower.includes("service_account") ||
    lower.includes("invalid_grant")
  ) {
    return (
      "Server auth misconfigured. Confirm FIREBASE_SERVICE_ACCOUNT_JSON in Vercel matches your Firebase project and redeploy."
    )
  }

  return "Server error. See Vercel function logs for details."
}
