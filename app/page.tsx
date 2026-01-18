"use client";

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BackgroundBeams } from "@/ui/background-beams"
import { Spotlight } from "@/ui/spotlight-new"
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { BiSolidZap } from "react-icons/bi";
import { FaBookOpen, FaClock, FaFireFlameCurved, FaUsers } from "react-icons/fa6"
import { IoBarChart } from "react-icons/io5";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";

export default () => {
    const { executeRecaptcha } = useGoogleReCaptcha();
    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!executeRecaptcha) return;
        if (!email) return;

        setIsSubmitting(true);
        setError("");

        try {
            const token = await executeRecaptcha("waitlist_join");

            const res = await fetch("/api/waitlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, token }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Something went wrong");
            }

            setIsSubmitted(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="border-b border-border/50">
                <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-2">
                    <img className="h-12" src="/img/AviPrep-logo.png" alt="AviPrep logo" />
                </nav>
            </header>

            <section className="relative overflow-hidden">
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
                    <Spotlight />
                    <div className="opacity-70 pointer-events-none absolute top-0 left-0 w-screen h-[100vh]">
                        <BackgroundBeams />
                    </div>
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-30 items-center">
                    <div className="max-w-3xl mx-auto text-center">
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance leading-[1.1]">
                            Master Your Flight Theory
                            <span className="block text-primary mt-2">With Confidence</span>
                        </h1>

                        <p className="mt-6 text-lg text-foreground max-w-2xl mx-auto text-pretty leading-relaxed">
                            Australia's most modern and comprehensive flight theory preparation platform. AI-powered insights, thousands of practice questions, hours of learning material, and detailed performance analytics to help you pass first time.
                        </p>

                        <div className="mt-10 max-w-md mx-auto">
                            {!isSubmitted ? (
                                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                                    <div className="flex-1">
                                        <Input type="email" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} className="h-12 bg-secondary border-border px-4" required />
                                    </div>
                                    <Button type="submit" size="lg" className="cursor-pointer h-12 px-6" disabled={isSubmitting}>
                                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>
                                            Notify Me
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </>}
                                    </Button>
                                </form>
                            ) : (
                                <div className="flex items-center justify-center gap-3 p-4 rounded-lg bg-accent/10 border border-accent/20">
                                    <CheckCircle2 className="h-5 w-5 text-accent" />
                                    <span className="text-accent font-medium">
                                        You&apos;re on the list! We'll notify you at launch.
                                    </span>
                                </div>
                            )}
                            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

                            <p className="mt-3 text-sm text-muted-foreground font-medium">
                                Join the waitlist and receive early access and an exclusive 20% discount on all study hub digital products forever.
                            </p>
                            <p className="mt-3 text-xs text-muted-foreground">
                                By signing up, you agree to our <Link href="/terms" className="underline">Terms of Service</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>. No spam - ever.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="border-y border-border bg-card/50 py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-6">
                        <h2 className="text-3xl sm:text-4xl font-bold text-balance">
                            Everything you need to ace your flight theory exams
                        </h2>
                        <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
                            Our platform combines expert-crafted content with cutting-edge AI to make you best equipped to succeed on your first attempt.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            {
                                icon: <FaBookOpen />,
                                title: "Thorough Theory",
                                description: "Cover every competency with expert-crafted theory content.",
                            },
                            {
                                icon: <IoBarChart />,
                                title: "Smart Analytics",
                                description: "AI-powered insights identify your weak areas and suggest focused study plans.",
                            },
                            {
                                icon: <BiSolidZap />,
                                title: "Instant Feedback",
                                description: "Detailed explanations for every answer help you improve your results immediately.",
                            },
                            {
                                icon: <FaClock />,
                                title: "Timed Tests",
                                description: "Timed tests that provide a simulated PEXO exam environment.",
                            },
                            {
                                icon: <FaFireFlameCurved />,
                                title: "Study Streaks",
                                description: "Track your study progress with study streaks.",
                            },
                            {
                                icon: <FaBookOpen />,
                                title: "Comprehensive Coverage",
                                description: "Every point of the Part 61 Manual of Standards is covered with curated questions.",
                            },
                            {
                                icon: <FaUsers />,
                                title: "Expert Support",
                                description: "Join a community of passionate flight theory enthusiasts and professionals.",
                            },
                        ].map((feature, i) => (
                            <div key={i} className="group p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors">
                                <div className="text-primary text-lg w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                                    {feature.icon}
                                </div>
                                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="py-20 lg:py-28">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="relative rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 p-8 sm:p-12 lg:p-16 text-center overflow-hidden">
                        {/* Decorative element */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                        <div className="relative">
                            <h2 className="text-3xl sm:text-4xl font-bold text-balance">Ready to start your journey?</h2>
                            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
                                Join hundreds of aspiring commercial pilots preparing for their theory exams. Be the first to know when
                                we launch.
                            </p>

                            {!isSubmitted ? (
                                <form onSubmit={handleSubmit} className="mt-8 max-w-md mx-auto flex flex-col sm:flex-row gap-3">
                                    <Input
                                        type="email"
                                        placeholder="Enter your email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="h-12 bg-background border-border px-4"
                                        required
                                    />
                                    <Button type="submit" size="lg" className="cursor-pointer h-12 px-6" disabled={isSubmitting}>
                                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join Waitlist"}
                                    </Button>
                                </form>
                            ) : (
                                <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/10 border border-accent/20">
                                    <CheckCircle2 className="h-5 w-5 text-accent" />
                                    <span className="text-accent font-medium">You're on the list!</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

        </div>
    )
}