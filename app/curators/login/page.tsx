import type { Metadata } from "next"
import { Suspense } from "react"
import { CuratorLoginForm } from "@/components/curators/login-form"

export const metadata: Metadata = {
  title: "Sign in",
}

export default function CuratorLoginPage() {
  return (
    <Suspense>
      <CuratorLoginForm />
    </Suspense>
  )
}
