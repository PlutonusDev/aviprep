import { Building2, Check, Globe, X } from "lucide-react"
import { PageHead, Panel } from "@/components/demo/bits"
import { DEMO_SCHOOL } from "@lib/demo/school"
import { TENANT_FEATURES } from "@lib/tenant-features"

/** Your subdomain, your logo, your call on which features students get. */

const OFF: string[] = ["forums", "messages"]

export default function DemoBranding() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHead title="Your branding" blurb={`${DEMO_SCHOOL.subdomain}.aviprep.com.au`} />

      <div className="space-y-6">
        <Panel title="Your address" description="Or point your own domain at it.">
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
            <Globe className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <code className="min-w-0 flex-1 truncate text-sm text-foreground">
              <span className="font-semibold">{DEMO_SCHOOL.subdomain}</span>.aviprep.com.au
            </code>
            <span className="inline-flex shrink-0 items-center gap-1 rounded bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
              <Check className="h-3 w-3" aria-hidden="true" />
              Live
            </span>
          </div>
        </Panel>

        <Panel title="Colours and logo" description="The student app, the sign-in page and your emails.">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-3">
              {[
                { label: "Primary", value: DEMO_SCHOOL.primaryColour },
                { label: "Accent", value: DEMO_SCHOOL.accentColour },
              ].map((c) => (
                <div key={c.label} className="flex items-center gap-3">
                  <span aria-hidden="true" className="h-10 w-10 shrink-0 rounded-lg border border-border" style={{ backgroundColor: c.value }} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.label}</p>
                    <p className="font-mono text-xs text-muted-foreground">{c.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* What a student actually opens. */}
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="flex items-center gap-2 px-4 py-3" style={{ backgroundColor: DEMO_SCHOOL.primaryColour }}>
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/20">
                  <Building2 className="h-3.5 w-3.5 text-white" aria-hidden="true" />
                </span>
                <span className="truncate text-sm font-semibold text-white">{DEMO_SCHOOL.name}</span>
              </div>
              <div className="space-y-2.5 bg-card p-4">
                <p className="text-xs leading-relaxed text-muted-foreground">{DEMO_SCHOOL.welcomeMessage}</p>
                <span className="block h-8 rounded-md" style={{ backgroundColor: DEMO_SCHOOL.accentColour }} />
                <span className="block h-2 w-3/4 rounded-full bg-muted" />
                <span className="block h-2 w-1/2 rounded-full bg-muted" />
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Student features">
          <ul className="divide-y divide-border">
            {TENANT_FEATURES.map((feature) => {
              const on = !OFF.includes(feature.key)
              return (
                <li key={feature.key} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{feature.label}</p>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${
                      on ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {on ? <Check className="h-3 w-3" aria-hidden="true" /> : <X className="h-3 w-3" aria-hidden="true" />}
                    {on ? "On" : "Off"}
                  </span>
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>
    </div>
  )
}
