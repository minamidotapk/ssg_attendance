"use client"

import { ChangeEvent, FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "../firebase.config"

import { LoginField, LoginFormState, UI_ROUTE, INVALID_CREDENTIALS_MESSAGE } from "@/app/utils/login"
import { Spinner } from "@/app/components/spinner"

export default function Home() {
  const router = useRouter()
  const [formState, setFormState] = useState<LoginFormState>({
    email: "",
    password: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const updateField =
    (field: keyof LoginFormState) => (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target
      setFormState((currentFormState) => ({ ...currentFormState, [field]: value }))
    }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await signInWithEmailAndPassword(auth, formState.email.trim(), formState.password)
      router.push(UI_ROUTE)
    } catch (loginError) {
      setError(INVALID_CREDENTIALS_MESSAGE)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md space-y-4 rounded-lg bg-white p-6"
      >
        <h1 className="text-center text-2xl font-bold text-gray-900">Login</h1>

        <LoginField
          id="email"
          label="Email"
          type="email"
          value={formState.email}
          onChange={updateField("email")}
        />

        <LoginField
          id="password"
          label="Password"
          type="password"
          value={formState.password}
          onChange={updateField("password")}
        />

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={isLoading}
          className="flex min-h-[2.5rem] w-full items-center justify-center rounded-md bg-cyan-600 px-4 py-2 font-medium text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-cyan-400"
        >
          {isLoading ? (
            <Spinner />
          ) : (
            "Login"
          )}
        </button>
      </form>
    </main>
  )
}
