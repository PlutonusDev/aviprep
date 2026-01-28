"use client"

import { useState, useCallback, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { loadStripe } from "@stripe/stripe-js"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { ArrowLeft, Check, CreditCard, Loader2, Lock, Shield, Sparkles } from "lucide-react"
import { SiKlarna, SiAfterpay } from "react-icons/si"
import Link from "@/components/meta/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { createCheckoutSession, getCheckoutSessionStatus } from "@actions/stripe"
import { getProductById, calculateTotal, CPL_BUNDLE } from "@lib/products"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export default function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [showStripeCheckout, setShowStripeCheckout] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [checkingStatus, setCheckingStatus] = useState(false)

  useEffect(() => {
    const productsParam = searchParams.get("products")
    if (productsParam) {
      const productIds = productsParam.split(",").filter(Boolean)
      setSelectedProducts(productIds)
    }
    window.history.replaceState({ ...window.history.state }, "", "/dashboard/checkout")
  }, [searchParams])

  useEffect(() => {
    const sessionId = searchParams.get("session_id")
    if (sessionId) {
      setCheckingStatus(true)
      getCheckoutSessionStatus(sessionId)
        .then((status) => {
          if (status.status === "complete" && status.paymentStatus === "paid") {
            router.push("/dashboard/checkout/success?session_id=" + sessionId)
          } else {
            setCheckingStatus(false)
          }
        })
        .catch(() => {
          setCheckingStatus(false)
        })
    }
  }, [searchParams, router])

  const products = selectedProducts.map((id) => getProductById(id)).filter(Boolean)
  const total = calculateTotal(selectedProducts)
  const isBundle = selectedProducts.includes("cpl-bundle")

  const fetchClientSecret = useCallback(async () => {
    const returnUrl = `${window.location.origin}/dashboard/checkout/success?session_id={CHECKOUT_SESSION_ID}`
    return await createCheckoutSession(selectedProducts, returnUrl)
  }, [selectedProducts])

  const handleProceedToPayment = () => {
    if (selectedProducts.length === 0) return
    setShowStripeCheckout(true)
  }

  if (checkingStatus) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <h2 className="text-xl font-semibold mb-2">Verifying your payment...</h2>
        <p className="text-muted-foreground">Please wait while we confirm your purchase.</p>
      </div>
    )
  }

  if (selectedProducts.length === 0) {
    return (
      <div className="space-y-6 p-4 lg:p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/pricing">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>
            <p className="text-muted-foreground">Complete your purchase to start studying</p>
          </div>
        </div>

        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <CreditCard className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No items selected</h2>
          <p className="text-muted-foreground mb-6">Please select products from our pricing page to checkout.</p>
          <Button asChild>
            <Link href="/dashboard/pricing">View Pricing</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/pricing">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>
          <p className="text-muted-foreground">Complete your purchase to start studying</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

              <div className="space-y-4">
                {products.map((product) => (
                  <div key={product!.id} className="flex justify-between">
                    <div>
                      <p className="font-medium">{product!.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {product!.type === "subscription" ? "Quarterly subscription" : "12-month access"}
                      </p>
                    </div>
                    <p className="font-medium">
                      ${(product!.priceInCents / 100).toFixed(2)}
                      {product!.type === "subscription" && <span className="text-sm text-muted-foreground">/qtr</span>}
                    </p>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span className="text-primary">
                  ${(total / 100).toFixed(2)}
                  {isBundle && <span className="text-sm font-normal text-muted-foreground"> AUD/qtr</span>}
                </span>
              </div>

              {isBundle && <p className="text-sm text-muted-foreground mt-2">Renews every 3 months. Cancel anytime.</p>}
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">What&apos;s Included</h3>
              <ul className="space-y-3">
                {isBundle ? (
                  <>
                    {CPL_BUNDLE.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-3 text-sm">
                        <Check className="h-4 w-4 text-emerald-400" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </>
                ) : (
                  products.map((product) => (
                    <li key={product!.id} className="flex items-center gap-3 text-sm">
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span>
                        {product!.name} - {product!.features[0]}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </CardContent>
          </Card>

          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <span>SSL Secured</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>Stripe Protected</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <Card className="border-border/50 bg-card/50 backdrop-blur overflow-hidden">
            <CardContent className="p-0">
              {!showStripeCheckout ? (
                <div className="p-6 space-y-6">
                  <div className="text-center pb-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                      <CreditCard className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="text-xl font-semibold">Secure Checkout</h2>
                    <p className="text-muted-foreground mt-1">Complete your purchase with Stripe</p>
                  </div>

                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-sm font-medium mb-3">Accepted Payment Methods</p>
                    <div className="flex flex-wrap gap-3">
                      <div className="flex items-center gap-2 bg-background rounded-md px-3 py-2">
                        <CreditCard className="h-4 w-4" />
                        <span className="text-sm">Credit Card</span>
                      </div>
                      <div className="flex items-center gap-2 bg-background rounded-md px-3 py-2">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                          <path
                            d="M12 24c6.627 0 12-5.373 12-12S18.627 0 12 0 0 5.373 0 12s5.373 12 12 12z"
                            fillOpacity="0.1"
                          />
                          <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C6.477 2 1.545 6.932 1.545 13s4.932 11 11 11c6.351 0 10.545-4.463 10.545-10.75 0-.72-.068-1.262-.179-1.811h-10.366z" />
                        </svg>
                        <span className="text-sm">Google Pay</span>
                      </div>
                      <div className="flex items-center gap-2 bg-background rounded-md px-3 py-2">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
                        </svg>
                        <span className="text-sm">Apple Pay</span>
                      </div>
                      <div className="flex items-center gap-2 bg-background rounded-md px-3 py-2">
                        <SiKlarna className="text-sm" />
                        Klarna
                      </div>
                      <div className="flex items-center gap-2 bg-background rounded-md px-3 py-2">
                        <SiAfterpay className="text-sm" />
                        Afterpay
                      </div>
                      <div className="flex items-center gap-2 bg-background rounded-md px-3 py-2">
                        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 768 285" fill="currentColor">
                          <g id="Logos">
                            <polygon className="cls-1" points="19.7 227.91 26.36 282.16 259.52 282.16 251.89 220.03 143.17 220.03 142.22 212.32 242.35 142.36 235.67 87.99 2.52 87.99 10.14 150.13 119.04 150.13 120 157.89 19.7 227.91" />
                            <polygon className="cls-2" points="262.76 87.99 286.6 282.16 519.94 282.16 496.09 87.99 262.76 87.99" />
                            <path className="cls-1" d="M764.64,157.9C759.26,114.25,725,87.8,678.37,88H523.17L547,282.16h69.82l-4.78-38.83h73.89C744.1,243.33,770.71,207.09,764.64,157.9Zm-86.24,31-73,.08-5.72-46.6,73.41.06c17.27.2,26.1,9.92,27.52,23.23C701.49,174.22,697.57,188.89,678.4,188.89Z" />
                            <ellipse className="cls-1" cx="306.9" cy="37.62" rx="32.7" ry="37.01" transform="translate(69.29 235.48) rotate(-46.77)" />
                          </g>
                        </svg>
                        ZipPay
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-emerald-500/10 p-2">
                        <Shield className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Secure Payment</p>
                        <p className="text-xs text-muted-foreground">256-bit encryption</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-primary/10 p-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Instant Access</p>
                        <p className="text-xs text-muted-foreground">Start studying immediately</p>
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleProceedToPayment} className="w-full h-12 font-medium" size="lg">
                    <Lock className="mr-2 h-4 w-4" />
                    Proceed to Payment
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    By proceeding, you agree to our{" "}
                    <Link href="/terms" className="underline hover:text-foreground">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="underline hover:text-foreground">
                      Privacy Policy
                    </Link>
                  </p>
                </div>
              ) : (
                <div className="bg-white min-h-[500px]">
                  <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret: fetchClientSecret }}>
                    <EmbeddedCheckout />
                  </EmbeddedCheckoutProvider>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
