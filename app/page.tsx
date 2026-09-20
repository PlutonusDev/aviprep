"use client"

import type React from "react"
import Link from "next/link"
import { MotionConfig, motion } from "motion/react"
import {
  ArrowRight,
  BarChart3,
  BellRing,
  BookOpen,
  Building2,
  Check,
  ClipboardList,
  Crosshair,
  Flame,
  GraduationCap,
  Layers,
  Palette,
  Percent,
  Sparkles,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { WaitlistForm } from "@/components/landing/waitlist-form"
import { RtoForm } from "@/components/landing/rto-form"
import { PreflightChecklist } from "@/components/landing/preflight-checklist"
import { FeatureBento } from "@/components/landing/feature-bento"
import { Chip, ExamMock, InsightsMock } from "@/components/landing/mockups"
import { LICENSE_TYPES, SUBJECTS } from "@lib/subjects"
import { AppHomeRedirect } from "@/components/pwa/app-home-redirect"

const reveal = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
}

function scrollToWaitlist() {
  const el = document.getElementById("waitlist")
  if (!el) return
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" })
  window.setTimeout(() => document.getElementById("waitlist-bottom-email")?.focus({ preventScroll: true }), reduce ? 0 : 600)
}

function WaitlistButton({ children = "Join the waitlist", variant = "default", className = "" }: { children?: React.ReactNode; variant?: "default" | "outline" | "secondary"; className?: string }) {
  return (
    <Button size="lg" variant={variant} onClick={scrollToWaitlist} className={`h-12 gap-2 px-6 text-base ${className}`}>
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Button>
  )
}

function SectionIntro({ eyebrow, title, body, center = true }: { eyebrow: string; title: React.ReactNode; body?: string; center?: boolean }) {
  return (
    <motion.div {...reveal} className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
      <h2 className="mt-3 text-display-2 font-bold text-balance">{title}</h2>
      {body && <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">{body}</p>}
    </motion.div>
  )
}

const FAQ = [
  {
    q: "When does AviPrep launch?",
    a: "We're testing it with a handful of flight schools at the moment. Everyone on the waitlist gets in before the public launch, and we'll email you the day it opens.",
  },
  {
    q: "Is it aligned to the CASA syllabus?",
    a: "Yes. Lessons and questions are written against the CASA Part 61 Manual of Standards, with MOS references on explanations. AviPrep is an independent resource and isn't affiliated with or endorsed by CASA.",
  },
  {
    q: "Which licences are covered?",
    a: "RPL, PPL and CPL theory at launch. ATPL and the Instrument Rating (IREX) come after.",
  },
  {
    q: "What does joining the waitlist get me?",
    a: "Early access, and 20% off every study hub digital product for as long as you're with us. We ask for your mobile to check you're a real person, and that's all we use it for.",
  },
  {
    q: "I run a flight school. Can my students use it?",
    a: "Yes. You get your own branded portal on your own subdomain, hand out subjects to students or whole classes, and watch how they're going. Get in touch below and we'll show you.",
  },
]

export default function LandingPage() {
  const liveLicences = LICENSE_TYPES.filter((l) => l.available)
  const subjectCount = SUBJECTS.filter((s) => !s.comingSoon && liveLicences.some((l) => l.id === s.licenseType)).length

  return (
    <MotionConfig reducedMotion="user">
      {/* The installed app never lands here; it goes to sign-in or the dashboard. */}
      <AppHomeRedirect />
      <div className="min-h-dvh overflow-x-clip bg-background text-foreground">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-e3"
        >
          Skip to main content
        </a>

        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
          <nav aria-label="Main" className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
            <Link href="/" className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <img className="h-11 w-auto" src="/img/AviPrep-logo.png" alt="AviPrep" width={176} height={44} />
            </Link>
            <div className="hidden flex-1 items-center gap-6 text-sm text-muted-foreground md:flex">
              <a href="#how-it-works" className="hover:text-foreground">How it works</a>
              <a href="#features" className="hover:text-foreground">Features</a>
              <a href="#licences" className="hover:text-foreground">Licences</a>
              <a href="#flight-schools" className="hover:text-foreground">For flight schools</a>
              <a href="#faq" className="hover:text-foreground">FAQ</a>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button asChild variant="ghost" className="hidden h-10 sm:inline-flex">
                <a href="#flight-schools">Partner with us</a>
              </Button>
              <Button onClick={scrollToWaitlist} className="h-10 gap-1.5">
                Join waitlist
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </nav>
        </header>

        <main id="main">
          {/* Hero */}
          <section className="relative overflow-hidden lg:flex lg:min-h-[calc(100dvh-4rem)] lg:items-center">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(60rem 30rem at 85% -10%, color-mix(in oklab, var(--primary) 18%, transparent), transparent 70%)",
              }}
            />
            {/* A faint runway grid behind the hero. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.35] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
              style={{
                backgroundImage:
                  "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
                backgroundSize: "56px 56px",
              }}
            />

            <div className="relative mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-14 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-12 lg:px-8 lg:py-10">
              <div>
                {/* LCP: rendered straight away, no animation gate. */}
                <h1 className="mt-6 text-display-1 font-bold leading-[1.02] text-balance lg:mt-5">
                  Pass your CASA theory exams <span className="text-primary">first time.</span>
                </h1>
                <p className="mt-6 max-w-xl text-lead text-muted-foreground text-pretty">
                  Practice exams modelled on the real sitting, and a breakdown of the topics you&apos;re getting
                  wrong. RPL through CPL, on a laptop or your phone.
                </p>

                <div className="mt-8 flex flex-wrap gap-3 lg:mt-7">
                  <WaitlistButton>Get early access</WaitlistButton>
                  <Button asChild size="lg" variant="outline" className="h-12 gap-2 px-6 text-base">
                    <a href="#flight-schools">
                      <Building2 className="h-4 w-4" aria-hidden="true" />
                      For flight schools & RTOs
                    </a>
                  </Button>
                </div>

                <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  {["20% off for life if you join the waitlist", `${subjectCount} theory subjects`, "Built in Australia"].map((t) => (
                    <li key={t} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Product collage */}
              <div className="relative mx-auto w-full max-w-xl origin-center lg:max-w-none lg:pb-16 lg:[@media(max-height:820px)]:scale-[0.88] lg:[@media(max-height:720px)]:scale-[0.78]">
                <motion.div
                  initial={{ opacity: 0, y: 24, rotate: -1 }}
                  animate={{ opacity: 1, y: 0, rotate: -1 }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className="relative z-10"
                >
                  <ExamMock />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 32, x: 12 }}
                  animate={{ opacity: 1, y: 0, x: 0 }}
                  transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="relative z-20 -mt-24 ml-auto hidden w-[78%] rotate-1 sm:block lg:absolute lg:-right-4 lg:bottom-0 lg:mt-0 lg:w-[68%]"
                >
                  <InsightsMock />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  className="absolute -rotate-3 -left-4 top-10 z-30 hidden md:block"
                >
                  <Chip icon={Flame} className="border-primary" drift={7}>12-day streak</Chip>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                  className="absolute rotate-5 -right-2 top-1/2 z-30 hidden md:block"
                >
                  <Chip icon={Crosshair} className="border-primary" delay={1.4} drift={8.5}>Focus: Weight & balance</Chip>
                </motion.div>
              </div>
            </div>
          </section>

          {/* How it works: the pre-flight checklist */}
          <section id="how-it-works" className="section section-raised scroll-mt-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <SectionIntro
                eyebrow="How it works"
                title="Your study plan, run like a pre-flight checklist"
                body="Five steps between your first lesson and walking into the exam."
              />
              <div className="mt-16">
                <PreflightChecklist />
              </div>
              <motion.div {...reveal} className="mt-20 flex flex-col items-center gap-3 text-center">
                <p className="font-heading text-xl font-semibold text-foreground">Checklist complete. Ready for departure?</p>
                <WaitlistButton>Join the waitlist</WaitlistButton>
              </motion.div>
            </div>
          </section>

          {/* Feature bento */}
          <section id="features" className="section scroll-mt-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <SectionIntro
                eyebrow="In the cockpit"
                title="Everything else you'd want on board"
              />
              <div className="mt-14">
                <FeatureBento />
              </div>
            </div>
          </section>

          {/* Licences */}
          <section id="licences" className="section section-raised scroll-mt-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <SectionIntro
                eyebrow="Licences"
                title="From your first solo to the airline seat"
                body="Subjects grouped by licence."
              />
              <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {LICENSE_TYPES.map((l, i) => {
                  const count = SUBJECTS.filter((s) => s.licenseType === l.id && !s.comingSoon).length
                  return (
                    <motion.div
                      key={l.id}
                      {...reveal}
                      transition={{ ...reveal.transition, delay: i * 0.06 }}
                      className="relative flex flex-col rounded-xl border border-border bg-card p-5 shadow-e1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-2xl font-bold text-foreground">{l.name}</span>
                        {l.available ? (
                          <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">At launch</span>
                        ) : (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Coming soon</span>
                        )}
                      </div>
                      <p className="mt-2 text-sm font-medium text-foreground">{l.fullName}</p>
                      <p className="mt-1 flex-1 text-sm text-muted-foreground">{l.description}</p>
                      {l.available && count > 0 && (
                        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                          {count} {count === 1 ? "subject" : "subjects"}
                        </p>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </section>

          {/* Mid-page CTA band */}
          <section aria-label="Early access offer" className="relative overflow-hidden border-y border-border bg-foreground text-background">
            <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Percent className="h-6 w-6" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-heading text-2xl font-bold">20% off, for life.</p>
                  <p className="mt-1 max-w-xl text-background/70">
                    Join before we launch and you keep 20% off every study hub product, for as long as you&apos;re
                    with us.
                  </p>
                </div>
              </div>
              <Button size="lg" onClick={scrollToWaitlist} className="h-12 shrink-0 gap-2 px-6 text-base">
                Claim your spot
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </section>

          {/* Flight schools & RTOs */}
          <section id="flight-schools" className="section-lg scroll-mt-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-e3">
                <div className="grid grid-cols-1 lg:grid-cols-2">
                  <div className="relative border-b border-border p-8 sm:p-10 lg:border-b-0 lg:border-r">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0"
                      style={{ background: "radial-gradient(40rem 20rem at 0% 0%, color-mix(in oklab, var(--primary) 12%, transparent), transparent 70%)" }}
                    />
                    <div className="relative">
                      <p className="inline-flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                        <GraduationCap className="h-4 w-4" aria-hidden="true" />
                        For flight schools & RTOs
                      </p>
                      <h2 className="mt-3 text-display-3 font-bold text-balance">Give your students AviPrep, under your brand</h2>
                      <p className="mt-3 text-muted-foreground">
                        Your subdomain, your logo, your students. You can see how each of them is tracking.
                      </p>
                      <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
                        {[
                          { icon: Palette, title: "Your brand", body: "Your logo, colours and subdomain. Co-branded welcome emails." },
                          { icon: Users, title: "Students & groups", body: "Add students and assign subjects one by one or by class." },
                          { icon: BarChart3, title: "Progress you can see", body: "Who's studying, who's stalled, and how the cohort is tracking." },
                          { icon: BellRing, title: "Your call on features", body: "Forums, messages and insights go on or off for your school." },
                        ].map((b) => (
                          <li key={b.title} className="flex gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                              <b.icon className="h-4 w-4 text-primary" aria-hidden="true" />
                            </span>
                            <span>
                              <span className="block font-medium text-foreground">{b.title}</span>
                              <span className="block text-sm text-muted-foreground">{b.body}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="p-8 sm:p-10">
                    <h3 className="font-heading text-xl font-bold text-foreground">Let&apos;s talk</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Pricing and a hand getting your students set up. We&apos;ll come back to you within two
                      business days.
                    </p>
                    <Link
                      href="/demo"
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                    >
                      Have a look through the panel first
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                    <div className="mt-6">
                      <RtoForm />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Waitlist */}
          <section id="waitlist" className="section section-raised scroll-mt-16">
            <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
              <motion.div {...reveal}>
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary">Early access</p>
                <h2 className="mt-3 text-display-2 font-bold text-balance">Get on the list before we take off</h2>
                <ul className="mt-8 space-y-4">
                  {[
                    { icon: Sparkles, title: "Early access", body: "Start studying before the public launch." },
                    { icon: Percent, title: "20% off for life", body: "On all study hub digital products." },
                    { icon: BookOpen, title: "Syllabus updates", body: "We'll tell you when a CASA change affects your exams." },
                    { icon: ClipboardList, title: "A say in it", body: "Tell us what's missing and we'll build it next." },
                  ].map((b) => (
                    <li key={b.title} className="flex gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <b.icon className="h-4 w-4 text-primary" aria-hidden="true" />
                      </span>
                      <span>
                        <span className="block font-medium text-foreground">{b.title}</span>
                        <span className="block text-sm text-muted-foreground">{b.body}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>

              <motion.div {...reveal} className="rounded-2xl border border-border bg-card p-6 shadow-e3 sm:p-8">
                <h3 className="font-heading text-xl font-bold text-foreground">Join the waitlist</h3>
                <p className="mt-1 text-sm text-muted-foreground">Takes 30 seconds. We&apos;ll text you a code to confirm.</p>
                <WaitlistForm id="waitlist-bottom" className="mt-6" />
              </motion.div>
            </div>
          </section>

          {/* FAQ */}
          <section id="faq" className="section scroll-mt-16">
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
              <SectionIntro eyebrow="FAQ" title="Questions, answered" />
              <Accordion type="single" collapsible className="mt-10">
                {FAQ.map((f, i) => (
                  <AccordionItem key={f.q} value={`q-${i}`} className="border-border">
                    <AccordionTrigger className="py-5 text-left text-base font-medium hover:no-underline">{f.q}</AccordionTrigger>
                    <AccordionContent className="pb-5 text-base leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              <div className="mt-12 flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-center">
                <WaitlistButton>Join the waitlist</WaitlistButton>
                <Button asChild size="lg" variant="ghost" className="h-12 text-base">
                  <a href="#flight-schools">I&apos;m a flight school</a>
                </Button>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-border bg-card/50">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-8 md:flex-row md:justify-between">
              <div className="max-w-sm">
                <img className="h-10 w-auto" src="/img/AviPrep-logo.png" alt="AviPrep" width={160} height={40} />
                <p className="mt-3 text-sm text-muted-foreground">CASA theory exam preparation, built in Australia.</p>
              </div>
              <nav aria-label="Footer" className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm text-muted-foreground">
                <a href="#how-it-works" className="hover:text-foreground">How it works</a>
                <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
                <a href="#flight-schools" className="hover:text-foreground">Flight schools</a>
                <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
                <a href="#faq" className="hover:text-foreground">FAQ</a>
                <a href="mailto:hello@aviprep.com.au" className="hover:text-foreground">Contact</a>
              </nav>
            </div>
            <p className="mt-10 border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
              AviPrep is an independent training resource and is not affiliated with or endorsed by the Civil Aviation
              Safety Authority. Materials are developed against the CASA Part 61 Manual of Standards; candidates remain
              responsible for using current AIP and ERSA supplements and verifying regulatory information.
              <span className="mt-2 block">© {new Date().getFullYear()} AviPrep. All rights reserved.</span>
            </p>
          </div>
        </footer>
      </div>
    </MotionConfig>
  )
}
