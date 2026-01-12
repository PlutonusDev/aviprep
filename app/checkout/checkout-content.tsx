"use client";

import { createCheckoutSession, getCheckoutSessionStatus } from "@actions/stripe";
import { Button } from "@/components/ui/button";
import { calculateTotal, getProductById } from "lib/products";
import { loadStripe } from "@stripe/stripe-js";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FaArrowLeft, FaCheck, FaCreditCard, FaHandsClapping, FaLock, FaShield, FaSpinner } from "react-icons/fa6";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@radix-ui/react-dropdown-menu";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [showStripeCheckout, setShowStripeCheckout] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

    useEffect(() => {
        const productsParam = searchParams.get("products");
        if (productsParam) {
            const productIds = productsParam.split(",").filter(Boolean);
            setSelectedProducts(productIds);
        }
    }, [searchParams]);

    useEffect(() => {
        const sessionId = searchParams.get("session_id")
        if (sessionId) {
            setCheckingStatus(true)
            getCheckoutSessionStatus(sessionId)
                .then((status) => {
                    if (status.status === "complete" && status.paymentStatus === "paid") {
                        router.push("/checkout/success?session_id=" + sessionId)
                    } else {
                        setCheckingStatus(false)
                    }
                })
                .catch(() => {
                    setCheckingStatus(false)
                })
        }
    }, [searchParams, router])

    const products = selectedProducts.map(id => getProductById(id)).filter(Boolean);
    const total = calculateTotal(selectedProducts);
    const isBundle = selectedProducts.includes("cpl-bundle");

    const fetchClientSecret = useCallback(async () => {
        const returnUrl = `${window.location.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
        return await createCheckoutSession(selectedProducts, returnUrl);
    }, [selectedProducts]);

    const handleProceedToPayment = () => {
        if (selectedProducts.length === 0) return;
        setShowStripeCheckout(true);
    }

    if (selectedProducts.length === 0) {
        return (
            <div className="p-4 lg:p-6 space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="cursor-pointer" asChild>
                        <Link href="/practice/pricing">
                            <FaArrowLeft className="text-lg" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>
                        <p className="text-muted-foreground">Complete your purchase to start studying</p>
                    </div>
                </div>

                <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
                    <div className="rounded-full bg-muted p-4 mb-4">
                        <FaCreditCard className="text-muted-foreground text-lg" />
                    </div>
                    <h2 className="text-muted-foreground mb-6">Please select products from our pricing page to checkout.</h2>
                    <Button asChild className="cursor-pointer">
                        <Link href="/practice/pricing">
                            View Pricing
                        </Link>
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 lg:p-6 space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/practice/pricing">
                        <FaArrowLeft className="text-lg" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>
                    <p className="text-muted-foreground">Complete your purchase to start studying</p>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-5">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border border-border/50 bg-card/50 backdrop-blur">
                        <CardContent className="p-6">
                            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

                            <div className="space-y-4">
                                {products.map(product => (
                                    <div key={product!.id} className="flex justify-between">
                                        <div>
                                            <p className="font-medium">{product!.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {product!.type === "subscription" ? "Quarterly Subscription" : "12-Month Access"}
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
                                <span className="text-sky-400">
                                    ${(total / 100).toFixed(2)}
                                    {isBundle && <span className="text-sm font-normal text-muted-foreground">AUD/qtr</span>}
                                </span>
                            </div>

                            {isBundle && <p className="text-sm text-muted-foreground mt-2">Renews every 3 months. Cancel anytime.</p>}
                        </CardContent>
                    </Card>

                    <Card className="border border-border/50 bg-card/50 backdrop-blur">
                        <CardContent className="p-6">
                            <h3 className="font-semibold mb-4">What&apos;s Included</h3>
                            <ul className="space-y-3">
                                {isBundle ? (
                                    <>
                                        <li className="flex items-center gap-3 text-sm">
                                            <FaCheck className="text-green-500" />
                                            <span>All 7 CPL theory subjects</span>
                                        </li>
                                        <li className="flex items-center gap-3 text-sm">
                                            <FaCheck className="text-green-500" />
                                            <span>2,100+ practice questions</span>
                                        </li>
                                        <li className="flex items-center gap-3 text-sm">
                                            <FaCheck className="text-green-500" />
                                            <span>AI-powered weak point analysis</span>
                                        </li>
                                        <li className="flex items-center gap-3 text-sm">
                                            <FaCheck className="text-green-500" />
                                            <span>Detailed statistics & progress tracking</span>
                                        </li>
                                        <li className="flex items-center gap-3 text-sm">
                                            <FaCheck className="text-green-500" />
                                            <span>Printable exams & results</span>
                                        </li>
                                        <li className="flex items-center gap-3 text-sm">
                                            <FaCheck className="text-green-500" />
                                            <span>Priority support</span>
                                        </li>
                                    </>
                                ) : (
                                    products.map(product => (
                                        <li key={product!.id} className="flex items-center gap-3 text-sm">
                                            <FaCheck className="text-green-500" />
                                            <span>{product!.name} - {product!.features[0]}</span>
                                        </li>
                                    ))
                                )}
                            </ul>
                        </CardContent>
                    </Card>

                    <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <FaLock />
                            <span>SSL Secured</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <FaShield />
                            <span>Stripe Protected</span>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-3">
                    <Card className="border border-border/50 bg-card/50 backdrop-blur overflow-hidden">
                        <CardContent className="p-0">
                            {!showStripeCheckout ? (
                                <div className="p-6 space-y-6">
                                    <div className="text-center pb-4">
                                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-ful bg-sky-500/10 mb-4">
                                            <FaCreditCard className="text-sky-400" />
                                        </div>
                                        <h2 className="text-xl font-semibold">Secure Checkout</h2>
                                        <p className="text-muted-foreground mt-1">Complete your purchase with Stripe</p>
                                    </div>

                                    <div className="bg-muted/30 rounded-lg p-4">
                                        <p className="text-sm font-medium mb-3">Accepted Payment Methods</p>
                                        <div className="flex flex-wrap gap-3">
                                            <div className="flex items-center gap-2 bg-background rounded-md px-3 py-2">
                                                <FaCreditCard />
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
                                            <div className="flex items-center gap-2 bg-background roudned-md px-3 py-2">
                                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
                                                </svg>
                                                <span className="text-sm">Apple Pay</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex items-start gap-3">
                                            <div className="rounded-full bg-green-500/10 p-2">
                                                <FaShield className="text-green-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">Secure Payment</p>
                                                <p className="text-xs text-muted-foreground">256-bit encryption</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="rounded-full bg-green-500/10 p-2">
                                                <FaHandsClapping className="text-green-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">Instant Access</p>
                                                <p className="text-xs text-muted-foreground">Start studying immediately</p>
                                            </div>
                                        </div>
                                    </div>

                                    <Button onClick={handleProceedToPayment} className="cursor-pointer w-full h-12 bg-sky-500 hover:bg-sky-600 text-white font-medium" disabled={isLoading}>
                                        {isLoading ? (
                                            <>
                                                <FaSpinner className="mr-2 text-lg animate-spin" />
                                                Loading
                                            </>
                                        ) : (
                                            <>
                                                <FaLock className="mr-2 text-lg" />
                                                Proceed to Payment
                                            </>
                                        )}
                                    </Button>

                                    <p className="text-xs text-center text-muted-foreground">
                                        By proceeding, you agree to our Terms of Service and Privacy Policy
                                    </p>
                                </div>
                            ) : (
                                <EmbeddedCheckoutProvider
                                    stripe={stripePromise}
                                    options={{
                                        fetchClientSecret: fetchClientSecret
                                    }}
                                >
                                    <EmbeddedCheckout />
                                </EmbeddedCheckoutProvider>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}