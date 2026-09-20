import { Suspense } from "react"
import { AccessForm } from "./access-form"

export const dynamic = "force-dynamic"

/** Where a code is entered. Outside the gate, or nobody could ever get in. */
export default function DemoAccessPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-sm">
        <Suspense fallback={null}>
          <AccessForm />
        </Suspense>
      </div>
    </main>
  )
}
