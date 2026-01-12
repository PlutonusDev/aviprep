"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { CheckCircle2, ArrowRight, Loader2, BookOpen, BarChart3, Sparkles } from "lucide-react"
import Link from "next/link"
import confetti from "canvas-confetti"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getCheckoutSessionStatus } from "@actions/stripe"

export default function SuccessContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
    const [customerEmail, setCustomerEmail] = useState<string | null>(null)

    useEffect(() => {
        const sessionId = searchParams.get("session_id")

        if (!sessionId) {
            router.push("/practice/pricing")
            return
        }

        getCheckoutSessionStatus(sessionId)
            .then((result) => {
                if (result.status === "complete" && result.paymentStatus === "paid") {
                    setStatus("success")
                    setCustomerEmail(result.customerEmail || null)

                    // Trigger confetti celebration
                    confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 1 },
                        colors: ["#0ea5e9", "#22c55e", "#f59e0b"],
                    })

                    setTimeout(() => router.push("/practice"), 10000);
                } else {
                    setStatus("error")
                }
            })
            .catch(() => {
                setStatus("error")
            })
    }, [searchParams, router])

    if (status === "loading") {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
                <Loader2 className="h-12 w-12 animate-spin text-sky-400 mb-4" />
                <h2 className="text-xl font-semibold mb-2">Verifying your payment...</h2>
                <p className="text-muted-foreground">Please wait while we confirm your purchase.</p>
            </div>
        )
    }

    if (status === "error") {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
                <div className="rounded-full bg-destructive/10 p-4 mb-4">
                    <svg className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>
                <h2 className="text-xl font-semibold mb-2">Payment verification failed</h2>
                <p className="text-muted-foreground mb-6">
                    We couldn't verify your payment. Please try again or contact support.
                </p>
                <div className="flex gap-4">
                    <Button variant="outline" asChild>
                        <Link href="/practice/pricing">Try Again</Link>
                    </Button>
                    <Button asChild>
                        <Link href="/practice">Go to Dashboard</Link>
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 lg:p-6 space-y-6">
            <div className="flex-col items-center justify-center">

                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Payment Successful!</h1>
                    <p className="text-muted-foreground text-lg">Welcome to the AviPrep Study Hub. Your access has been activated.</p>
                    {customerEmail && (
                        <p className="text-sm text-muted-foreground">
                            A confirmation email has been sent to <span className="font-medium text-foreground">{customerEmail}</span>
                        </p>
                    )}
                </div>

                <h2 className="font-semibold mb-4 mt-12">What&apos;s Next?</h2>
                <div className="grid gap-4 text-left">
                    <div className="flex items-start gap-4">
                        <div className="rounded-full bg-sky-500/10 p-2 shrink-0">
                            <BookOpen className="h-5 w-5 text-sky-400" />
                        </div>
                        <div>
                            <p className="font-medium">Start Practicing</p>
                            <p className="text-sm text-muted-foreground">
                                Access your subjects and begin taking practice exams right away.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="rounded-full bg-amber-500/10 p-2 shrink-0">
                            <BarChart3 className="h-5 w-5 text-amber-400" />
                        </div>
                        <div>
                            <p className="font-medium">Track Progress</p>
                            <p className="text-sm text-muted-foreground">
                                View your statistics and see how you improve over time.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="rounded-full bg-violet-500/10 p-2 shrink-0">
                            <Sparkles className="h-5 w-5 text-violet-400" />
                        </div>
                        <div>
                            <p className="font-medium">AI-Powered Insights</p>
                            <p className="text-sm text-muted-foreground">
                                Get personalized recommendations to focus your study efforts.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mt-12">
                    <Button size="lg" className="bg-sky-500 hover:bg-sky-600 text-white" asChild>
                        <Link href="/practice">
                            Go to Dashboard
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                    <Button size="lg" variant="outline" asChild>
                        <Link href="/practice/exams">Start Practicing</Link>
                    </Button>
                </div>
            </div>
            <p className="text-xs text-muted-foreground">You will be redirected to the dashboard in 10 seconds...</p>
        </div>
    )
}
