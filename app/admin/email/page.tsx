import { Metadata } from "next"
import { EmailContent } from "./email-content"

export const metadata: Metadata = {
  title: "Email",
  description: "Send emails to users and waitlist members",
}

export default function EmailPage() {
  return <EmailContent />
}
