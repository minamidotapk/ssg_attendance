import { ChangeEvent } from "react"

export const UI_ROUTE = "/ui"
export const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password."

/** Shown when NEXT_PUBLIC_FIREBASE_* are missing on the server (e.g. not set in the host or not redeployed). */
export const FIREBASE_NOT_CONFIGURED_MESSAGE =
  "Firebase client keys are not available on this server. Set every NEXT_PUBLIC_FIREBASE_* in your host (for example Vercel → Environment Variables), redeploy so the server can read them, then refresh this page."

export type LoginFormState = {
  email: string
  password: string
}

export type LoginFieldProps = {
  id: "email" | "password"
  label: string
  type: "email" | "password"
  value: string
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
}

export function LoginField({ id, label, type, value, onChange }: LoginFieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        required
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 outline-none ring-blue-500 focus:ring-2"
      />
    </div>
  )
}