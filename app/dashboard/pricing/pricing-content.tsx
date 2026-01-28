"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Check,
  Sparkles,
  Printer,
  BarChart3,
  BrainCircuit,
  Clock,
  ShieldCheck,
  Plane,
  Crown,
  Loader2,
  BookOpen,
  FileText,
  Lock,
  ChevronRight,
  GraduationCap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@lib/utils"
import {
  BUNDLES,
  SUBJECT_PRODUCTS,
  ADDONS,
  getBundleByLicense,
  getSubjectProductsByLicense,
  getTotalValueByLicense,
} from "@lib/products"
import { LICENSE_TYPES, getSubjectsByLicense, type LicenseType } from "@lib/subjects"

const bundleFeatures = [
  { icon: Check, text: "All subjects included" },
  { icon: BookOpen, text: "Full learning content" },
  { icon: FileText, text: "Unlimited practice exams" },
  { icon: BrainCircuit, text: "AI-powered insights" },
  { icon: BarChart3, text: "Detailed statistics" },
  { icon: Printer, text: "Print exams & results" },
]

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

  // Fetch Stripe products for live pricing
  useEffect(() => {
    async function fetchStripeProducts() {
      try {
        const res = await fetch("/api/products")
        if (res.ok) {
          const data = await res.json()
          setStripeProducts(data.products || [])
        }
      } catch (error) {
        console.error("Failed to fetch Stripe products:", error)
      }
    }
    fetchStripeProducts()
  }, [])

  // Helper to get Stripe price for a product by matching name
  const getStripePrice = (productName: string): number | null => {
    const stripeProduct = stripeProducts.find(
      (p) => p.name.toLowerCase() === productName.toLowerCase()
    )
    return stripeProduct?.priceInCents ?? null
  }

  // Get bundle with live Stripe price
  const bundle = useMemo(() => {
    const localBundle = getBundleByLicense(selectedLicense)
    if (!localBundle) return null
    const stripePrice = getStripePrice(localBundle.name)
    return {
      ...localBundle,
      priceInCents: stripePrice ?? localBundle.priceInCents,
    }
  }, [selectedLicense, stripeProducts])

  const licenseInfo = LICENSE_TYPES.find((l) => l.id === selectedLicense)
  const subjects = getSubjectsByLicense(selectedLicense)

  // Get subject products with live Stripe prices
  const subjectProducts = useMemo(() => {
    const localProducts = getSubjectProductsByLicense(selectedLicense).filter((p) => p.tier === selectedTier)
    return localProducts.map((product) => {
      // Try to find matching Stripe product by name
      const stripePrice = getStripePrice(product.name)
      return {
        ...product,
        priceInCents: stripePrice ?? product.priceInCents,
      }
    })
  }, [selectedLicense, selectedTier, stripeProducts])

  // Get addons with live Stripe prices
  const printAddon = useMemo(() => {
    const addon = ADDONS.find((a) => a.id === "addon-printing")!
    const stripePrice = getStripePrice(addon.name) ?? getStripePrice("Print Pack Add-on")
    return { ...addon, priceInCents: stripePrice ?? addon.priceInCents }
  }, [stripeProducts])

  const aiAddon = useMemo(() => {
    const addon = ADDONS.find((a) => a.id === "addon-ai-insights")!
    const stripePrice = getStripePrice(addon.name) ?? getStripePrice("AI Insights Add-on")
    return { ...addon, priceInCents: stripePrice ?? addon.priceInCents }
  }, [stripeProducts])

  const totalIndividualValue = subjectProducts.reduce((sum, p) => sum + p.priceInCents, 0)
  const bundleSavingsPercent = bundle ? Math.round((1 - bundle.priceInCents / totalIndividualValue) * 100) : 0

  useEffect(() => {
    async function fetchPurchases() {
      try {
        const res = await fetch("/api/user/subjects")
        if (res.ok) {
          const data = await res.json()
          const purchased =
            data.subjects?.filter((s: { hasAccess: boolean }) => s.hasAccess)?.map((s: { id: string }) => s.id) || []
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

  // Reset selections when license changes
  useEffect(() => {
    setSelectedSubjects([])
  }, [selectedLicense])

  const availableSubjects = subjectProducts.filter(
    (s) => !purchasedSubjectIds.includes(s.subjectId || "") && !s.comingSoon
  )

  const toggleSubject = (id: string) => {
    setSelectedSubjects((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
  }

  const selectedTotal =
    selectedSubjects.reduce((sum, id) => {
      const product = subjectProducts.find((p) => p.id === id)
      return sum + (product?.priceInCents || 0)
    }, 0) +
    (addPrinting ? printAddon.priceInCents : 0) +
    (addAI ? aiAddon.priceInCents : 0)

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <Badge variant="secondary" className="mb-4">
          <GraduationCap className="h-3 w-3 mr-1" />
          CASA Theory Exam Prep
        </Badge>
        <h1 className="text-4xl font-bold text-foreground mb-2">Choose Your License</h1>
      </div>

      <div className="mx-12 flex flex-wrap gap-4 justify-center">
        {LICENSE_TYPES.map((license) => {
          const licenseBundle = getBundleByLicense(license.id as LicenseType)
          const licenseSubjects = getSubjectsByLicense(license.id as LicenseType)
          return (
            <div
              key={license.id}
              className={cn(
                "p-4 rounded-lg border cursor-pointer transition-all flex-grow",
                selectedLicense === license.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
              onClick={() => setSelectedLicense(license.id as LicenseType)}
            >
              <Badge className="mb-2">{license.name}</Badge>
              <h4 className="font-medium text-foreground">{license.fullName}</h4>
              <p className="text-xs text-muted-foreground mt-1 mb-3">{license.description}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-foreground">
                  ${((licenseBundle?.priceInCents || 0) / 100).toFixed(0)}
                </span>
                <span className="text-xs text-muted-foreground">/quarter</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {licenseSubjects.length} subjects included
              </p>
            </div>
          )
        })}
      </div>

      {/* License Description */}
      <div className="text-center max-w-xl mx-auto">
        <h2 className="text-xl font-semibold text-foreground">{licenseInfo?.fullName}</h2>
        <p className="text-sm text-muted-foreground mt-1">{licenseInfo?.description}</p>
      </div>

      {/* Coming Soon Message */}
      {licenseInfo?.comingSoon ? (
        <Card className="max-w-lg mx-auto">
          <CardContent className="py-12 text-center">
            <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Coming Soon</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {licenseInfo.fullName} content is currently in development. Join our waitlist to be notified when it launches.
            </p>
            <Button variant="outline" onClick={() => router.push("/")}>
              Join Waitlist
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Pricing Options */}
          <Tabs defaultValue="bundle" className="space-y-6">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 bg-secondary">
              <TabsTrigger value="bundle" className="gap-2">
                <Crown className="h-4 w-4" />
                Bundle
              </TabsTrigger>
              <TabsTrigger value="individual" className="gap-2">
                <FileText className="h-4 w-4" />
                Individual Subjects
              </TabsTrigger>
            </TabsList>

            {/* Bundle Tab */}
            <TabsContent value="bundle" className="space-y-6">
              <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-primary relative overflow-hidden flex-grow">
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-bl-lg">
                    Save {bundleSavingsPercent}%
                  </div>
                  <CardHeader className="text-center pb-2">
                    <CardTitle className="text-2xl">{bundle?.name}</CardTitle>
                    <CardDescription>{bundle?.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-center">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-bold text-foreground">
                          ${((bundle?.priceInCents || 0) / 100).toFixed(0)}
                        </span>
                        <span className="text-muted-foreground">/quarter</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        <span className="line-through">${(totalIndividualValue / 100).toFixed(0)}</span> value
                      </p>
                    </div>

                    <div className="space-y-3">
                      {bundleFeatures.map((feature, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <feature.icon className="h-4 w-4 text-primary" />
                          </div>
                          <span className="text-sm text-foreground">{feature.text}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full gap-2" size="lg" onClick={handleBundlePurchase}>
                      <Sparkles className="h-4 w-4" />
                      Get {licenseInfo?.name} Bundle
                    </Button>
                  </CardFooter>
                </Card>

                <Card className="max-w-2xl flex-grow">
                  <CardHeader>
                    <CardTitle className="text-lg">Included Subjects ({subjects.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2 md:grid-cols-2">
                      {subjects.map((subject) => (
                        <div key={subject.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{subject.code}</Badge>
                            <span className="text-sm font-medium text-foreground">{subject.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{subject.totalQuestions} Qs</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Individual Tab */}
            <TabsContent value="individual" className="space-y-6">
              {/* Tier Selection */}
              <div className="max-w-2xl mx-auto">
                <div className="grid grid-cols-2 gap-4">
                  <Card
                    className={cn(
                      "cursor-pointer transition-all",
                      selectedTier === "exams-only" ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/50"
                    )}
                    onClick={() => setSelectedTier("exams-only")}
                  >
                    <CardContent className="p-4 text-center">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <h3 className="font-semibold text-foreground">Exams Only</h3>
                      <p className="text-xs text-muted-foreground mt-1">Practice questions and exams</p>
                      <Badge variant="secondary" className="mt-2">Lower Price</Badge>
                    </CardContent>
                  </Card>
                  <Card
                    className={cn(
                      "cursor-pointer transition-all",
                      selectedTier === "with-learning" ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/50"
                    )}
                    onClick={() => setSelectedTier("with-learning")}
                  >
                    <CardContent className="p-4 text-center">
                      <BookOpen className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <h3 className="font-semibold text-foreground">Exams + Learning</h3>
                      <p className="text-xs text-muted-foreground mt-1">Full course content included</p>
                      <Badge variant="default" className="mt-2">Best Value</Badge>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {availableSubjects.length === 0 ? (
                <Card className="max-w-lg mx-auto">
                  <CardContent className="py-12 text-center">
                    <Check className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                    <p className="text-lg font-medium text-foreground">You have access to all subjects!</p>
                    <p className="text-sm text-muted-foreground">Head to the exams page to start practicing.</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Subject Selection */}
                  <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                      <CardTitle className="text-lg">Select Subjects</CardTitle>
                      <CardDescription>
                        {selectedTier === "exams-only" ? "Practice exams only" : "Full learning content + exams"} (12-month access)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {availableSubjects.map((product) => {
                        const subject = subjects.find((s) => s.id === product.subjectId)
                        const isSelected = selectedSubjects.includes(product.id)
                        return (
                          <div
                            key={product.id}
                            onClick={() => toggleSubject(product.id)}
                            className={cn(
                              "flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors",
                              isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "h-5 w-5 rounded border flex items-center justify-center",
                                  isSelected ? "bg-primary border-primary" : "border-muted-foreground"
                                )}
                              >
                                {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{subject?.code}</Badge>
                                  <span className="font-medium text-foreground">{subject?.name}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {subject?.totalQuestions} questions
                                </p>
                              </div>
                            </div>
                            <span className="font-bold text-foreground">${(product.priceInCents / 100).toFixed(0)}</span>
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>

                  {/* Add-ons */}
                  <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                      <CardTitle className="text-lg">Premium Add-ons</CardTitle>
                      <CardDescription>Enhance your study experience</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                        <div className="flex items-center gap-3">
                          <Printer className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-foreground">{printAddon.name}</p>
                            <p className="text-xs text-muted-foreground">{printAddon.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-foreground">
                            +${(printAddon.priceInCents / 100).toFixed(0)}
                          </span>
                          <Switch checked={addPrinting} onCheckedChange={setAddPrinting} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                        <div className="flex items-center gap-3">
                          <BrainCircuit className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-foreground">{aiAddon.name}</p>
                            <p className="text-xs text-muted-foreground">{aiAddon.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-foreground">
                            +${(aiAddon.priceInCents / 100).toFixed(0)}
                          </span>
                          <Switch checked={addAI} onCheckedChange={setAddAI} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Summary & Checkout */}
                  <Card className="max-w-2xl mx-auto sticky bottom-4 shadow-lg border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {selectedSubjects.length} subject{selectedSubjects.length !== 1 ? "s" : ""} selected
                            {(addPrinting || addAI) && " + add-ons"}
                          </p>
                          <p className="text-2xl font-bold text-foreground">${(selectedTotal / 100).toFixed(2)}</p>
                        </div>
                        <Button
                          size="lg"
                          disabled={selectedSubjects.length === 0}
                          onClick={handleIndividualPurchase}
                          className="gap-2"
                        >
                          Continue
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Pass Guarantee */}
      <Card className="max-w-2xl mx-auto bg-secondary/30">
        <CardContent className="p-6 text-center">
          <ShieldCheck className="h-10 w-10 text-primary mx-auto mb-3" />
          <h3 className="font-semibold text-foreground mb-2">Pass Guarantee</h3>
          <p className="text-sm text-muted-foreground">
            If you don't pass your CASA exam after completing all practice exams, we'll extend your access for free
            until you do.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
