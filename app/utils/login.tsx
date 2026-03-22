import { ChangeEvent } from "react"

export const UI_ROUTE = "/ui"
export const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password."

/** Shown when NEXT_PUBLIC_FIREBASE_* were missing at build time (e.g. Vercel env not set before deploy). */
export const FIREBASE_NOT_CONFIGURED_MESSAGE =
  "Firebase client keys were missing when this site was built, so your password is never sent to your real project. In Vercel → Environment Variables, set every NEXT_PUBLIC_FIREBASE_* for Production, then redeploy."

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