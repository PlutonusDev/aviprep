"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, ShoppingCart, Mail } from "lucide-react"

interface Purchase {
  id: string
  licenseType: string
  productType: string
  subjectId: string | null
  subjectName: string | null
  tier: string
  totalSeats: number
  usedSeats: number
  seatsRemaining: number
  pricePerSeat: number
  totalPrice: number
  purchasedAt: string
  expiresAt: string
  isExpired: boolean
}

interface Totals {
  seats: number
  used: number
  activeSeats: number
  spend: number
}

const money = (cents: number) => `$${(cents / 100).toLocaleString("en-AU")}`
const date = (iso: string) => new Date(iso).toLocaleDateString("en-AU")

export default function SchoolPurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [totals, setTotals] = useState<Totals | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/school/purchases")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Could not load purchases"))))
      .then((d) => {
        setPurchases(d.purchases ?? [])
        setTotals(d.totals ?? null)
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Something went wrong"))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-4 lg:p-8">
      <header className="space-y-1.5">
        <h1 className="text-display-3 font-bold text-foreground">Purchases</h1>
        <p className="text-muted-foreground">Seats bought for your school, and how many are in use.</p>
      </header>

      {error && (
        <Alert variant="destructive" role="alert">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[88px] rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : (
        <>
          {totals && (
            <section aria-label="Seat summary">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  { label: "Active seats", value: String(totals.activeSeats) },
                  { label: "Seats in use", value: String(totals.used) },
                  {
                    label: "Available",
                    value: String(Math.max(0, totals.activeSeats - totals.used)),
                  },
                  { label: "Total spend", value: money(totals.spend) },
                ].map((tile) => (
                  <div key={tile.label} className="rounded-lg border border-border bg-card p-4">
                    <p className="text-xs font-medium text-muted-foreground">{tile.label}</p>
                    <p className="mt-2 font-sans text-2xl font-semibold text-foreground">
                      {tile.value}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {purchases.length === 0 ? (
            <Card className="border-dashed shadow-none">
              <CardContent className="p-10 text-center">
                <ShoppingCart
                  className="mx-auto mb-4 h-10 w-10 text-muted-foreground"
                  aria-hidden="true"
                />
                <h2 className="mb-2 font-semibold text-foreground">No purchases yet</h2>
                <p className="mx-auto mb-5 max-w-sm text-sm text-muted-foreground">
                  School seat packs are arranged with us directly. Get in touch and we&apos;ll set
                  your school up.
                </p>
                <Button asChild className="h-10 gap-2">
                  <a href="mailto:hello@aviprep.com.au?subject=School%20seats">
                    <Mail className="h-4 w-4" aria-hidden="true" />
                    Contact AviPrep
                  </a>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-3">
              {purchases.map((p) => {
                const usedPct = p.totalSeats > 0 ? (p.usedSeats / p.totalSeats) * 100 : 0
                return (
                  <li key={p.id}>
                    <Card className="shadow-e1">
                      <CardContent className="space-y-4 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="font-semibold text-foreground">
                                {p.subjectName ?? `${p.licenseType.toUpperCase()} bundle`}
                              </h2>
                              <Badge variant="outline" className="text-xs uppercase">
                                {p.licenseType}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {p.tier === "with-learning" ? "Exams + Learning" : "Exams only"}
                              </Badge>
                              {p.isExpired && (
                                <Badge className="bg-destructive/15 text-xs text-destructive">
                                  Expired
                                </Badge>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Bought {date(p.purchasedAt)} · {p.isExpired ? "expired" : "expires"}{" "}
                              {date(p.expiresAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-foreground" data-tabular>
                              {money(p.totalPrice)}
                            </p>
                            <p className="text-xs text-muted-foreground" data-tabular>
                              {money(p.pricePerSeat)} per seat
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-baseline justify-between text-xs">
                            <span className="text-muted-foreground">Seats in use</span>
                            <span className="font-medium text-foreground" data-tabular>
                              {p.usedSeats} of {p.totalSeats}
                            </span>
                          </div>
                          <Progress value={usedPct} className="h-1.5" />
                          {p.seatsRemaining === 0 && !p.isExpired && (
                            <p className="text-xs text-warning">
                              Every seat is allocated. Buy more to enrol additional students.
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
