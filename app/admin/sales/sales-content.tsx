"use client"

import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { formatDistanceToNowStrict } from "date-fns"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { AlertTriangle, BadgeDollarSign, CheckCircle2, Download, Landmark, Loader2, PiggyBank, Receipt, RotateCw, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { LoadError, PageHeader, PageShell, SectionHeading, StatTile } from "@/components/hub/page-primitives"
import { aud, parsePeriod, periodAt, periodLabel, shiftPeriod, type Tier } from "@lib/finance/money"
import { cn } from "@lib/utils"

interface Totals {
  units: number
  orders: number
  byTier: Record<Tier, { units: number; grossCents: number }>
  grossCents: number
  refundedCents: number
  gstCents: number
  feeCents: number
  netCents: number
  poolCents: number
  curatorRoyaltyCents: number
  retainedCents: number
  questions: number
  lessons: number
  points: number
  curatorPoints: number
}

interface Row extends Totals {
  subjectId: string
  name: string
  code: string
  licence: string
  estimated: boolean
}

interface Report {
  from: string
  to: string
  label: string
  licences: { id: string; name: string; fullName: string; rows: Row[]; subtotal: Totals }[]
  totals: Totals
  unmatched: { count: number; grossCents: number; refundedCents: number; feeCents: number }
  series: { unit: "day" | "month"; points: { date: string; grossCents: number; netCents: number; units: number }[] }
  stripe: { ok: boolean; error?: string; fetchedAt: string }
  gstRegistered: boolean
  estimatedLines: number
}

const TICK = { fill: "var(--muted-foreground)", fontSize: 12 }
const whole = (cents: number) => aud(cents, { whole: true })
const units = (n: number) => (Number.isInteger(n) ? n.toLocaleString("en-AU") : n.toLocaleString("en-AU", { maximumFractionDigits: 1 }))

/** Ranges, as [from, to] periods relative to this month. */
function presets(now: string) {
  const p = parsePeriod(now)!
  const fyStart = p.month >= 7 ? `${p.year}-07` : `${p.year - 1}-07`
  return [
    { id: "this-month", label: "This month", from: now, to: now },
    { id: "last-month", label: "Last month", from: shiftPeriod(now, -1), to: shiftPeriod(now, -1) },
    { id: "last-3", label: "Last 3 months", from: shiftPeriod(now, -2), to: now },
    { id: "fy", label: "This financial year", from: fyStart, to: now },
    { id: "last-fy", label: "Last financial year", from: shiftPeriod(fyStart, -12), to: shiftPeriod(fyStart, -1) },
    { id: "last-12", label: "Last 12 months", from: shiftPeriod(now, -11), to: now },
  ]
}

const COLUMNS = [
  { key: "units", label: "Sold", hint: "Units. A bundle counts as a share of one per subject." },
  { key: "grossCents", label: "Gross", hint: "Charged, less refunds, including GST" },
  { key: "gstCents", label: "GST" },
  { key: "feeCents", label: "Fees", hint: "Stripe processing fees" },
  { key: "netCents", label: "Net revenue" },
  { key: "poolCents", label: "Royalty pool", hint: "25% of net revenue" },
  { key: "curatorRoyaltyCents", label: "To curators", hint: "The pool’s share earned by curators’ points" },
  { key: "retainedCents", label: "Kept", hint: "Net revenue less the royalty pool, before other costs" },
] as const

function Cells({ t, strong = false }: { t: Totals; strong?: boolean }) {
  return (
    <>
      {COLUMNS.map((c) => (
        <td key={c.key} className={cn("whitespace-nowrap px-3 py-2.5 text-right", strong ? "font-semibold text-foreground" : "text-foreground")} data-tabular>
          {c.key === "units" ? units(t.units) : whole(t[c.key])}
        </td>
      ))}
      <td className="whitespace-nowrap px-3 py-2.5 text-right text-muted-foreground" data-tabular>
        {t.questions.toLocaleString()} · {t.lessons.toLocaleString()}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-right text-muted-foreground" data-tabular>
        {t.points ? `${Math.round((t.curatorPoints / t.points) * 100)}%` : "–"}
      </td>
    </>
  )
}

function TierMix({ totals }: { totals: Totals }) {
  const tiers = [
    { id: "with-learning" as Tier, label: "Full access", tone: "bg-primary" },
    { id: "exams-only" as Tier, label: "Exams only", tone: "bg-[var(--chart-1)]" },
    { id: "bundle" as Tier, label: "Bundles", tone: "bg-[var(--chart-2)]" },
  ]
  const gross = tiers.reduce((n, t) => n + totals.byTier[t.id].grossCents, 0)
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-e1 sm:p-5">
      <p className="text-sm font-medium text-foreground">What people buy</p>
      <p className="text-xs text-muted-foreground">Share of gross sales</p>
      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-muted" role="img" aria-label={tiers.map((t) => `${t.label} ${gross ? Math.round((totals.byTier[t.id].grossCents / gross) * 100) : 0}%`).join(", ")}>
        {tiers.map((t) => (
          <div key={t.id} className={t.tone} style={{ width: `${gross ? (totals.byTier[t.id].grossCents / gross) * 100 : 0}%` }} />
        ))}
      </div>
      <ul className="mt-4 space-y-2.5">
        {tiers.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-foreground">
              <span aria-hidden="true" className={cn("h-2.5 w-2.5 rounded-sm", t.tone)} />
              {t.label}
            </span>
            <span className="text-muted-foreground" data-tabular>
              {units(totals.byTier[t.id].units)} sold · <span className="font-medium text-foreground">{whole(totals.byTier[t.id].grossCents)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function SalesContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const now = useMemo(() => periodAt(new Date()), [])
  const ranges = useMemo(() => presets(now), [now])

  const rangeId = searchParams.get("range") ?? "this-month"
  const range = ranges.find((r) => r.id === rangeId) ?? ranges[0]

  const [report, setReport] = useState<Report | null>(null)
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(
    async (refresh = false) => {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/sales?from=${range.from}&to=${range.to}${refresh ? "&refresh=1" : ""}`)
        if (!res.ok) throw new Error()
        setReport((await res.json()).report)
        setFailed(false)
      } catch {
        setFailed(true)
      } finally {
        setLoading(false)
      }
    },
    [range.from, range.to],
  )

  useEffect(() => {
    load()
  }, [load])

  function exportCsv() {
    if (!report) return
    const header = ["Licence", "Subject", "Code", "Sold", "Orders", "Gross", "Refunds", "GST", "Fees", "Net revenue", "Royalty pool", "To curators", "Kept", "Live questions", "Live lessons", "Points", "Curator points"]
    const money = (c: number) => (c / 100).toFixed(2)
    const line = (licence: string, name: string, code: string, t: Totals) =>
      [licence, name, code, units(t.units), t.orders, money(t.grossCents), money(t.refundedCents), money(t.gstCents), money(t.feeCents), money(t.netCents), money(t.poolCents), money(t.curatorRoyaltyCents), money(t.retainedCents), t.questions, t.lessons, t.points, t.curatorPoints]
    const rows: (string | number)[][] = [header]
    for (const l of report.licences) {
      for (const r of l.rows) rows.push(line(l.name, r.name, r.code, r))
      rows.push(line(l.name, `${l.name} subtotal`, "", l.subtotal))
    }
    rows.push(line("", "Total", "", report.totals))
    const csv = rows.map((r) => r.map((v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v)).join(",")).join("\r\n")
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv" }))
    const a = Object.assign(document.createElement("a"), { href: url, download: `AviPrep-sales-${report.from}-to-${report.to}.csv` })
    a.click()
    URL.revokeObjectURL(url)
  }

  if (failed && !report) return <LoadError title="Couldn't load sales" message="Refresh to try again." />

  const t = report?.totals
  const chartData = (report?.series.points ?? []).map((p) => ({
    ...p,
    label:
      report?.series.unit === "month"
        ? periodLabel(p.date).replace(/ \d{4}$/, "").slice(0, 3)
        : new Date(`${p.date}T12:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "short" }),
    gross: p.grossCents / 100,
    net: p.netCents / 100,
  }))

  return (
    <PageShell>
      <PageHeader title="Sales" description="What’s selling, and what’s left after GST, fees and royalties.">
        <div className="flex flex-wrap items-center gap-2 self-start">
          <Select
            value={range.id}
            onValueChange={(id) => {
              const params = new URLSearchParams(searchParams.toString())
              params.set("range", id)
              router.replace(`${pathname}?${params}`, { scroll: false })
            }}
          >
            <SelectTrigger className="h-10 w-48" aria-label="Date range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ranges.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="h-10 gap-2" onClick={() => load(true)} disabled={loading} aria-label="Refresh from Stripe">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RotateCw className="h-4 w-4" aria-hidden="true" />}
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button variant="outline" className="h-10 gap-2" onClick={exportCsv} disabled={!report}>
            <Download className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">CSV</span>
          </Button>
        </div>
      </PageHeader>

      {report && (
        <p
          className={cn(
            "-mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm",
            report.stripe.ok && !report.estimatedLines ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {report.stripe.ok ? (
            <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
          )}
          <span className="font-medium text-foreground">{report.label}</span>
          <span aria-hidden="true">·</span>
          {report.stripe.ok ? (
            <span>
              From Stripe, updated {formatDistanceToNowStrict(new Date(report.stripe.fetchedAt), { addSuffix: true })}
              {report.estimatedLines > 0 && `. ${report.estimatedLines} sale${report.estimatedLines === 1 ? "" : "s"} weren’t in Stripe, so they’re estimated`}
            </span>
          ) : (
            <span>{report.stripe.error}</span>
          )}
          {!report.gstRegistered && <span className="text-muted-foreground">· Not registered for GST</span>}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {t ? (
          <>
            <StatTile icon={Receipt} label="Gross sales" value={whole(t.grossCents)} detail={`${units(t.orders)} orders${t.refundedCents ? ` · ${whole(t.refundedCents)} refunded` : ""}`} />
            <StatTile icon={Landmark} label="Net revenue" value={whole(t.netCents)} detail={`After ${whole(t.gstCents)} GST and ${whole(t.feeCents)} fees`} />
            <StatTile icon={PiggyBank} label="Royalty pool" value={whole(t.poolCents)} detail={`${whole(t.curatorRoyaltyCents)} earned by curators`} />
            <StatTile icon={Wallet} label="Kept" value={whole(t.retainedCents)} detail="After the royalty pool" />
          </>
        ) : (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[88px] rounded-lg" />)
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-border bg-card p-4 shadow-e1 sm:p-5 lg:col-span-2" aria-label="Sales over time">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">Sales by {report?.series.unit ?? "day"}</p>
              <p className="text-xs text-muted-foreground">Gross and net revenue</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-primary/35" />
                Gross
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-[var(--chart-mark)]" />
                Net
              </span>
            </div>
          </div>
          <div className="mt-4 h-56">
            {report ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: -8 }} barGap={-14}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={TICK} tickLine={false} axisLine={{ stroke: "var(--border)" }} minTickGap={16} />
                  <YAxis tick={TICK} tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`)} />
                  <Tooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                    content={({ active, payload }) => {
                      const d = active && payload?.[0] ? (payload[0].payload as (typeof chartData)[number]) : null
                      if (!d) return null
                      return (
                        <div className="rounded-md border border-border bg-popover px-3 py-2 text-sm shadow-e2">
                          <p className="font-medium text-foreground">{d.label}</p>
                          <p className="text-xs text-muted-foreground" data-tabular>
                            Gross {aud(d.grossCents)} · Net {aud(d.netCents)}
                          </p>
                          <p className="text-xs text-muted-foreground" data-tabular>
                            {units(d.units)} sold
                          </p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="gross" fill="color-mix(in oklab, var(--primary) 35%, transparent)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
                  <Bar dataKey="net" fill="var(--chart-mark)" radius={[4, 4, 0, 0]} maxBarSize={14} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-full w-full rounded-lg" />
            )}
          </div>
        </section>
        {t ? <TierMix totals={t} /> : <Skeleton className="h-full min-h-60 rounded-xl" />}
      </div>

      <section>
        <SectionHeading title="By subject" description="Content is live questions and lessons now. Curator points are their share of all points." />
        {!report ? (
          <Skeleton className="h-96 rounded-xl" />
        ) : report.licences.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">No sales or live content in this range.</div>
        ) : (
          <div className={cn("overflow-hidden rounded-xl border border-border bg-card shadow-e1 transition-opacity", loading && "opacity-60")}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                    <th scope="col" className="sticky left-0 z-10 bg-muted/95 px-4 py-2.5 text-left font-medium backdrop-blur">
                      Subject
                    </th>
                    {COLUMNS.map((c) => (
                      <th key={c.key} scope="col" className="whitespace-nowrap px-3 py-2.5 text-right font-medium" title={"hint" in c ? c.hint : undefined}>
                        {c.label}
                      </th>
                    ))}
                    <th scope="col" className="whitespace-nowrap px-3 py-2.5 text-right font-medium" title="Live questions · lessons">
                      Content
                    </th>
                    <th scope="col" className="whitespace-nowrap px-3 py-2.5 text-right font-medium" title="Curators’ share of points">
                      Curators
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.licences.map((l) => (
                    <Fragment key={l.id}>
                      <tr className="border-b border-border bg-background">
                        <th colSpan={COLUMNS.length + 3} scope="colgroup" className="px-4 pb-1.5 pt-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {l.fullName}
                        </th>
                      </tr>
                      {l.rows.map((r) => (
                        <tr key={r.subjectId} className="border-b border-border/70 transition-colors hover:bg-muted/30">
                          <th scope="row" className="sticky left-0 z-10 bg-card px-4 py-2.5 text-left font-normal">
                            <span className="block max-w-[15rem] truncate text-foreground">{r.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {r.code}
                              {r.estimated && <span title="Some sales estimated: not found in Stripe"> · estimated</span>}
                            </span>
                          </th>
                          <Cells t={r} />
                        </tr>
                      ))}
                      <tr className="border-b border-border bg-muted/30">
                        <th scope="row" className="sticky left-0 z-10 bg-muted/95 px-4 py-2.5 text-left font-medium text-foreground backdrop-blur">
                          {l.name} subtotal
                        </th>
                        <Cells t={l.subtotal} strong />
                      </tr>
                    </Fragment>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-foreground/80 bg-card">
                    <th scope="row" className="sticky left-0 z-10 bg-card px-4 py-3 text-left font-semibold text-foreground">
                      Total
                    </th>
                    <Cells t={report.totals} strong />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {report && report.unmatched.count > 0 && (
          <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
            <BadgeDollarSign className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Stripe also took {whole(report.unmatched.grossCents)} across {report.unmatched.count} charge{report.unmatched.count === 1 ? "" : "s"} that don’t match a purchase
              (renewals, add-ons or manual invoices). They aren’t in the table or the royalty pool.
            </span>
          </p>
        )}
      </section>
    </PageShell>
  )
}
