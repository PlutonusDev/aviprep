"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Check,
  Sparkles,
  Printer,
  BarChart3,
  BrainCircuit,
  BookOpen,
  FileText,
  Lock,
  GraduationCap,
  Crown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from "@lib/utils"
import {
  ADDONS,
  getBundleByLicense,
  getSubjectProductsByLicense,
} from "@lib/products"
import { LICENSE_TYPES, getSubjectsByLicense, type LicenseType } from "@lib/subjects"

const bundleFeatures = [
  { icon: Check, text: "Every subject in this licence" },
  { icon: BookOpen, text: "Full learning content" },
  { icon: FileText, text: "Unlimited practice exams" },
  { icon: BrainCircuit, text: "AI-powered insights" },
  { icon: BarChart3, text: "Detailed statistics" },
  { icon: Printer, text: "Print exams & results" },
]

const FAQ = [
  {
    q: "How long does access last?",
    a: "Bundles are billed quarterly and renew until you cancel. Individual subjects are a one-off purchase with 12 months of access.",
  },
  {
    q: "Can I start with one subject and upgrade later?",
    a: "Yes. Buy any subject on its own, and move to the bundle whenever you want the rest of the licence.",
  },
  {
    q: "What is the difference between Exams only and Exams + Learning?",
    a: "Exams only gives you the question bank and practice exams. Exams + Learning adds the full course content — lessons, flash cards and quizzes — for the same subject.",
  },
  {
    q: "Do I need the add-ons?",
    a: "No. Printing and AI insights are optional extras; everything needed to prepare for the exam is included without them.",
  },
]

const money = (cents: number) => `$${(cents / 100).toFixed(0)}`

interface StripeProduct {
  id: string
  name: string
  priceInCents: number
  currency: string
  recurring: { interval: string; intervalCount: number } | null
}

export default function PricingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialLicense = (searchParams.get("license") as LicenseType) || "cpl"

  const [selectedLicense, setSelectedLicense] = useState<LicenseType>(initialLicense)
  const [selectedTier, setSelectedTier] = useState<"exams-only" | "with-learning">("with-learning")
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [addPrinting, setAddPrinting] = useState(false)
  const [addAI, setAddAI] = useState(false)
  const [purchasedSubjectIds, setPurchasedSubjectIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [stripeProducts, setStripeProducts] = useState<StripeProduct[]>([])

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch("/api/products")
        if (res.ok) {
          const data = await res.json()
          setStripeProducts(data.products ?? [])
        }
      } catch {
        // Local prices stand in when Stripe is unreachable.
      }
    }
    fetchProducts()
  }, [])

  useEffect(() => {
    async function fetchPurchases() {
      try {
        const res = await fetch("/api/user/subjects")
        if (res.ok) {
          const data = await res.json()
          // The API reports `isPurchased`; reading `hasAccess` meant this list
          // was always empty and owned subjects were offered for sale again.
          const purchased =
            data.subjects
              ?.filter((s: { isPurchased: boolean }) => s.isPurchased)
              ?.map((s: { id: string }) => s.id) ?? []
          setPurchasedSubjectIds(purchased)
        }
      } catch (error) {
        console.error("Failed to fetch purchases:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchPurchases()
  }, [])

  useEffect(() => {
    setSelectedSubjects([])
  }, [selectedLicense, selectedTier])

  const getStripePrice = (name: string) =>
    stripeProducts.find((p) => p.name.toLowerCase() === name.toLowerCase())?.priceInCents ?? null

  const bundle = useMemo(() => {
    const local = getBundleByLicense(selectedLicense)
    if (!local) return null
    return { ...local, priceInCents: getStripePrice(local.name) ?? local.priceInCents }
  }, [selectedLicense, stripeProducts])

  const licenseInfo = LICENSE_TYPES.find((l) => l.id === selectedLicense)
  const subjects = getSubjectsByLicense(selectedLicense)

  const subjectProducts = useMemo(
    () =>
      getSubjectProductsByLicense(selectedLicense)
        .filter((p) => p.tier === selectedTier)
        .map((p) => ({ ...p, priceInCents: getStripePrice(p.name) ?? p.priceInCents })),
    [selectedLicense, selectedTier, stripeProducts],
  )

  const printAddon = useMemo(() => {
    const addon = ADDONS.find((a) => a.id === "addon-printing")!
    return {
      ...addon,
      priceInCents:
        getStripePrice(addon.name) ?? getStripePrice("Print Pack Add-on") ?? addon.priceInCents,
    }
  }, [stripeProducts])

  const aiAddon = useMemo(() => {
    const addon = ADDONS.find((a) => a.id === "addon-ai-insights")!
    return {
      ...addon,
      priceInCents:
        getStripePrice(addon.name) ?? getStripePrice("AI Insights Add-on") ?? addon.priceInCents,
    }
  }, [stripeProducts])

  const availableSubjects = subjectProducts.filter(
    (s) => !purchasedSubjectIds.includes(s.subjectId || "") && !s.comingSoon,
  )

  const totalIndividualValue = subjectProducts.reduce((sum, p) => sum + p.priceInCents, 0)
  const bundleSaving = bundle ? totalIndividualValue - bundle.priceInCents : 0
  const bundleSavingsPercent =
    bundle && totalIndividualValue > 0
      ? Math.round((1 - bundle.priceInCents / totalIndividualValue) * 100)
      : 0

  const selectedTotal =
    selectedSubjects.reduce(
      (sum, id) => sum + (subjectProducts.find((p) => p.id === id)?.priceInCents ?? 0),
      0,
    ) +
    (addPrinting ? printAddon.priceInCents : 0) +
    (addAI ? aiAddon.priceInCents : 0)

  // Once the basket passes the bundle price, say so rather than letting someone
  // spend more for less.
  const bundleBeatsSelection =
    !!bundle && selectedSubjects.length > 0 && selectedTotal >= bundle.priceInCents

  const toggleSubject = (id: string) =>
    setSelectedSubjects((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    )

  const handleBundlePurchase = () => {
    if (bundle?.comingSoon) return
    router.push(`/dashboard/checkout?products=${bundle?.id}`)
  }

  const handleIndividualPurchase = () => {
    if (selectedSubjects.length === 0) return
    const products = [...selectedSubjects]
    if (addPrinting) products.push("addon-printing")
    if (addAI) products.push("addon-ai-insights")
    router.push(`/dashboard/checkout?products=${products.join(",")}`)
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-8 p-4 lg:p-8">
        <Skeleton className="mx-auto h-9 w-72" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 p-4 pb-28 lg:p-8 lg:pb-28">
      <header className="mx-auto max-w-2xl space-y-3 text-center">
        <Badge variant="secondary" className="gap-1">
          <GraduationCap className="h-3 w-3" aria-hidden="true" />
          CASA theory exam prep
        </Badge>
        <h1 className="text-display-3 font-bold text-foreground">Choose your licence</h1>
        <p className="text-muted-foreground">
          Take the whole licence as a bundle, or buy the subjects you need.
        </p>
      </header>

      {/* Licence — a real radiogroup, so it works from the keyboard. */}
      <fieldset>
        <legend className="sr-only">Licence</legend>
        <div className="flex gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-5 lg:overflow-visible">
          {LICENSE_TYPES.map((license) => {
            const licenseBundle = getBundleByLicense(license.id as LicenseType)
            const count = getSubjectsByLicense(license.id as LicenseType).length
            const active = selectedLicense === license.id
            return (
              <label
                key={license.id}
                className={cn(
                  "min-w-[13rem] shrink-0 cursor-pointer rounded-lg border p-4 transition-colors lg:min-w-0",
                  active
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-primary/40",
                )}
              >
                <input
                  type="radio"
                  name="licence"
                  value={license.id}
                  checked={active}
                  onChange={() => setSelectedLicense(license.id as LicenseType)}
                  className="sr-only"
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-foreground">{license.name}</span>
                  {active && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{license.fullName}</p>
                <p className="mt-3 text-sm text-foreground">
                  <span className="font-semibold">{money(licenseBundle?.priceInCents ?? 0)}</span>
                  <span className="text-muted-foreground">/quarter</span>
                </p>
                <p className="text-xs text-muted-foreground" data-tabular>
                  {count} subjects
                </p>
              </label>
            )
          })}
        </div>
      </fieldset>

      {licenseInfo?.comingSoon ? (
        <Card className="mx-auto max-w-lg border-dashed shadow-none">
          <CardContent className="py-12 text-center">
            <Lock className="mx-auto mb-4 h-10 w-10 text-muted-foreground" aria-hidden="true" />
            <h2 className="mb-2 text-lg font-semibold text-foreground">Coming soon</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              {licenseInfo.fullName} content is in development. Join the waitlist and we&apos;ll let
              you know when it launches.
            </p>
            <Button variant="outline" onClick={() => router.push("/")} className="h-10">
              Join waitlist
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Both routes side by side rather than behind tabs, so the choice is
              actually a comparison. */}
          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            {/* Bundle */}
            <Card className="relative overflow-hidden border-primary shadow-e3">
              <div className="absolute right-0 top-0 rounded-bl-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                Best value
              </div>
              <CardContent className="space-y-6 p-6">
                <div>
                  <div className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-primary" aria-hidden="true" />
                    <h2 className="text-lg font-semibold text-foreground">{bundle?.name}</h2>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{bundle?.description}</p>
                </div>

                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-sans text-4xl font-semibold text-foreground">
                      {money(bundle?.priceInCents ?? 0)}
                    </span>
                    <span className="text-muted-foreground">/quarter</span>
                  </div>
                  {bundleSaving > 0 && (
                    <p className="mt-1.5 text-sm">
                      <span className="text-muted-foreground line-through" data-tabular>
                        {money(totalIndividualValue)}
                      </span>{" "}
                      <span className="font-medium text-success">
                        save {money(bundleSaving)} ({bundleSavingsPercent}%)
                      </span>
                    </p>
                  )}
                </div>

                <ul className="space-y-2.5">
                  {bundleFeatures.map((feature) => (
                    <li key={feature.text} className="flex items-center gap-2.5 text-sm">
                      <feature.icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      <span className="text-foreground">{feature.text}</span>
                    </li>
                  ))}
                </ul>

                <details className="rounded-lg border border-border">
                  <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-foreground">
                    {subjects.length} subjects included
                  </summary>
                  <ul className="space-y-1 border-t border-border px-4 py-3">
                    {subjects.map((s) => (
                      <li key={s.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {s.code}
                        </Badge>
                        <span className="truncate">{s.name}</span>
                      </li>
                    ))}
                  </ul>
                </details>

                <Button onClick={handleBundlePurchase} size="lg" className="h-11 w-full gap-2">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  Get the {licenseInfo?.name} bundle
                </Button>
              </CardContent>
            </Card>

            {/* Individual subjects */}
            <Card className="shadow-e1">
              <CardContent className="space-y-6 p-6">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Pick individual subjects</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    One-off purchase, 12 months of access each.
                  </p>
                </div>

                <fieldset className="space-y-2">
                  <legend className="mb-2 text-sm font-medium text-foreground">What&apos;s included</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      { id: "exams-only", label: "Exams only", hint: "Question bank and practice exams" },
                      { id: "with-learning", label: "Exams + Learning", hint: "Adds the full course content" },
                    ].map((tier) => {
                      const active = selectedTier === tier.id
                      return (
                        <label
                          key={tier.id}
                          className={cn(
                            "cursor-pointer rounded-lg border p-3 transition-colors",
                            active
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : "border-border hover:border-primary/40",
                          )}
                        >
                          <input
                            type="radio"
                            name="tier"
                            value={tier.id}
                            checked={active}
                            onChange={() => setSelectedTier(tier.id as typeof selectedTier)}
                            className="sr-only"
                          />
                          <span className="block text-sm font-medium text-foreground">{tier.label}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">{tier.hint}</span>
                        </label>
                      )
                    })}
                  </div>
                </fieldset>

                {availableSubjects.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-8 text-center">
                    <Check className="mx-auto mb-3 h-8 w-8 text-success" aria-hidden="true" />
                    <p className="font-medium text-foreground">You already own every subject here</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Head to practice exams to start studying.
                    </p>
                  </div>
                ) : (
                  <fieldset className="space-y-2">
                    <legend className="mb-2 text-sm font-medium text-foreground">Subjects</legend>
                    {availableSubjects.map((product) => {
                      const subject = subjects.find((s) => s.id === product.subjectId)
                      const checked = selectedSubjects.includes(product.id)
                      return (
                        <label
                          key={product.id}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
                            checked
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/40",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSubject(product.id)}
                            className="h-4 w-4 shrink-0 accent-primary"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <Badge variant="outline" className="shrink-0 text-xs">
                                {subject?.code}
                              </Badge>
                              <span className="truncate text-sm font-medium text-foreground">
                                {subject?.name}
                              </span>
                            </span>
                          </span>
                          <span className="shrink-0 text-sm font-semibold text-foreground" data-tabular>
                            {money(product.priceInCents)}
                          </span>
                        </label>
                      )
                    })}
                  </fieldset>
                )}

                {availableSubjects.length > 0 && (
                  <fieldset className="space-y-2 border-t border-border pt-5">
                    <legend className="mb-2 text-sm font-medium text-foreground">
                      Optional extras
                    </legend>
                    {[
                      { addon: printAddon, checked: addPrinting, set: setAddPrinting, icon: Printer },
                      { addon: aiAddon, checked: addAI, set: setAddAI, icon: BrainCircuit },
                    ].map(({ addon, checked, set, icon: Icon }) => (
                      <label
                        key={addon.id}
                        className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:border-primary/40"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => set(e.target.checked)}
                          className="h-4 w-4 shrink-0 accent-primary"
                        />
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="min-w-0 flex-1 text-sm text-foreground">{addon.name}</span>
                        <span className="shrink-0 text-sm font-semibold text-foreground" data-tabular>
                          {money(addon.priceInCents)}
                        </span>
                      </label>
                    ))}
                  </fieldset>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Objections, per the pricing pattern. */}
          <section className="mx-auto max-w-3xl">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Common questions</h2>
            <Accordion type="single" collapsible className="w-full">
              {FAQ.map((item) => (
                <AccordionItem key={item.q} value={item.q}>
                  <AccordionTrigger className="text-left text-sm">{item.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

          {/* Running total stays put instead of scrolling away. */}
          {selectedSubjects.length > 0 && (
            <div
              role="region"
              aria-label="Your selection"
              className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 border-t lg:bottom-0 border-border bg-background/95 backdrop-blur lg:left-64"
            >
              <div className="mx-auto flex max-w-6xl flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between lg:px-8">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground" data-tabular>
                    {selectedSubjects.length}{" "}
                    {selectedSubjects.length === 1 ? "subject" : "subjects"}
                    {addPrinting || addAI ? " + extras" : ""}
                  </p>
                  <p className="font-sans text-2xl font-semibold text-foreground" data-tabular>
                    {money(selectedTotal)}
                  </p>
                  {bundleBeatsSelection && (
                    <p className="text-xs text-warning">
                      The bundle costs {money(bundle!.priceInCents)} and covers every subject.
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  {bundleBeatsSelection && (
                    <Button variant="outline" onClick={handleBundlePurchase} className="h-11">
                      Switch to bundle
                    </Button>
                  )}
                  <Button onClick={handleIndividualPurchase} size="lg" className="h-11 flex-1 sm:flex-none">
                    Continue to checkout
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
