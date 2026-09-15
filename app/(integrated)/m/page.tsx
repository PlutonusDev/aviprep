"use client"

import Link from "next/link"
import { BarChart3, BookOpen, ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InstallAppButton } from "@/components/pwa/install-app"

const FEATURES = [
  { icon: ClipboardList, title: "Practice exams", hint: "Exam-style questions for every subject" },
  { icon: BookOpen, title: "Lessons", hint: "Structured courses from RPL to ATPL" },
  { icon: BarChart3, title: "Progress", hint: "Scores, history and insights" },
]

/**
 * The installed app's start screen (manifest start_url). Signed-in members never
 * see it: the proxy sends them straight to the dashboard.
 */
export default function AppWelcome() {
  return (
    <main className="flex flex-1 flex-col px-6 pb-8 pt-10 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      <img src="/img/AviPrep-logo.png" alt="AviPrep" width={176} height={44} className="h-12 w-auto self-start" />

      <div className="mt-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">CASA theory exam prep</p>
        <h1 className="mt-2 font-heading text-3xl font-bold leading-tight tracking-tight text-foreground text-balance">
          Pass your theory exams with confidence.
        </h1>
      </div>

      <ul className="mt-8 space-y-2">
        {FEATURES.map((f) => (
          <li key={f.title} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 shadow-e1">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <f.icon className="h-5 w-5 text-primary" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block font-medium text-foreground">{f.title}</span>
              <span className="block text-sm text-muted-foreground">{f.hint}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-auto space-y-3 pt-10">
        <Button asChild size="lg" className="h-12 w-full text-base">
          <Link href="/register">Create free account</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="h-12 w-full text-base">
          <Link href="/m/login">Sign in</Link>
        </Button>
        <InstallAppButton variant="secondary" className="h-12 w-full text-base" />
      </div>
    </main>
  )
}
