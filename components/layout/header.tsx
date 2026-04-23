"use client"

import { ChevronDown, LoaderCircle, LogOut, User, Zap } from "lucide-react"
import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"

const companies = [
  { id: "1", name: "Demo Company" },
  { id: "2", name: "Subsidiary A" },
]

interface HeaderProps {
  userEmail?: string | null
  userName?: string | null
}

function getUserLabel(userName?: string | null, userEmail?: string | null) {
  return userName?.trim() || userEmail?.trim() || "Signed in user"
}

function getUserInitials(userName?: string | null, userEmail?: string | null) {
  const source = getUserLabel(userName, userEmail)
  const initials = source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((token) => token[0]?.toUpperCase())
    .join("")

  return initials || "U"
}

export function Header({ userEmail, userName }: HeaderProps) {
  const router = useRouter()
  const [selectedCompany, setSelectedCompany] = useState(companies[0])
  const [companyOpen, setCompanyOpen] = useState(false)
  const [isSigningOut, startSigningOut] = useTransition()
  const userLabel = useMemo(
    () => getUserLabel(userName, userEmail),
    [userEmail, userName]
  )
  const userInitials = useMemo(
    () => getUserInitials(userName, userEmail),
    [userEmail, userName]
  )

  function handleSignOut() {
    startSigningOut(async () => {
      const supabase = createBrowserSupabaseClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      await fetch("/api/v1/auth/logout", {
        headers: {
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        method: "POST",
      }).catch(() => null)

      await supabase.auth.signOut()
      router.replace("/sign-in")
      router.refresh()
    })
  }

  return (
    <header
      className="flex h-16 shrink-0 items-center justify-between border-b border-border px-6"
      style={{ backgroundColor: "var(--background)" }}
    >
      {/* Left: Logo */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-adz-blue">
          <Zap className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-semibold tracking-tight text-foreground">
          AccountingZero
        </span>
      </div>

      {/* Center: Status Badge */}
      <div className="hidden items-center gap-2 rounded-full border border-adz-green/30 bg-adz-green-dim px-3 py-1.5 md:flex">
        <span className="h-2 w-2 rounded-full bg-adz-green adz-pulse" />
        <span className="text-xs font-medium text-adz-green">
          Autonomous Mode Active
        </span>
      </div>

      {/* Right: Company Selector + User */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            type="button"
            onClick={() => setCompanyOpen(!companyOpen)}
            className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent"
          >
            <span className="max-w-[140px] truncate">{selectedCompany.name}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          {companyOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-border bg-popover p-1 shadow-lg">
              {companies.map((company) => (
                <button
                  key={company.id}
                  type="button"
                  onClick={() => {
                    setSelectedCompany(company)
                    setCompanyOpen(false)
                  }}
                  className={`flex w-full items-center rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent ${
                    company.id === selectedCompany.id
                      ? "text-adz-blue"
                      : "text-foreground"
                  }`}
                >
                  {company.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="hidden items-center gap-3 rounded-full border border-border bg-secondary px-3 py-1.5 md:flex">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-adz-blue/20 text-xs font-semibold text-adz-blue">
            {userInitials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {userLabel}
            </p>
            {userEmail && (
              <p className="truncate text-xs text-muted-foreground">
                {userEmail}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSigningOut ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <LogOut className="h-3.5 w-3.5" />
            )}
            Sign out
          </button>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-adz-blue/20 text-adz-blue transition-colors hover:bg-adz-blue/30 md:hidden"
          aria-label="Sign out"
        >
          {isSigningOut ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <User className="h-4 w-4" />
          )}
        </button>
      </div>
    </header>
  )
}
