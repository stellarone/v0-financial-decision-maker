function LoadingCard({
  className,
}: {
  className?: string
}) {
  return (
    <div
      className={`animate-pulse rounded-2xl border border-border bg-card/70 ${className ?? ""}`}
    />
  )
}

export default function CashCalendarLoading() {
  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="h-9 w-72 animate-pulse rounded-xl bg-card" />
        <div className="h-5 w-[28rem] animate-pulse rounded-lg bg-card" />
        <p className="text-sm text-muted-foreground">
          Loading live cash calendar data from Acumatica...
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <LoadingCard className="h-28" />
        <LoadingCard className="h-28" />
        <LoadingCard className="h-28" />
        <LoadingCard className="h-28" />
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <LoadingCard className="min-h-[520px]" />
        <LoadingCard className="min-h-[520px]" />
      </div>
    </div>
  )
}
