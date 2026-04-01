"use client"

import { useState } from "react"
import { X } from "lucide-react"

interface SavePlanModalProps {
  open: boolean
  onClose: () => void
}

export function SavePlanModal({ open, onClose }: SavePlanModalProps) {
  const [planName, setPlanName] = useState("February 2026 - Optimized")
  const [threshold, setThreshold] = useState("200000")
  const [tolerance, setTolerance] = useState("15")

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: "color-mix(in srgb, var(--background) 80%, transparent)" }}
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        role="button"
        tabIndex={0}
        aria-label="Close modal"
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">Save Cash Plan</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="plan-name"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Plan Name
            </label>
            <input
              id="plan-name"
              type="text"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-adz-blue focus:outline-none focus:ring-1 focus:ring-adz-blue"
            />
          </div>

          <div>
            <label
              htmlFor="threshold"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Cash Threshold Alert
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <input
                id="threshold"
                type="text"
                value={Number(threshold).toLocaleString()}
                onChange={(e) =>
                  setThreshold(e.target.value.replace(/[^0-9]/g, ""))
                }
                className="w-full rounded-lg border border-border bg-input pl-7 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-adz-blue focus:outline-none focus:ring-1 focus:ring-adz-blue"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="tolerance"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Variance Tolerance
            </label>
            <div className="relative">
              <input
                id="tolerance"
                type="text"
                value={tolerance}
                onChange={(e) =>
                  setTolerance(e.target.value.replace(/[^0-9]/g, ""))
                }
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-adz-blue focus:outline-none focus:ring-1 focus:ring-adz-blue pr-7"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                %
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-adz-blue px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-adz-blue/90"
          >
            Save & Monitor
          </button>
        </div>
      </div>
    </div>
  )
}
