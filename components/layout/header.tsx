"use client"

import { ChevronDown, Zap, User } from "lucide-react"
import { useState } from "react"

const companies = [
  { id: "1", name: "Demo Company" },
  { id: "2", name: "Subsidiary A" },
]

export function Header() {
  const [selectedCompany, setSelectedCompany] = useState(companies[0])
  const [companyOpen, setCompanyOpen] = useState(false)

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
        {/* Company Selector */}
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

        {/* User Avatar */}
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-adz-blue/20 text-adz-blue transition-colors hover:bg-adz-blue/30"
          aria-label="User menu"
        >
          <User className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
