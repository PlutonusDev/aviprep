"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
  Zap,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CPL_BUNDLE, SUBJECTS, ADDONS } from "@lib/products"

const bundleFeatures = [
  { icon: Check, text: "Access to all 7 CPL theory subjects" },
  { icon: Printer, text: "Print practice exams & results" },
  { icon: BrainCircuit, text: "AI-powered weak point analysis" },
  { icon: BarChart3, text: "Detailed performance statistics" },
  { icon: Clock, text: "Unlimited exam attempts" },
  { icon: ShieldCheck, text: "Priority support" },
]

const individualFeatures = [
  { icon: Check, text: "Full question bank access" },
  { icon: Clock, text: "Unlimited practice exams" },
  { icon: BarChart3, text: "Basic statistics" },
]

const printAddon = ADDONS.find((a) => a.id === "addon-printing")!
const aiAddon = ADDONS.find((a) => a.id === "addon-ai-insights")!

const totalIndividualValue = SUBJECTS.reduce((sum, s) => sum + s.priceInCents, 0)
const bundleSavingsPercent = Math.round((1 - CPL_BUNDLE.priceInCents / totalIndividualValue) * 100)

export default function PricingContent() {
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [addPrinting, setAddPrinting] = useState(false)
  const [addAI, setAddAI] = useState(false)
  const [purchasedSubjectIds, setPurchasedSubjectIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

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

  const availableSubjects = SUBJECTS.filter((s) => !purchasedSubjectIds.includes(s.subjectId || s.id))

  const toggleSubject = (id: string) => {
    setSelectedSubjects((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
  }

  const selectedTotal =
    selectedSubjects.reduce((sum, id) => {
      const subject = SUBJECTS.find((s) => s.id === id)
      return sum + (subject?.priceInCents || 0)
    }, 0) +
    (addPrinting ? printAddon.priceInCents : 0) +
    (addAI ? aiAddon.priceInCents : 0)

  const handleBundlePurchase = () => {
    router.push("/checkout?products=cpl-bundle")
  }

  const handleIndividualPurchase = () => {
    if (selectedSubjects.length === 0) return
    const products = [...selectedSubjects]
    if (addPrinting) products.push("addon-printing")
    if (addAI) products.push("addon-ai-insights")
    router.push(`/checkout?products=${products.join(",")}`)
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
          <Plane className="h-3 w-3 mr-1" />
          CASA CPL Theory Prep
        </Badge>
        <h1 className="text-3xl font-bold text-foreground mb-2">Choose Your Study Plan</h1>
        <p className="text-muted-foreground">
          Get unlimited access to practice exams with detailed explanations and performance tracking
        </p>
      </div>

      {/* Pricing Tabs */}
      <Tabs defaultValue="bundle" className="space-y-6">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 bg-secondary">
          <TabsTrigger value="bundle" className="gap-2">
            <Crown className="h-4 w-4" />
            Bundle
          </TabsTrigger>
          <TabsTrigger value="individual" className="gap-2">
            <Zap className="h-4 w-4" />
            Individual
          </TabsTrigger>
        </TabsList>

        {/* Bundle Tab */}
        <TabsContent value="bundle" className="space-y-6">
          <div className="max-w-lg mx-auto">
            <Card className="border-primary relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-bl-lg">
                Best Value
              </div>
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl">{CPL_BUNDLE.name}</CardTitle>
                <CardDescription>{CPL_BUNDLE.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-foreground">
                      ${(CPL_BUNDLE.priceInCents / 100).toFixed(0)}
                    </span>
                    <span className="text-muted-foreground">/quarter</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    <span className="line-through">${(totalIndividualValue / 100).toFixed(0)}</span> Save{" "}
                    {bundleSavingsPercent}%
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
                  Get Complete Bundle
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Subject list preview - using actual SUBJECTS data */}
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-lg">Included Subjects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2">
                {SUBJECTS.map((subject) => (
                  <div key={subject.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{subject.code}</Badge>
                      <span className="text-sm font-medium text-foreground">{subject.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{subject.features[0]}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Individual Tab */}
        <TabsContent value="individual" className="space-y-6">
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
              {/* Subject Selection - using actual SUBJECTS data */}
              <Card className="max-w-2xl mx-auto">
                <CardHeader>
                  <CardTitle className="text-lg">Select Subjects</CardTitle>
                  <CardDescription>Choose the subjects you want to study (12-month access)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {availableSubjects.map((subject) => {
                    const isSelected = selectedSubjects.includes(subject.id)
                    return (
                      <div
                        key={subject.id}
                        onClick={() => toggleSubject(subject.id)}
                        className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-5 w-5 rounded border flex items-center justify-center ${isSelected ? "bg-primary border-primary" : "border-muted-foreground"
                              }`}
                          >
                            {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{subject.code}</Badge>
                              <span className="font-medium text-foreground">{subject.name}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{subject.features[0]}</p>
                          </div>
                        </div>
                        <span className="font-bold text-foreground">${(subject.priceInCents / 100).toFixed(0)}</span>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              {/* Add-ons - using actual ADDONS data */}
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
              <Card className="max-w-2xl mx-auto sticky bottom-4 shadow-lg">
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
                      className="cursor-pointer gap-2"
                    >
                      Continue to Checkout
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Features included */}
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-lg">What's Included</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {individualFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <feature.icon className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm text-foreground">{feature.text}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="font-medium text-foreground">
              How long does access last?
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Individual subjects give you 12 months of access from purchase date. The CPL Bundle renews every 3 months of continuous access.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">
              Can I upgrade later?
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Yes! You can upgrade to the CPL Bundle at any time. We'll credit you for any remaining time on individual purchases.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">
              Are the questions aligned with the PEXO exams?
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              All questions are written to match the style and difficulty of actual CASA PEXO theory exams, covering the entirety of all syllabus areas.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">
              What payment methods do you accept?
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              We accept all major credit cards, PayPal, Google Pay, and Apple Pay. All transactions are secured with 256-bit encryption.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
