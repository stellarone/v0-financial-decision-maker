"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ComponentType,
} from "react"
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  Eye,
  FilePlus,
  Info,
  Loader2,
  Play,
  RefreshCw,
  XCircle,
  Zap,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/layout/page-header"
import {
  createEntryDecision,
  matchDecision,
  refreshReconDecisions,
} from "@/app/(app)/bank-reconciliation/actions"
import {
  RECON_DECISION_STATUS,
  RECON_DECISION_STATUS_LABELS,
  SUGGESTED_ACTIONS,
  SUGGESTED_ACTION_LABELS,
} from "@/data/constants/bank-reconciliation"
import type {
  DecisionSortField,
  ReconDecisionMetrics,
  ReconDecisionRow,
  SortDirection,
} from "@/data/types/bank-reconciliation-ui"
import { cn } from "@/lib/utils"
import { BankReconciliationRunPanel } from "@/components/reconciliation/bank-reconciliation-run-panel"
import {
  INITIAL_BANK_RECON_STREAM_STATE,
  mergeDecisionProgress,
  pollWorkflowRunStream,
  type BankReconStreamState,
} from "@/lib/bank-reconciliation/consume-ndjson-stream"

interface BankReconciliationPageClientProps {
  initialDecisions: ReconDecisionRow[]
  initialMetrics: ReconDecisionMetrics
  organizationId: string | null
}

interface MultiSelectFilters {
  statuses: Set<string>
  suggestedActions: Set<string>
  search: string | null
}

const ALL_STATUSES = [
  RECON_DECISION_STATUS.PENDING,
  RECON_DECISION_STATUS.COMPLETED,
  RECON_DECISION_STATUS.FAILED,
] as const

const ALL_ACTIONS = [
  SUGGESTED_ACTIONS.AUTO_RECONCILE,
  SUGGESTED_ACTIONS.MANUAL_REVIEW,
  SUGGESTED_ACTIONS.CREATE_NEW_ENTRY,
] as const

const DEFAULT_STATUSES = new Set<string>([
  RECON_DECISION_STATUS.PENDING,
  RECON_DECISION_STATUS.FAILED,
])

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function pct(count: number, total: number): string {
  if (total === 0) return "0%"
  return `${Math.round((count / total) * 100)}%`
}

function StatusBadge({ status }: { status: string }) {
  const label = RECON_DECISION_STATUS_LABELS[status] ?? status
  if (status === RECON_DECISION_STATUS.COMPLETED) {
    return (
      <span className="inline-flex rounded-full border border-adz-green/30 bg-adz-green-dim px-2 py-0.5 text-xs font-medium text-adz-green">
        {label}
      </span>
    )
  }
  if (status === RECON_DECISION_STATUS.PENDING) {
    return (
      <span className="inline-flex rounded-full border border-adz-amber/30 bg-adz-amber-dim px-2 py-0.5 text-xs font-medium text-adz-amber">
        {label}
      </span>
    )
  }
  if (status === RECON_DECISION_STATUS.FAILED) {
    return (
      <span className="inline-flex rounded-full border border-adz-red/30 bg-adz-red-dim px-2 py-0.5 text-xs font-medium text-adz-red">
        {label}
      </span>
    )
  }
  return (
    <span className="inline-flex rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
      {label}
    </span>
  )
}

function ActionBadge({ action }: { action: string }) {
  const label = SUGGESTED_ACTION_LABELS[action] ?? action
  return (
    <span className="inline-flex rounded-full border border-border bg-secondary px-2 py-0.5 text-xs text-foreground">
      {label}
    </span>
  )
}

function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  labelMap,
}: {
  label: string
  options: readonly string[]
  selected: Set<string>
  onChange: (next: Set<string>) => void
  labelMap: Record<string, string>
}) {
  const [open, setOpen] = useState(false)
  const allSelected = options.every((o) => selected.has(o))
  const noneSelected = selected.size === 0

  function toggle(value: string) {
    const next = new Set(selected)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    onChange(next)
  }

  function toggleAll() {
    onChange(allSelected ? new Set() : new Set(options))
  }

  const displayLabel =
    noneSelected || allSelected ? label : `${label} (${selected.size})`

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-9 min-w-[140px] items-center justify-between rounded-lg border border-border bg-secondary px-3 text-sm text-foreground hover:bg-accent"
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-[200px] rounded-lg border border-border bg-popover p-2 shadow-lg">
          <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="rounded border-border"
            />
            All
          </label>
          <div className="my-1 border-t border-border" />
          {options.map((opt) => (
            <label
              key={opt}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
            >
              <input
                type="checkbox"
                checked={selected.has(opt)}
                onChange={() => toggle(opt)}
                className="rounded border-border"
              />
              {labelMap[opt] ?? opt}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function DecisionActions({
  decision,
  onActionComplete,
}: {
  decision: ReconDecisionRow
  onActionComplete: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)

  const isActionable =
    decision.status !== RECON_DECISION_STATUS.COMPLETED &&
    decision.status !== RECON_DECISION_STATUS.FAILED

  const showMatch =
    decision.suggested_action === SUGGESTED_ACTIONS.MANUAL_REVIEW && isActionable

  const showCreateEntry =
    (decision.suggested_action === SUGGESTED_ACTIONS.MANUAL_REVIEW ||
      decision.suggested_action === SUGGESTED_ACTIONS.CREATE_NEW_ENTRY) &&
    isActionable

  if (!showMatch && !showCreateEntry) return null

  function handleMatch() {
    setActionError(null)
    startTransition(async () => {
      const result = await matchDecision({ decisionId: decision.id })
      if (!result.success) setActionError(result.error)
      else onActionComplete()
    })
  }

  function handleCreateEntry() {
    setActionError(null)
    startTransition(async () => {
      const result = await createEntryDecision({ decisionId: decision.id })
      if (!result.success) setActionError(result.error)
      else onActionComplete()
    })
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1.5">
        {showMatch && (
          <button
            type="button"
            onClick={handleMatch}
            disabled={isPending}
            className="flex h-7 items-center gap-1 rounded-lg border border-border px-2 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3 w-3" />
            )}
            Match
          </button>
        )}
        {showCreateEntry && (
          <button
            type="button"
            onClick={handleCreateEntry}
            disabled={isPending}
            className="flex h-7 items-center gap-1 rounded-lg border border-border px-2 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <FilePlus className="h-3 w-3" />
            )}
            Create Entry
          </button>
        )}
      </div>
      {actionError && (
        <p
          className="max-w-[200px] truncate text-xs text-adz-red"
          title={actionError}
        >
          {actionError}
        </p>
      )}
    </div>
  )
}

function SortableHeader({
  label,
  field,
  currentField,
  currentDirection,
  onSort,
}: {
  label: string
  field: DecisionSortField
  currentField: DecisionSortField
  currentDirection: SortDirection
  onSort: (field: DecisionSortField) => void
}) {
  const isActive = currentField === field
  return (
    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {label}
        {isActive ? (
          currentDirection === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
        )}
      </button>
    </th>
  )
}

export function BankReconciliationPageClient({
  initialDecisions,
  initialMetrics,
  organizationId,
}: BankReconciliationPageClientProps) {
  const router = useRouter()
  const [isRefreshing, startRefreshTransition] = useTransition()
  const [isRunning, setIsRunning] = useState(false)
  const [streamState, setStreamState] = useState<BankReconStreamState>(
    INITIAL_BANK_RECON_STREAM_STATE
  )
  const decisionBaselineRef = useRef(0)
  const streamPollAbortRef = useRef<AbortController | null>(null)

  const workflowActive = streamState.phase === "running" || isRunning

  useEffect(() => {
    if (streamState.phase !== "running") return
    const intervalId = setInterval(() => {
      router.refresh()
    }, 4000)
    return () => clearInterval(intervalId)
  }, [streamState.phase, router])

  const [filters, setFilters] = useState<MultiSelectFilters>({
    statuses: DEFAULT_STATUSES,
    suggestedActions: new Set(ALL_ACTIONS),
    search: null,
  })

  const [sortField, setSortField] = useState<DecisionSortField>("created_at")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  const [decisions, setDecisions] = useState(initialDecisions)
  const [metrics, setMetrics] = useState(initialMetrics)

  useEffect(() => {
    setDecisions(initialDecisions)
    setMetrics(initialMetrics)
  }, [initialDecisions, initialMetrics])

  useEffect(() => {
    if (streamState.phase !== "running") return
    setStreamState((prev) =>
      mergeDecisionProgress(prev, decisionBaselineRef.current, decisions.length)
    )
  }, [decisions.length, streamState.phase])

  const handleSort = useCallback(
    (field: DecisionSortField) => {
      if (sortField === field) {
        setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
      } else {
        setSortField(field)
        setSortDirection("desc")
      }
    },
    [sortField]
  )

  const filteredAndSorted = useMemo(() => {
    let result = [...decisions]

    if (
      filters.statuses.size > 0 &&
      filters.statuses.size < ALL_STATUSES.length
    ) {
      result = result.filter((d) => filters.statuses.has(d.status))
    }

    if (
      filters.suggestedActions.size > 0 &&
      filters.suggestedActions.size < ALL_ACTIONS.length
    ) {
      result = result.filter((d) =>
        filters.suggestedActions.has(d.suggested_action)
      )
    }

    if (filters.search) {
      const term = filters.search.toLowerCase()
      result = result.filter(
        (d) =>
          String(d.tran_id).toLowerCase().includes(term) ||
          (d.description?.toLowerCase().includes(term) ?? false) ||
          (d.ext_ref_nbr?.toLowerCase().includes(term) ?? false) ||
          (d.matched_ref_nbr?.toLowerCase().includes(term) ?? false)
      )
    }

    result.sort((a, b) => {
      let cmp = 0
      if (sortField === "amount") {
        cmp = a.amount - b.amount
      } else if (sortField === "confidence") {
        cmp = (a.confidence ?? 0) - (b.confidence ?? 0)
      } else if (sortField === "tran_date" || sortField === "created_at") {
        cmp = new Date(a[sortField]).getTime() - new Date(b[sortField]).getTime()
      } else {
        cmp = String(a[sortField] ?? "").localeCompare(
          String(b[sortField] ?? "")
        )
      }
      return sortDirection === "asc" ? cmp : -cmp
    })

    return result
  }, [decisions, filters, sortField, sortDirection])

  function handleRefresh() {
    startRefreshTransition(async () => {
      await refreshReconDecisions()
      router.refresh()
    })
  }

  const handleRunReconciliation = useCallback(async () => {
    if (!organizationId) {
      setStreamState({
        ...INITIAL_BANK_RECON_STREAM_STATE,
        phase: "error",
        error: "No organization linked to your account",
        currentMessage: "No organization linked to your account",
      })
      return
    }

    streamPollAbortRef.current?.abort()
    const pollAbort = new AbortController()
    streamPollAbortRef.current = pollAbort

    decisionBaselineRef.current = decisions.length
    setIsRunning(true)

    const initialRunning: BankReconStreamState = {
      ...INITIAL_BANK_RECON_STREAM_STATE,
      phase: "running",
      currentMessage: "Starting reconciliation…",
      percent: 0,
      processedCount: 0,
      lines: [
        {
          step: "workflow_start",
          message: "Starting reconciliation…",
          at: Date.now(),
          percent: 0,
        },
      ],
    }
    setStreamState(initialRunning)

    try {
      const res = await fetch("/api/workflows/bank-reconciliation", {
        method: "POST",
        credentials: "include",
      })

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          message?: string
          error?: string
        }
        setStreamState({
          ...initialRunning,
          phase: "error",
          error:
            body.message ??
            body.error ??
            `Request failed (${res.status})`,
          currentMessage:
            body.message ?? body.error ?? "Failed to start workflow",
        })
        return
      }

      const body = (await res.json()) as {
        runId?: string
        transactionCount?: number
      }
      const runId =
        body.runId ?? res.headers.get("X-Workflow-Run-Id") ?? null
      const transactionCount =
        typeof body.transactionCount === "number"
          ? body.transactionCount
          : null

      if (!runId) {
        setStreamState({
          ...initialRunning,
          phase: "error",
          error: "Workflow started without a run id",
          currentMessage: "Workflow started without a run id",
        })
        return
      }

      const pollingState: BankReconStreamState = {
        ...initialRunning,
        runId,
        transactionCount,
        currentMessage: transactionCount
          ? `Processing ${transactionCount} bank transactions…`
          : "Workflow started…",
      }
      setStreamState(pollingState)

      const final = await pollWorkflowRunStream(runId, {
        initial: pollingState,
        onUpdate: setStreamState,
        intervalMs: 2000,
        signal: pollAbort.signal,
      })

      if (final.phase === "success") {
        router.refresh()
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return
      }
      setStreamState({
        ...INITIAL_BANK_RECON_STREAM_STATE,
        phase: "error",
        error: "Failed to run reconciliation",
        currentMessage: "Failed to run reconciliation",
      })
    } finally {
      setIsRunning(false)
      if (streamPollAbortRef.current === pollAbort) {
        streamPollAbortRef.current = null
      }
    }
  }, [organizationId, router, decisions.length])

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Bank Reconciliation"
        subtitle="Monitor AI-driven bank transaction reconciliation decisions for your organization."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing || workflowActive}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-60"
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void handleRunReconciliation()}
              disabled={workflowActive || !organizationId}
              className="flex items-center gap-1.5 rounded-lg bg-adz-blue px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-adz-blue/90 disabled:opacity-60"
            >
              {workflowActive ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {workflowActive ? "Running…" : "Run reconciliation"}
            </button>
          </div>
        }
      />

      <BankReconciliationRunPanel
        stream={streamState}
        onDismiss={() => setStreamState(INITIAL_BANK_RECON_STREAM_STATE)}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            By Status
          </p>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              icon={Eye}
              label="Pending Review"
              value={metrics.pending}
              highlight="amber"
            />
            <MetricCard
              icon={XCircle}
              label="Failed"
              value={metrics.failed}
              highlight="red"
            />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            By Recommended Action
          </p>
          <div className="grid grid-cols-3 gap-3">
            <MetricCard
              icon={Zap}
              label="Auto Reconciled"
              value={metrics.autoReconciled}
              suffix={pct(metrics.autoReconciled, metrics.total)}
            />
            <MetricCard
              icon={Eye}
              label="Manual Review"
              value={metrics.manualReview}
              suffix={pct(metrics.manualReview, metrics.total)}
            />
            <MetricCard
              icon={FilePlus}
              label="Create Entry"
              value={metrics.createNewEntry}
              suffix={pct(metrics.createNewEntry, metrics.total)}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Recent Decisions
            </h2>
            <p className="text-xs text-muted-foreground">
              Showing {filteredAndSorted.length} of {decisions.length}{" "}
              reconciliation decisions
            </p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-3">
          <input
            type="search"
            placeholder="Search by ID, description, reference..."
            className="h-9 max-w-xs rounded-lg border border-border bg-secondary px-3 text-sm text-foreground placeholder:text-muted-foreground"
            value={filters.search ?? ""}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                search: e.target.value || null,
              }))
            }
          />
          <MultiSelectFilter
            label="Status"
            options={ALL_STATUSES}
            selected={filters.statuses}
            onChange={(next) => setFilters((f) => ({ ...f, statuses: next }))}
            labelMap={RECON_DECISION_STATUS_LABELS}
          />
          <MultiSelectFilter
            label="Suggested Action"
            options={ALL_ACTIONS}
            selected={filters.suggestedActions}
            onChange={(next) =>
              setFilters((f) => ({ ...f, suggestedActions: next }))
            }
            labelMap={SUGGESTED_ACTION_LABELS}
          />
        </div>

        {filteredAndSorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">
              {decisions.length === 0
                ? "No reconciliation decisions yet"
                : "No decisions match the current filters"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {decisions.length === 0
                ? "Run reconciliation or wait for the daily schedule to process bank transactions."
                : "Try adjusting your filter criteria."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b border-border bg-secondary/50">
                <tr>
                  <SortableHeader
                    label="Date"
                    field="tran_date"
                    currentField={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                    Tran ID
                  </th>
                  <SortableHeader
                    label="Amount"
                    field="amount"
                    currentField={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <th className="min-w-[180px] px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                    Description
                  </th>
                  <SortableHeader
                    label="Suggested Action"
                    field="suggested_action"
                    currentField={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Status"
                    field="status"
                    currentField={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Confidence"
                    field="confidence"
                    currentField={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                    Match
                  </th>
                  <SortableHeader
                    label="Created"
                    field="created_at"
                    currentField={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSorted.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border last:border-0 hover:bg-secondary/30"
                  >
                    <td className="whitespace-nowrap px-3 py-2">
                      {formatDate(row.tran_date)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{row.tran_id}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-medium">
                      {formatCurrency(row.amount)}
                    </td>
                    <td
                      className="max-w-[240px] truncate px-3 py-2"
                      title={row.description ?? undefined}
                    >
                      {row.description || "—"}
                    </td>
                    <td className="px-3 py-2">
                      <ActionBadge action={row.suggested_action} />
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-3 py-2">
                      {row.confidence != null ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="font-medium">{row.confidence}%</span>
                          {row.reasoning && (
                            <span title={row.reasoning}>
                              <Info className="h-3.5 w-3.5 text-muted-foreground" />
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs">
                      {row.matched_doc_type && row.matched_ref_nbr ? (
                        <span className="font-mono">
                          {row.matched_doc_type}/{row.matched_ref_nbr}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                      {formatDateTime(row.created_at)}
                    </td>
                    <td className="px-3 py-2">
                      <DecisionActions
                        decision={row}
                        onActionComplete={() => router.refresh()}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  suffix,
  highlight,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: number
  suffix?: string
  highlight?: "amber" | "red"
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-secondary/40 p-3",
        highlight === "amber" && "border-adz-amber/30",
        highlight === "red" && "border-adz-red/30"
      )}
    >
      <div className="mb-2 flex items-center gap-1.5">
        <Icon
          className={cn(
            "h-3.5 w-3.5",
            highlight === "amber"
              ? "text-adz-amber"
              : highlight === "red"
                ? "text-adz-red"
                : "text-muted-foreground"
          )}
        />
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="text-lg font-semibold text-foreground">
        {value}
        {suffix && (
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            {suffix}
          </span>
        )}
      </p>
    </div>
  )
}
