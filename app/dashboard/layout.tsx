import HubLayout from "@/layout/hub";
import { UserProvider } from "@lib/user-context";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Australia's most comprehensive exam preparation platform. AI-powered insights, thousands of practice questions, and detailed analytics to help you pass first time.",
  openGraph: {
    title: "AviPrep | Master Your Flight Theory with Confidence",
    description:
      "Join 500+ aspiring pilots. 5,000+ questions, AI insights, 95% pass rate. Be the first to know when we launch.",
  },
}

export default ({ children }: { children: React.ReactNode }) => {
    return (
        <UserProvider>
            <HubLayout>
              <div className="hidden dark:absolute top-0 inset-0 bg-gradient-to-b from-blue-400/20 dark:from-blue-900/20 to-transparent pointer-events-none" />
              {children}
            </HubLayout>
        </UserProvider>
    )
}