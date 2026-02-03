import type { Metadata } from "next"
import LoginForm from "./login-form"

export const metadata: Metadata = {
  title: "Log In",
  description:
    "Sign in to your AviPrep account to access practice exams, track your progress, and continue your Commercial Pilot License theory preparation.",
  openGraph: {
    title: "Log In",
    description: "Access your theory practice exams and continue your journey to becoming a Commercial Pilot.",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function LoginPage() {
  return <LoginForm />
}
