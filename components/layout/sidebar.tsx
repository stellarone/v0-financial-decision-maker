"use client"

import React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Calendar,
  Activity,
  Clock,
  FileText,
  DollarSign,
  CreditCard,
  Box,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

interface NavSection {
  label: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    label: "Command Center",
    items: [
      { label: "Cash Calendar", href: "/cash-calendar", icon: Calendar },
      { label: "Cash Forecast", href: "/cash-forecast", icon: Activity },
      {
        label: "Execution Queue",
        href: "/execution-queue",
        icon: Clock,
        badge: 3,
      },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Payables", href: "#", icon: FileText },
      { label: "Receivables", href: "#", icon: DollarSign },
      { label: "Bank Accounts", href: "#", icon: CreditCard },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "AI Reconciliation", href: "#", icon: Box },
      { label: "Anomalies", href: "#", icon: AlertTriangle },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-[260px] shrink-0 border-r border-border bg-sidebar md:flex md:flex-col">
      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto adz-scrollbar p-4">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {section.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-adz-blue"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isActive ? "text-adz-blue" : "text-muted-foreground"
                      )}
                    />
                    <span className="flex-1">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-adz-amber/20 px-1.5 text-[10px] font-semibold text-adz-amber">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}
