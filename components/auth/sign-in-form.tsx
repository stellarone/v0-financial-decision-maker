"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { LoaderCircle } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().trim().min(1, "Password is required"),
})

type LoginValues = z.infer<typeof loginSchema>

type LoginResponse = {
  code?: string
  error?: { code?: string; message?: string }
  session?: {
    access_token?: string
    refresh_token?: string
  }
}

const errorMessages: Record<string, string> = {
  AUTH_FAILED: "Authentication failed. Please try again.",
  EMAIL_NOT_CONFIRMED: "Please verify your email before signing in.",
  INVALID_CREDENTIALS: "Invalid email or password.",
  NO_SESSION: "We couldn't start your session. Please try again.",
}

function getAuthErrorMessage(payload: LoginResponse | null): string {
  const code = payload?.code ?? payload?.error?.code
  if (code && errorMessages[code]) {
    return errorMessages[code]
  }

  return payload?.error?.message ?? "We couldn't sign you in. Please try again."
}

function sanitizeRedirect(target: string | null): string {
  if (!target || !target.startsWith("/") || target.startsWith("//")) {
    return "/cash-calendar"
  }

  return target
}

const inputClassName =
  "w-full rounded-lg border border-border bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-adz-blue/50 focus:ring-2 focus:ring-adz-blue/20"

export function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<LoginValues>({
    defaultValues: {
      email: "",
      password: "",
    },
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)

    const response = await fetch("/api/v1/auth/login", {
      body: JSON.stringify(values),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    })

    const payload = (await response.json().catch(() => null)) as LoginResponse | null

    if (!response.ok || !payload?.session?.access_token || !payload?.session?.refresh_token) {
      setFormError(getAuthErrorMessage(payload))
      return
    }

    const supabase = createBrowserSupabaseClient()
    const { error } = await supabase.auth.setSession({
      access_token: payload.session.access_token,
      refresh_token: payload.session.refresh_token,
    })

    if (error) {
      setFormError("We couldn't start your session. Please try again.")
      return
    }

    router.replace(sanitizeRedirect(searchParams.get("redirectTo")))
    router.refresh()
  })

  return (
    <form className="flex flex-col gap-5" onSubmit={onSubmit}>
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="text-sm font-medium text-foreground"
        >
          Email
        </label>
        <input
          {...register("email")}
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          className={inputClassName}
        />
        {errors.email && (
          <p className="text-sm text-adz-red">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="password"
          className="text-sm font-medium text-foreground"
        >
          Password
        </label>
        <input
          {...register("password")}
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          className={inputClassName}
        />
        {errors.password && (
          <p className="text-sm text-adz-red">{errors.password.message}</p>
        )}
      </div>

      {formError && (
        <div className="rounded-lg border border-adz-red/30 bg-adz-red-dim px-3.5 py-3 text-sm text-adz-red">
          {formError}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-adz-blue px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-adz-blue/25 transition-colors hover:bg-adz-blue/90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
            Signing in
          </>
        ) : (
          "Sign In"
        )}
      </button>
    </form>
  )
}
