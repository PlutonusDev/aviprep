"use client";

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BackgroundBeams } from "@/ui/background-beams"
import { Spotlight } from "@/ui/spotlight-new"
import { ArrowRight, CheckCircle2, Loader2, Phone, Mail, Flag, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { BiSolidZap } from "react-icons/bi";
import { FaBookOpen, FaClock, FaFireFlameCurved, FaUsers, FaPlane, FaChartLine } from "react-icons/fa6"
import { IoBarChart } from "react-icons/io5";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { motion } from "motion/react";

export default () => {
    const { executeRecaptcha } = useGoogleReCaptcha();
    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState("");

    // RTO Contact Form State
    const [rtoName, setRtoName] = useState("");
    const [rtoEmail, setRtoEmail] = useState("");
    const [rtoPhone, setRtoPhone] = useState("");
    const [rtoOrganisation, setRtoOrganisation] = useState("");
    const [isRtoSubmitting, setIsRtoSubmitting] = useState(false);
    const [isRtoSubmitted, setIsRtoSubmitted] = useState(false);
    const [rtoError, setRtoError] = useState("");

    const fadeInUp = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    const fadeIn = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 }
    };

    const staggerContainer = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.3
            }
        }
    };

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

    const handleRtoSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!executeRecaptcha) return;
        if (!rtoName || !rtoEmail || !rtoOrganisation) return;

        setIsRtoSubmitting(true);
        setRtoError("");

        try {
            const token = await executeRecaptcha("rto_contact");

            const res = await fetch("/api/rto-contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: rtoName,
                    email: rtoEmail,
                    phone: rtoPhone,
                    organisation: rtoOrganisation,
                    token
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Something went wrong");
            }

            setIsRtoSubmitted(true);
        } catch (err) {
            setRtoError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setIsRtoSubmitting(false);
        }
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Header */}
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50"
            >
                <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-2">
                    <img className="h-12" src="/img/AviPrep-logo.png" alt="AviPrep logo" />
                </nav>
            </motion.header>

            {/* Hero Section */}
            <section className="relative overflow-hidden">
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
                    <Spotlight />
                    <div className="opacity-70 pointer-events-none absolute top-0 left-0 w-screen h-[100vh]">
                        <BackgroundBeams />
                    </div>
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 py-32 items-center">
                    <div className="max-w-4xl mx-auto text-center">
                        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }} className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance leading-[1.1]">
                            CASA-Aligned Flight Theory
                            <span className="block text-primary mt-2">Preparation Platform</span>
                        </motion.h1>

                        <motion.p 
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                            className="mt-8 text-lg sm:text-xl text-foreground/90 max-w-6xl mx-auto text-pretty leading-relaxed">
                            Precision-engineered examination preparation mapped directly to the CASA Part 61 Manual of Standards. From RPL through to CPL and IREX, AviPrep delivers the quantitative assessment and high-fidelity simulation required for confident, first-time success within the Australian FIR.
                        </motion.p>

                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
                            className="mt-12 flex flex-wrap justify-center gap-5 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                                <span>CASA Part 61 MOS Aligned</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                                <span>KDR Analytics</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                                <span>PEXO Environment Simulation</span>
                            </div>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
                            className="mt-10 max-w-md mx-auto">
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
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Platform Preview Section */}
            <section className="py-24 lg:py-32 bg-gradient-to-b from-background to-card/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div 
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{ duration: 0.6 }}
                        variants={fadeInUp}
                        className="text-center mb-12">
                        <h2 className="text-3xl sm:text-4xl font-bold text-balance">
                            Experience the Platform
                        </h2>
                        <p className="mt-4 text-lg text-muted-foreground">
                            Purpose-built interface designed for focused exam preparation
                        </p>
                    </motion.div>

                    {/* Browser Window Mockup */}
                    <div className="relative max-w-5xl mx-auto">
                        <motion.div 
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{ duration: 0.6 }}
                        variants={fadeInUp}
                        className="rounded-xl border border-border/50 bg-card shadow-2xl overflow-hidden" data-testid="platform-preview-mockup">
                            {/* Browser Chrome */}
                            <div className="bg-muted/30 border-b border-border/50 px-4 py-3 flex items-center gap-2">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                                </div>
                                <div className="flex-1 mx-4">
                                    <div className="bg-background/50 rounded px-3 py-1.5 text-xs text-muted-foreground flex items-center gap-2">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                        <span>aviprep.com.au/dashboard/exam/csya</span>
                                    </div>
                                </div>
                            </div>

                            {/* Content Area */}
                            <div className="bg-gradient-to-br from-background via-card to-background p-8 sm:p-12">
                                <div>
                                    {/* Mock exam question */}
                                    <div className="flex items-center justify-between">
                                        <h1 className="text-base font-semibold text-foreground">Aircraft General Knowledge</h1>
                                        <Badge variant="secondary">11/40</Badge>
                                    </div>
                                    <div className="flex items-center gap-3 py-2">
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                            Q11/40
                                        </span>
                                        <Progress value={28} className="h-1.5 flex-1" />
                                        <span className="text-xs text-muted-foreground">28%</span>
                                    </div>

                                    <div className="flex flex-wrap gap-1.5 pb-4">
                                        {Array.from({ length: 40 }).map((_, i) => (
                                            <button key={i} className={`h-7 w-7 rounded text-xs font-medium ${i < 10 ? "bg-primary/50 text-primary" : i === 10 ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                                                {i + 1}
                                            </button>
                                        ))}
                                    </div>

                                    <Card>
                                        <CardContent className="p-4 space-y-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="space-y-1.5 flex-1">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-500 text-orange-500">
                                                            medium
                                                        </Badge>
                                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                                            Propellers
                                                        </Badge>
                                                    </div>
                                                    <p className="mt-2 font-medium leading-snug text-foreground">
                                                        In the event of a loss of propeller oil pressure in a variable pitch propeller system, which factor primarily causes the propeller blades to move towards a fine pitch setting?
                                                    </p>
                                                </div>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                                    <Flag className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            <RadioGroup className="space-y-2" disabled>
                                                <div className="flex items-center space-x-2.5 rounded-md border p-3 border-border opacity-60">
                                                    <RadioGroupItem disabled className="shrink-0" id="o-1" value="a" />
                                                    <Label htmlFor="o-1" className="flex-1 text-sm leading-snug text-foreground">
                                                        Aerodynamic balancing moment
                                                    </Label>
                                                </div>
                                                <div className="flex items-center space-x-2.5 rounded-md border p-3 border-green-500 bg-green-500/10">
                                                    <RadioGroupItem checked disabled className="shrink-0" id="o-1" value="a" />
                                                    <Label htmlFor="o-1" className="flex-1 text-sm leading-snug text-foreground">
                                                        Centrifugal twisting moment
                                                    </Label>
                                                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                                </div>
                                                <div className="flex items-center space-x-2.5 rounded-md border p-3 border-border opacity-60">
                                                    <RadioGroupItem disabled className="shrink-0" id="o-1" value="a" />
                                                    <Label htmlFor="o-1" className="flex-1 text-sm leading-snug text-foreground">
                                                        Governor spring tension
                                                    </Label>
                                                </div>
                                                <div className="flex items-center space-x-2.5 rounded-md border p-3 border-border opacity-60">
                                                    <RadioGroupItem disabled className="shrink-0" id="o-1" value="a" />
                                                    <Label htmlFor="o-1" className="flex-1 text-sm leading-snug text-foreground">
                                                        Engine torque load
                                                    </Label>
                                                </div>
                                            </RadioGroup>

                                            <div className="rounded-md p-3 text-sm bg-green-500/10 border border-green-500/30">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                    <span className="font-medium text-sm text-green-500">Correct!</span>
                                                </div>
                                                <p className="text-xs text-foreground/80 leading-relaxed">
                                                    Centrifugal twisting moment (CTM) tends to move the propeller blades to a fine pitch setting. This inherent aerodynamic force acts to decrease the pitch angle of the blades, which is a safety feature designed to prevent over-speeding by ensuring the blades move to a fine pitch when oil pressure is lost.
                                                </p>
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-border">
                                                <Button variant="ghost" size="sm">
                                                    <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Prev
                                                </Button>
                                                <Button size="sm">
                                                    Next <ArrowRight className="ml-1 h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Three Core Principles Section */}
            <section className="border-y border-border bg-card/30 py-24 lg:py-32">
                <motion.div 
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{ duration: 0.6 }}
                        variants={fadeInUp}
                        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div variants={fadeInUp} transition={{ duration: 0.6 }} className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-balance">
                            Engineered for Aviation Excellence
                        </h2>
                        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                            Three foundational principles underpin every aspect of the AviPrep platform.
                        </p>
                    </motion.div>

                    <motion.div 
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.2 }}
                        variants={staggerContainer}
                        className="grid lg:grid-cols-3 gap-8 lg:gap-12">
                        <motion.div variants={fadeInUp} transition={{ duration: 0.6 }} className="group relative">
                            <div className="absolute -left-4 top-0 text-7xl font-bold text-primary/10 group-hover:text-primary/20 transition-colors">
                                01
                            </div>
                            <div className="relative pl-8">
                                <h3 className="text-2xl font-bold mb-4">Regulatory Alignment</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    All modules are mapped directly to the CASA Part 61 Manual of Standards (MOS). We ensure that candidates are not merely "passing a test," but are building the fundamental knowledge required for safe and efficient flight operations within the Australian FIR.
                                </p>
                            </div>
                        </motion.div>

                        <motion.div variants={fadeInUp} transition={{ duration: 0.6 }} className="group relative">
                            <div className="absolute -left-4 top-0 text-7xl font-bold text-primary/10 group-hover:text-primary/20 transition-colors">
                                02
                            </div>
                            <div className="relative pl-8">
                                <h3 className="text-2xl font-bold mb-4">Quantitative Assessment</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    Our diagnostic tools provide detailed KDR (Knowledge Deficiency Report) analytics. Identify specific syllabus weak points - from Constant Speed Units to Radio Navigation Errors - allowing for targeted remedial study and optimized training hours.
                                </p>
                            </div>
                        </motion.div>

                        <motion.div variants={fadeInUp} transition={{ duration: 0.6 }} className="group relative">
                            <div className="absolute -left-4 top-0 text-7xl font-bold text-primary/10 group-hover:text-primary/20 transition-colors">
                                03
                            </div>
                            <div className="relative pl-8">
                                <h3 className="text-2xl font-bold mb-4">High-Fidelity Simulation</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    The AviPrep examination interface replicates the operational environment of official sittings. This reduces "exam-day friction" and ensures that the candidate's performance reflects their actual knowledge, unaffected by unfamiliarity with the testing platform.
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                </motion.div>
            </section>

            {/* KDR Analytics Preview */}
            <section className="py-24 lg:py-32">
                <motion.div 
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{ duration: 0.6 }}
                        variants={fadeInUp}
                        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <div className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
                                Knowledge Deficiency Reports
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                                <p>Precision Analytics for</p>
                                <span className="text-primary">Targeted Study</span>
                            </h2>
                            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                                Our advanced KDR system analyzes your performance across every syllabus section, identifying specific knowledge gaps and providing actionable remediation strategies.
                            </p>
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-semibold mb-1">Competency-Level Breakdown</h4>
                                        <p className="text-sm text-muted-foreground">Performance tracking aligned to Part 61 MOS competency units</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-semibold mb-1">Weak Point Identification</h4>
                                        <p className="text-sm text-muted-foreground">Automated detection of topics requiring additional study time</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-semibold mb-1">Study Optimization</h4>
                                        <p className="text-sm text-muted-foreground">AI-recommended focus areas for maximum exam readiness</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            {/* Browser Window Mockup - Analytics */}
                            <div className="rounded-xl border border-border/50 bg-card shadow-2xl overflow-hidden" data-testid="analytics-preview-mockup">
                                {/* Browser Chrome */}
                                <div className="bg-muted/30 border-b border-border/50 px-4 py-3 flex items-center gap-2">
                                    <div className="flex gap-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                                        <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                                    </div>
                                    <div className="flex-1 mx-4">
                                        <div className="bg-background/50 rounded px-3 py-1.5 text-xs text-muted-foreground flex items-center gap-2">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                            <span>aviprep.com.au/dashboard/insights</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Analytics Dashboard Content */}
                                <div className="bg-gradient-to-br from-background via-card to-background p-6">
                                    <h3 className="font-bold text-lg mb-4">Performance Overview</h3>

                                    {/* Mock chart area */}
                                    <div className="bg-background border border-border/50 rounded-lg p-4 mb-4 h-32 flex items-end justify-between gap-2">
                                        {[65, 82, 45, 78, 91, 73, 88].map((height, i) => (
                                            <div key={i} className="flex-1 bg-primary/20 rounded-t" style={{ height: `${height}%` }}></div>
                                        ))}
                                    </div>

                                    {/* Weak Points */}
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-semibold mb-3">Priority Areas for Review</h4>
                                        <div className="bg-red-500/10 border border-red-500/20 rounded px-3 py-2 flex items-center justify-between">
                                            <span className="text-sm font-medium">Performance - Weight & Balance Calculations [Section 6.4.2(a)]</span>
                                            <span className="text-xs bg-red-500/20 px-2 py-1 rounded">66% accuracy</span>
                                        </div>
                                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded px-3 py-2 flex items-center justify-between">
                                            <span className="text-sm font-medium">Air Law - Life Jacket Requirements [Section 2.4.1(d)(vi)]</span>
                                            <span className="text-xs bg-yellow-500/20 px-2 py-1 rounded">73% accuracy</span>
                                        </div>
                                        <div className="bg-green-500/10 border border-green-500/20 rounded px-3 py-2 flex items-center justify-between">
                                            <span className="text-sm font-medium">Meteorology - Microbursts [Section 2.8.1(b)]</span>
                                            <span className="text-xs bg-green-500/20 px-2 py-1 rounded">91% accuracy</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* Course Offerings Section */}
            <section className="py-24 lg:py-32">
                <motion.div 
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{ duration: 0.6 }}
                        variants={fadeInUp}
                        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-balance">
                            Comprehensive Course Coverage
                        </h2>
                        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                            From recreational through to commercial certification - structured preparation for every milestone.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="group relative overflow-hidden rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 p-8">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                            <div className="relative">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                        <FaPlane className="text-primary text-xl" />
                                    </div>
                                    <h3 className="text-2xl font-bold">Fixed Wing (A)</h3>
                                </div>
                                <p className="text-muted-foreground mb-6 leading-relaxed">
                                    Comprehensive coverage for CPL/ATPL theory blocks including Meteorology, Navigation, Air Law, and Aircraft Systems. Structured progression from RPL fundamentals through to commercial competency standards.
                                </p>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle2 className="h-4 w-4 text-primary" />
                                        <span>RPL to CPL Theory Modules</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle2 className="h-4 w-4 text-primary" />
                                        <span>ATPL Preparation Materials</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle2 className="h-4 w-4 text-primary" />
                                        <span>7 Core Subject Areas</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="group relative overflow-hidden rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 p-8">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                            <div className="relative">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                        <FaChartLine className="text-primary text-xl" />
                                    </div>
                                    <h3 className="text-2xl font-bold">Instrument Rating (IREX)</h3>
                                </div>
                                <p className="text-muted-foreground mb-6 leading-relaxed">
                                    Intensive preparation for the Instrument Rating Exam, focusing on the latest AIP and Jeppesen chart updates. Real-world scenario-based questions aligned with operational IFR procedures.
                                </p>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle2 className="h-4 w-4 text-primary" />
                                        <span>Current AIP Supplement Integration</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle2 className="h-4 w-4 text-primary" />
                                        <span>Jeppesen Chart Interpretation</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle2 className="h-4 w-4 text-primary" />
                                        <span>IFR Procedural Knowledge</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* Detailed Feedback Preview */}
            <section className="py-24 lg:py-32 border-y border-border bg-card/30">
                <motion.div 
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{ duration: 0.6 }}
                        variants={fadeInUp}
                        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div className="order-2 lg:order-1">
                            {/* Browser Window Mockup - Feedback */}
                            <div className="rounded-xl border border-border/50 bg-card shadow-2xl overflow-hidden" data-testid="feedback-preview-mockup">
                                {/* Browser Chrome */}
                                <div className="bg-muted/30 border-b border-border/50 px-4 py-3 flex items-center gap-2">
                                    <div className="flex gap-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                                        <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                                    </div>
                                    <div className="flex-1 mx-4">
                                        <div className="bg-background/50 rounded px-3 py-1.5 text-xs text-muted-foreground flex items-center gap-2">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                            <span>aviprep.com.au/exam/review</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Feedback Content */}
                                <div className="bg-gradient-to-br from-background via-card to-background p-6">
                                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                                            <span className="font-semibold text-green-700 dark:text-green-400">Correct Answer</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground">Your answer: <strong>36,000 - 40,000 feet</strong></p>
                                    </div>

                                    <div className="bg-card border border-border/50 rounded-lg p-4 space-y-4">
                                        <div>
                                            <h4 className="font-semibold text-sm mb-2">Explanation</h4>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                The tropopause over Australia typically occurs between 36,000 and 40,000 feet. This boundary marks the transition from the troposphere to the stratosphere and is characterized by a cessation of the temperature lapse rate.
                                            </p>
                                        </div>

                                        <div className="pt-3 border-t border-border/50">
                                            <h4 className="font-semibold text-sm mb-2">Regulatory Reference</h4>
                                            <p className="text-xs text-muted-foreground">
                                                CASA Part 61 MOS - Unit 1.8.2 Section 2.1.3(b)
                                            </p>
                                        </div>

                                        <div className="flex gap-2 pt-2">
                                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Meteorology</span>
                                            <span className="text-xs bg-muted px-2 py-1 rounded">Atmosphere</span>
                                            <span className="text-xs bg-muted px-2 py-1 rounded">Easy Difficulty</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="order-1 lg:order-2">
                            <div className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
                                Comprehensive Feedback
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                                Learn from Every Question
                            </h2>
                            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                                Every answer - correct or incorrect - includes detailed explanations with regulatory references, helping you understand not just what the right answer is, but why it's correct.
                            </p>
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-semibold mb-1">Detailed Explanations</h4>
                                        <p className="text-sm text-muted-foreground">Comprehensive breakdowns for every question response</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-semibold mb-1">Regulatory Citations</h4>
                                        <p className="text-sm text-muted-foreground">Direct references to CASA Part 61 MOS competency units</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-semibold mb-1">Contextual Learning</h4>
                                        <p className="text-sm text-muted-foreground">Real-world operational context for theory concepts</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* Features Section */}
            <section className="border-y border-border bg-card/30 py-24 lg:py-32">
                <motion.div 
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{ duration: 0.6 }}
                        variants={fadeInUp}
                        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-balance">
                            Platform Capabilities
                        </h2>
                        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                            Advanced learning tools designed for the modern aviation professional.
                        </p>
                    </div>

                    <motion.div 
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.2 }}
                        variants={staggerContainer}
                        className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            {
                                icon: <FaBookOpen />,
                                title: "Regulatory Theory Content",
                                description: "Every competency unit from the Part 61 MOS covered with expert-crafted study materials and explanatory content.",
                            },
                            {
                                icon: <IoBarChart />,
                                title: "KDR Analytics Dashboard",
                                description: "Knowledge Deficiency Reports pinpoint weak areas across all syllabus sections for targeted study optimization.",
                            },
                            {
                                icon: <BiSolidZap />,
                                title: "Instant Answer Validation",
                                description: "Comprehensive explanations for every question response, with regulatory references and operational context.",
                            },
                            {
                                icon: <FaClock />,
                                title: "Exam Environment Simulation",
                                description: "Timed assessments that replicate PEXO examination conditions, reducing performance anxiety on test day.",
                            },
                            {
                                icon: <FaFireFlameCurved />,
                                title: "Progress Tracking",
                                description: "Comprehensive study metrics including streak tracking, completion rates, and performance trends over time.",
                            },
                            {
                                icon: <FaUsers />,
                                title: "Professional Support Network",
                                description: "Connect with instructors, examiners, and fellow candidates for shared insights and collaborative learning.",
                            },
                        ].map((feature, i) => (
                            <motion.div variants={fadeInUp} transition={{ duration: 0.6 }} key={i} data-testid={`feature-card-${i}`} className="group p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors">
                                <div className="text-primary text-lg w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                                    {feature.icon}
                                </div>
                                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.div>
            </section>

            {/* 2026 Phase-One Intake Registration Section */}
            <section className="py-24 lg:py-32">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="relative rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 p-8 sm:p-12 lg:p-16 overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                        <div className="relative text-center">
                            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-balance">
                                Register for the 2026 Phase-One Intake
                            </h2>
                            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                                AviPrep is currently undergoing final validation with industry stakeholders and flight training organizations (FTOs). By registering your interest, you secure a position for our initial platform release.
                            </p>

                            <motion.div 
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: 0.3 }}
                                className="mt-10 text-left max-w-2xl mx-auto">
                                <h3 className="text-xl font-bold mb-6 text-center">Benefits of Early Registration:</h3>
                                <div className="space-y-4">
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                                            <CheckCircle2 className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Technical Updates</h4>
                                            <p className="text-sm text-muted-foreground">Receive immediate notification of CASA syllabus changes and their impact on your upcoming exams.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                                            <CheckCircle2 className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Beta Access</h4>
                                            <p className="text-sm text-muted-foreground">Opportunity to provide feedback on the module interface prior to public launch.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                                            <CheckCircle2 className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Institutional Licensing</h4>
                                            <p className="text-sm text-muted-foreground">Information for flight schools regarding multi-user integration and student tracking.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                                            <CheckCircle2 className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Exclusive Discount</h4>
                                            <p className="text-sm text-muted-foreground">Early registrants receive 20% off all study hub digital products - forever.</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {!isSubmitted ? (
                                <motion.form 
                                    onSubmit={handleSubmit} 
                                    data-testid="phase-one-registration-form" 
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.6, delay: 0.4 }}
                                    className="mt-10 max-w-md mx-auto">
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <Input
                                            type="email"
                                            placeholder="Enter your email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="h-12 bg-background border-border px-4"
                                            data-testid="registration-email-input"
                                            required
                                        />
                                        <Button type="submit" size="lg" className="cursor-pointer h-12 px-6 whitespace-nowrap" disabled={isSubmitting} data-testid="registration-submit-button">
                                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>
                                                Register Interest
                                                <ArrowRight className="ml-2 h-4 w-4" />
                                            </>}
                                        </Button>
                                    </div>
                                    {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
                                    <p className="mt-4 text-xs text-muted-foreground text-center">
                                        By registering, you agree to our <Link href="/terms" className="underline">Terms of Service</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.
                                    </p>
                                </motion.form>
                            ) : (
                                <motion.div 
                                    data-testid="registration-success-message" 
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.4 }}
                                    className="mt-10 inline-flex items-center gap-3 px-6 py-3 rounded-lg bg-accent/10 border border-accent/20">
                                    <CheckCircle2 className="h-5 w-5 text-accent" />
                                    <span className="text-accent font-medium">Registration confirmed! We'll be in touch soon.</span>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* RTO Partnership Section */}
            <section className="border-y border-border bg-card/30 py-24 lg:py-32">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-balance">
                            Registered Training Organisations
                        </h2>
                        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                            Partner with AviPrep to deliver industry-leading theory preparation to your students. Multi-user licensing, integrated progress tracking, and institutional pricing available.
                        </p>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-8 sm:p-10">
                        {!isRtoSubmitted ? (
                            <form onSubmit={handleRtoSubmit} data-testid="rto-contact-form" className="space-y-6">
                                <div className="grid sm:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="rto-name" className="block text-sm font-medium mb-2">
                                            Contact Name <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            id="rto-name"
                                            type="text"
                                            placeholder="John Smith"
                                            value={rtoName}
                                            onChange={(e) => setRtoName(e.target.value)}
                                            className="h-11"
                                            data-testid="rto-name-input"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="rto-organisation" className="block text-sm font-medium mb-2">
                                            Organisation Name <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            id="rto-organisation"
                                            type="text"
                                            placeholder="Flight School Australia"
                                            value={rtoOrganisation}
                                            onChange={(e) => setRtoOrganisation(e.target.value)}
                                            className="h-11"
                                            data-testid="rto-organisation-input"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="grid sm:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="rto-email" className="block text-sm font-medium mb-2">
                                            Email Address <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            id="rto-email"
                                            type="email"
                                            placeholder="contact@flightschool.com.au"
                                            value={rtoEmail}
                                            onChange={(e) => setRtoEmail(e.target.value)}
                                            className="h-11"
                                            data-testid="rto-email-input"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="rto-phone" className="block text-sm font-medium mb-2">
                                            Phone Number
                                        </label>
                                        <Input
                                            id="rto-phone"
                                            type="tel"
                                            placeholder="+61 4XX XXX XXX"
                                            value={rtoPhone}
                                            onChange={(e) => setRtoPhone(e.target.value)}
                                            className="h-11"
                                            data-testid="rto-phone-input"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <Button
                                        type="submit"
                                        size="lg"
                                        className="w-full sm:w-auto cursor-pointer h-12 px-8"
                                        disabled={isRtoSubmitting}
                                        data-testid="rto-submit-button"
                                    >
                                        {isRtoSubmitting ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <>
                                                <Phone className="mr-2 h-4 w-4" />
                                                Request Partnership Information
                                            </>
                                        )}
                                    </Button>
                                </div>
                                {rtoError && <p className="text-sm text-red-500">{rtoError}</p>}
                            </form>
                        ) : (
                            <div data-testid="rto-success-message" className="text-center py-8">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 mb-4">
                                    <CheckCircle2 className="h-8 w-8 text-accent" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Thank you for your interest</h3>
                                <p className="text-muted-foreground">
                                    Our partnerships team will contact you within 48 hours to discuss institutional licensing options.
                                </p>
                            </div>
                        )}

                        <div className="mt-8 pt-8 border-t border-border">
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4" />
                                    <a href="mailto:partnerships@aviprep.com.au" className="hover:text-foreground transition-colors">
                                        partnerships@aviprep.com.au
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Professional Disclaimer Footer */}
            <footer className="border-t border-border bg-card/50 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-6">
                            <img className="h-10 mx-auto mb-4 opacity-80" src="/img/AviPrep-logo.png" alt="AviPrep logo" />
                        </div>
                        <div className="text-sm text-muted-foreground text-center leading-relaxed space-y-4">
                            <p className="font-medium">
                                <strong>Independent Training Resource Disclaimer</strong>
                            </p>
                            <p>
                                AviPrep.com.au is an independent training resource. While our materials are designed to meet the rigorous standards of the Australian aviation industry, candidates must ensure they are using the most current AIP and ERSA supplements as required by CASA regulations. All question banks and study materials are developed in accordance with the CASA Part 61 Manual of Standards, however AviPrep is not affiliated with or endorsed by the Civil Aviation Safety Authority.
                            </p>
                            <p className="pt-4">
                                Candidates remain responsible for verifying all regulatory information and ensuring compliance with current CASA examination requirements.
                            </p>
                        </div>
                        <div className="mt-8 pt-8 border-t border-border/50 flex flex-col sm:flex-row justify-center items-center gap-6 text-xs text-muted-foreground">
                            <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
                            <span className="hidden sm:inline">•</span>
                            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
                            <span className="hidden sm:inline">•</span>
                            <span>© 2026 AviPrep. All rights reserved.</span>
                        </div>
                    </div>
                </div>
            </footer>

        </div>
    )
}