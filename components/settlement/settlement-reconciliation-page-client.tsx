"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react"
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FileUp,
  Loader2,
  Upload,
} from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { ConfidenceBar } from "@/components/shared/confidence-bar"
import { ReleaseDepositModal } from "@/components/settlement/release-deposit-modal"
import { SettlementSummaryPanel } from "@/components/settlement/settlement-summary-panel"
import {
  CONFIDENCE_LEVEL_LABELS,
  GL_ACCOUNT_OPTIONS,
  SETTLEMENT_SECTION_LABELS,
  SETTLEMENT_SUGGESTED_ACTION_LABELS,
} from "@/data/constants/settlement-reconciliation"
import type {
  ClearingPayment,
  ExceptionResolution,
  MatchResult,
  ParsedSettlementBatch,
  ReleasePayload,
  SettlementImportSummary,
  SettlementSection,
} from "@/data/types/settlement-reconciliation"
import {
  allExceptionsResolved,
  allReviewItemsAccepted,
  computeReconciliationSummary,
  groupMatchesBySection,
} from "@/lib/settlement-reconciliation/matching"
import { SAMPLE_SHOPIFY_PAYOUT_CSV } from "@/lib/settlement-reconciliation/mock-data"
import { parseShopifyPayoutCsv } from "@/lib/settlement-reconciliation/shopify-adapter"
import {
  getClearingAccountPayments,
  matchSettlement,
  releaseDeposit,
} from "@/lib/settlement-reconciliation/settlement-service"
import { cn } from "@/lib/utils"

type Phase = "import" | "review"

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

function ActionBadge({ action }: { action: string }) {
  const label = SETTLEMENT_SUGGESTED_ACTION_LABELS[action] ?? action
  const isException = action.startsWith("exception_")
  const isReview = action === "review_amount_mismatch"

  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-xs",
        isException
          ? "border-adz-red/30 bg-adz-red-dim text-adz-red"
          : isReview
            ? "border-adz-amber/30 bg-adz-amber-dim text-adz-amber"
            : "border-border bg-secondary text-foreground"
      )}
    >
      {label}
    </span>
  )
}

function ConfidenceCell({ match }: { match: MatchResult }) {
  if (match.confidence === "none") {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  return (
    <div className="min-w-[100px]">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {CONFIDENCE_LEVEL_LABELS[match.confidence]}
      </p>
      <ConfidenceBar value={match.confidenceScore} size="sm" />
    </div>
  )
}

function AcceptToggle({
  accepted,
  onChange,
  disabled,
}: {
  accepted: boolean
  onChange: (accepted: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!accepted)}
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        accepted
          ? "border-adz-green/30 bg-adz-green-dim text-adz-green"
          : "border-adz-amber/30 bg-adz-amber-dim text-adz-amber"
      )}
    >
      {accepted ? "Accepted" : "Needs review"}
    </button>
  )
}

function ExceptionResolutionControl({
  match,
  resolution,
  clearingPayments,
  onChange,
}: {
  match: MatchResult
  resolution: ExceptionResolution | undefined
  clearingPayments: ClearingPayment[]
  onChange: (resolution: ExceptionResolution) => void
}) {
  const [search, setSearch] = useState("")
  const type = resolution?.type ?? ""

  const filteredPayments = clearingPayments
    .filter(
      (p) =>
        !search ||
        p.externalOrderId.toLowerCase().includes(search.toLowerCase()) ||
        p.customerName.toLowerCase().includes(search.toLowerCase()) ||
        p.reference.toLowerCase().includes(search.toLowerCase())
    )
    .slice(0, 8)

  return (
    <div className="flex flex-col gap-2">
      <select
        value={type}
        onChange={(e) => {
          const nextType = e.target.value as ExceptionResolution["type"]
          onChange({
            lineId: match.line.lineId,
            type: nextType,
            acknowledged: nextType === "ignore",
            glAccount:
              nextType === "book_as_adjustment" ? "6200" : undefined,
          })
        }}
        className="h-8 rounded-lg border border-border bg-secondary px-2 text-xs text-foreground"
      >
        <option value="">Select resolution…</option>
        <option value="book_as_fee">Book as fee</option>
        <option value="book_as_adjustment">
          Book as chargeback / adjustment
        </option>
        <option value="ignore">Ignore for this batch</option>
        <option value="match_manually">Match manually</option>
      </select>

      {type === "book_as_adjustment" && (
        <select
          value={resolution?.glAccount ?? "6200"}
          onChange={(e) =>
            onChange({
              lineId: match.line.lineId,
              type: "book_as_adjustment",
              glAccount: e.target.value,
              acknowledged: true,
            })
          }
          className="h-8 rounded-lg border border-border bg-secondary px-2 text-xs text-foreground"
        >
          {GL_ACCOUNT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {type === "match_manually" && (
        <div className="flex flex-col gap-1">
          <input
            type="search"
            placeholder="Search clearing payments…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 rounded-lg border border-border bg-secondary px-2 text-xs text-foreground placeholder:text-muted-foreground"
          />
          <div className="max-h-32 overflow-y-auto rounded-lg border border-border">
            {filteredPayments.map((payment) => (
              <button
                key={payment.id}
                type="button"
                onClick={() =>
                  onChange({
                    lineId: match.line.lineId,
                    type: "match_manually",
                    manualPaymentId: payment.id,
                    acknowledged: true,
                  })
                }
                className={cn(
                  "flex w-full flex-col px-2 py-1.5 text-left text-xs hover:bg-secondary/60",
                  resolution?.manualPaymentId === payment.id &&
                    "bg-adz-blue-dim"
                )}
              >
                <span className="font-medium text-foreground">
                  {payment.externalOrderId} — {formatCurrency(payment.amount)}
                </span>
                <span className="text-muted-foreground">
                  {payment.customerName}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {(type === "book_as_fee" || type === "ignore") && (
        <button
          type="button"
          onClick={() =>
            onChange({
              lineId: match.line.lineId,
              type,
              acknowledged: true,
            })
          }
          className="self-start rounded-lg border border-border bg-secondary px-2 py-1 text-xs font-medium text-foreground hover:bg-accent"
        >
          Confirm resolution
        </button>
      )}
    </div>
  )
}

function SettlementRow({
  match,
  resolution,
  clearingPayments,
  onAcceptChange,
  onResolutionChange,
}: {
  match: MatchResult
  resolution: ExceptionResolution | undefined
  clearingPayments: ClearingPayment[]
  onAcceptChange: (lineId: string, accepted: boolean) => void
  onResolutionChange: (resolution: ExceptionResolution) => void
}) {
  const { line } = match
  const isException = match.section === "exception"

  return (
    <tr
      className={cn(
        "border-b border-border last:border-0 hover:bg-secondary/30",
        isException && "bg-adz-red-dim/20"
      )}
    >
      <td className="px-3 py-2">
        <div>
          <p className="font-mono text-xs font-medium text-foreground">
            {line.externalOrderId ?? "—"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {formatDate(line.txnDate)} · {line.type}
          </p>
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-2 font-medium">
        {formatCurrency(line.gross)}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
        {formatCurrency(line.fee)}
      </td>
      <td className="whitespace-nowrap px-3 py-2 font-medium">
        {formatCurrency(line.net)}
      </td>
      <td className="px-3 py-2">
        {match.matchedPayment ? (
          <div>
            <p className="text-xs font-medium text-foreground">
              {match.matchedPayment.customerName}
            </p>
            <p className="font-mono text-[10px] text-muted-foreground">
              {match.matchedPayment.reference} ·{" "}
              {formatCurrency(match.matchedPayment.amount)}
            </p>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 py-2">
        <ConfidenceCell match={match} />
      </td>
      <td className="px-3 py-2">
        <ActionBadge action={match.suggestedAction} />
      </td>
      <td className="px-3 py-2">
        {isException ? (
          <ExceptionResolutionControl
            match={match}
            resolution={resolution}
            clearingPayments={clearingPayments}
            onChange={onResolutionChange}
          />
        ) : (
          <AcceptToggle
            accepted={match.accepted}
            onChange={(accepted) => onAcceptChange(line.lineId, accepted)}
          />
        )}
      </td>
    </tr>
  )
}

function SectionTable({
  section,
  matches,
  collapsed,
  onToggle,
  resolutions,
  clearingPayments,
  onAcceptChange,
  onResolutionChange,
}: {
  section: SettlementSection
  matches: MatchResult[]
  collapsed: boolean
  onToggle: () => void
  resolutions: Record<string, ExceptionResolution>
  clearingPayments: ClearingPayment[]
  onAcceptChange: (lineId: string, accepted: boolean) => void
  onResolutionChange: (resolution: ExceptionResolution) => void
}) {
  const isException = section === "exception"

  return (
    <div
      className={cn(
        "rounded-lg border border-border",
        isException && "border-adz-red/20"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 rounded-t-lg bg-secondary/40 px-4 py-3 text-left hover:bg-secondary/60"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="text-sm font-semibold text-foreground">
          {SETTLEMENT_SECTION_LABELS[section]}
        </span>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {matches.length}
        </span>
      </button>

      {!collapsed && matches.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="border-b border-border bg-secondary/30">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Settlement line
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Gross
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Fee
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Net
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Matched payment
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Confidence
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Suggested action
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => (
                <SettlementRow
                  key={match.line.lineId}
                  match={match}
                  resolution={resolutions[match.line.lineId]}
                  clearingPayments={clearingPayments}
                  onAcceptChange={onAcceptChange}
                  onResolutionChange={onResolutionChange}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!collapsed && matches.length === 0 && (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          No rows in this section.
        </p>
      )}
    </div>
  )
}

function ImportSummaryCard({
  summary,
}: {
  summary: SettlementImportSummary
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Import Summary</h3>
        <span className="rounded-full border border-adz-purple/30 bg-adz-purple-dim px-2.5 py-0.5 text-xs font-medium text-adz-purple">
          Shopify
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">Date range</p>
          <p className="text-sm font-medium text-foreground">
            {formatDate(summary.dateRange.start)} –{" "}
            {formatDate(summary.dateRange.end)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Transaction lines</p>
          <p className="text-sm font-medium text-foreground">
            {summary.transactionLineCount}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Payout total (net)</p>
          <p className="font-mono text-sm font-semibold text-adz-green">
            {formatCurrency(summary.payoutNetTotal)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total gross</p>
          <p className="font-mono text-sm font-medium text-foreground">
            {formatCurrency(summary.totalGross)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total fees</p>
          <p className="font-mono text-sm font-medium text-adz-red">
            {formatCurrency(summary.totalFees)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Batch ID</p>
          <p className="font-mono text-xs text-muted-foreground">
            {summary.batchId}
          </p>
        </div>
      </div>
    </div>
  )
}

export function SettlementReconciliationPageClient() {
  const [phase, setPhase] = useState<Phase>("import")
  const [isLoading, startTransition] = useTransition()
  const [isReleasing, setIsReleasing] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const [batch, setBatch] = useState<ParsedSettlementBatch | null>(null)
  const [clearingPayments, setClearingPayments] = useState<ClearingPayment[]>(
    []
  )
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [resolutions, setResolutions] = useState<
    Record<string, ExceptionResolution>
  >({})

  const [collapsedSections, setCollapsedSections] = useState<
    Record<SettlementSection, boolean>
  >({
    auto_matched: true,
    needs_review: false,
    exception: false,
  })

  const [releaseModalOpen, setReleaseModalOpen] = useState(false)
  const [released, setReleased] = useState(false)
  const [depositId, setDepositId] = useState<string | undefined>()

  useEffect(() => {
    void getClearingAccountPayments().then(setClearingPayments)
  }, [])

  const grouped = useMemo(() => groupMatchesBySection(matches), [matches])

  const reconciliationSummary = useMemo(() => {
    if (!batch) {
      return {
        matchedPaymentsGross: 0,
        processorFees: 0,
        adjustmentsResolved: 0,
        reconciledTotal: 0,
        payoutNetControlTotal: 0,
        isBalanced: false,
        variance: 0,
      }
    }
    return computeReconciliationSummary(
      matches,
      batch.summary.payoutNetTotal,
      resolutions
    )
  }, [batch, matches, resolutions])

  const canRelease =
    batch !== null &&
    reconciliationSummary.isBalanced &&
    allReviewItemsAccepted(matches) &&
    allExceptionsResolved(matches, resolutions)

  const processBatch = useCallback(
    (parsed: ParsedSettlementBatch) => {
      startTransition(async () => {
        setImportError(null)
        const payments =
          clearingPayments.length > 0
            ? clearingPayments
            : await getClearingAccountPayments()
        if (clearingPayments.length === 0) {
          setClearingPayments(payments)
        }
        const results = await matchSettlement(parsed.lines, payments)
        setBatch(parsed)
        setMatches(results)
        setResolutions({})
        setPhase("review")
      })
    },
    [clearingPayments]
  )

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const parsed = parseShopifyPayoutCsv(reader.result as string)
          processBatch(parsed)
        } catch (err) {
          setImportError(
            err instanceof Error ? err.message : "Failed to parse CSV file"
          )
        }
      }
      reader.readAsText(file)
    },
    [processBatch]
  )

  const handleLoadSample = useCallback(() => {
    try {
      const parsed = parseShopifyPayoutCsv(SAMPLE_SHOPIFY_PAYOUT_CSV)
      processBatch(parsed)
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Failed to load sample data"
      )
    }
  }, [processBatch])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleAcceptChange = useCallback(
    (lineId: string, accepted: boolean) => {
      setMatches((prev) =>
        prev.map((m) =>
          m.line.lineId === lineId ? { ...m, accepted } : m
        )
      )
    },
    []
  )

  const handleResolutionChange = useCallback(
    (resolution: ExceptionResolution) => {
      setResolutions((prev) => ({
        ...prev,
        [resolution.lineId]: resolution,
      }))
    },
    []
  )

  const releasePayload: ReleasePayload | null = useMemo(() => {
    if (!batch) return null
    const matchedPaymentIds = matches
      .filter(
        (m) =>
          m.accepted &&
          m.matchedPayment &&
          (m.section === "auto_matched" || m.section === "needs_review")
      )
      .map((m) => m.matchedPayment!.id)

    return {
      batchId: batch.summary.batchId,
      channel: batch.summary.channel,
      matchedPaymentIds,
      matchedPaymentsGross: reconciliationSummary.matchedPaymentsGross,
      feeEntryAmount: reconciliationSummary.processorFees,
      exceptionResolutions: Object.values(resolutions).filter(
        (r) => r.acknowledged
      ),
      netDepositAmount: batch.summary.payoutNetTotal,
    }
  }, [
    batch,
    matches,
    reconciliationSummary.matchedPaymentsGross,
    reconciliationSummary.processorFees,
    resolutions,
  ])

  const handleRelease = useCallback(async () => {
    if (!releasePayload) return
    setIsReleasing(true)
    try {
      const result = await releaseDeposit(releasePayload)
      if (result.ok) {
        setDepositId(result.depositId)
        setReleased(true)
      }
    } finally {
      setIsReleasing(false)
    }
  }, [releasePayload])

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Settlement Reconciliation"
        subtitle="Match a marketplace payout against payments in your clearing account."
        actions={
          phase === "review" ? (
            <button
              type="button"
              onClick={() => {
                setPhase("import")
                setBatch(null)
                setMatches([])
                setResolutions({})
              }}
              className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              New import
            </button>
          ) : undefined
        }
      />

      {phase === "import" && (
        <div className="flex flex-col gap-4">
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={cn(
              "flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-12 transition-colors",
              isDragging
                ? "border-adz-blue bg-adz-blue-dim/30"
                : "border-border bg-card"
            )}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-adz-blue-dim">
              <Upload className="h-6 w-6 text-adz-blue" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                Upload Shopify payout file (CSV)
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Drag and drop or click to browse. v1 supports Shopify Payments
                transaction exports only.
              </p>
            </div>
            <label className="cursor-pointer rounded-lg bg-adz-blue px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-adz-blue/90">
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFile(file)
                }}
              />
              Browse files
            </label>
            <button
              type="button"
              onClick={handleLoadSample}
              disabled={isLoading}
              className="flex items-center gap-1.5 text-sm font-medium text-adz-blue hover:underline disabled:opacity-60"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileUp className="h-4 w-4" />
              )}
              Load sample data
            </button>
          </div>

          {importError && (
            <div className="flex items-center gap-2 rounded-lg border border-adz-red/30 bg-adz-red-dim px-4 py-3 text-sm text-adz-red">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {importError}
            </div>
          )}
        </div>
      )}

      {phase === "review" && batch && (
        <>
          <ImportSummaryCard summary={batch.summary} />

          <div className="flex flex-1 gap-5">
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              <SectionTable
                section="auto_matched"
                matches={grouped.auto_matched}
                collapsed={collapsedSections.auto_matched}
                onToggle={() =>
                  setCollapsedSections((s) => ({
                    ...s,
                    auto_matched: !s.auto_matched,
                  }))
                }
                resolutions={resolutions}
                clearingPayments={clearingPayments}
                onAcceptChange={handleAcceptChange}
                onResolutionChange={handleResolutionChange}
              />
              <SectionTable
                section="needs_review"
                matches={grouped.needs_review}
                collapsed={collapsedSections.needs_review}
                onToggle={() =>
                  setCollapsedSections((s) => ({
                    ...s,
                    needs_review: !s.needs_review,
                  }))
                }
                resolutions={resolutions}
                clearingPayments={clearingPayments}
                onAcceptChange={handleAcceptChange}
                onResolutionChange={handleResolutionChange}
              />
              <SectionTable
                section="exception"
                matches={grouped.exception}
                collapsed={collapsedSections.exception}
                onToggle={() =>
                  setCollapsedSections((s) => ({
                    ...s,
                    exception: !s.exception,
                  }))
                }
                resolutions={resolutions}
                clearingPayments={clearingPayments}
                onAcceptChange={handleAcceptChange}
                onResolutionChange={handleResolutionChange}
              />
            </div>

            <SettlementSummaryPanel
              summary={reconciliationSummary}
              canRelease={canRelease}
              onRelease={() => {
                setReleased(false)
                setDepositId(undefined)
                setReleaseModalOpen(true)
              }}
              isReleasing={isReleasing}
            />
          </div>
        </>
      )}

      <ReleaseDepositModal
        open={releaseModalOpen}
        onClose={() => setReleaseModalOpen(false)}
        onConfirm={() => void handleRelease()}
        payload={releasePayload}
        isReleasing={isReleasing}
        depositId={depositId}
        released={released}
      />
    </div>
  )
}
