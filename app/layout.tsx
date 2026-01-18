import { Metadata } from "next";
import "../components/globals.css";

export const metadata: Metadata = {
  title: "AviPrep",
  description:
    "Australia's #1 CPL exam preparation platform. 5,000+ practice questions across 7 theory subjects, AI-powered insights, and detailed analytics. Join 500+ pilots on the waitlist.",
  openGraph: {
    title: "AviPrep | Master Your Flight Theory with Confidence",
    description:
      "Join 500+ aspiring pilots. 5,000+ questions, AI insights. Be the first to know when we launch.",
  },
}

export default ({ children }: { children: React.ReactNode }) => {
    return (
        <html lang="en">
            <body className="antialiased overflow-x-hidden cursor-default">
                {children}
            </body>
        </html>
    )
}