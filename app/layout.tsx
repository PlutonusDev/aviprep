import { Metadata, Viewport } from "next";
import "../components/globals.css";
import CaptchaProvider from "@/components/meta/recaptcha-provider";
import { ThemeProvider } from "@/components/meta/theme-provider";
import { TenantProvider } from "@lib/tenant-context";

export const metadata: Metadata = {
  metadataBase: new URL("https://aviprep.com.au"),
  alternates: {
    canonical: "/",
  },
  title: {
    default: "AviPrep | Master Your Flight Theory with Confidence",
    template: "%s | AviPrep",
  },
  description:
    "Australia's most comprehensive CPL exam preparation platform. AI-powered insights, thousands of practice questions, and detailed analytics to help you pass first time.",
  keywords: [
    "CPL exam",
    "CASA CPL",
    "Commercial Pilot License",
    "pilot theory exam",
    "aviation exam Australia",
    "CPL practice test",
    "CASA theory exam",
    "pilot training Australia",
    "aerodynamics exam",
    "meteorology exam",
    "air law exam",
    "navigation exam",
    "human factors exam",
    "flight planning exam",
    "aircraft systems exam",
  ],
  authors: [{ name: "AviPrep" }],
  creator: "AviPrep",
  publisher: "AviPrep",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_AU",
    url: "https://aviprep.com.au/",
    title: "AviPrep | Master Your Flight Theory with Confidence",
    description:
      "Australia's most comprehensive CPL exam preparation platform. AI-powered insights, thousands of practice questions, and detailed analytics to help you pass first time.",
    images: [
      {
        url: "/img/AviPrep-logo.png",
        alt: "AviPrep | Master Your Flight Theory with Confidence",
      },
    ],
  },
  twitter: {
    title: "AviPrep | Master Your Flight Theory with Confidence",
    description:
      "Australia's most comprehensive CPL exam preparation platform. AI-powered insights, thousands of practice questions, and detailed analytics to help you pass first time.",
    images: ["/img/AviPrep-logo.png"],
    creator: "@AviPrep_AU",
  },
  manifest: "/site.webmanifest",
  category: "Education"
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f78601" },
    { media: "(prefers-color-scheme: dark)", color: "#f78601" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
}

export default ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "EducationalOrganization",
              name: "AviPrep",
              description:
                "Australia's most comprehensive CPL exam preparation platform. AI-powered insights, thousands of practice questions, and detailed analytics to help you pass first time.",
              url: `https://aviprep.com.au/`,
              logo: `https://aviprep.com.au/img/AviPrep-logo.png`,
              sameAs: [],
              address: {
                "@type": "PostalAddress",
                addressCountry: "AU",
              },
              areaServed: {
                "@type": "Country",
                name: "Australia",
              },
              hasOfferCatalog: {
                "@type": "OfferCatalog",
                name: "CPL Theory Exam Courses",
                itemListElement: [
                  {
                    "@type": "Course",
                    name: "CPL Aerodynamics",
                    description: "Comprehensive aerodynamics theory preparation for CASA CPL exam",
                    provider: {
                      "@type": "EducationalOrganization",
                      name: "AviPrep",
                    },
                  },
                  {
                    "@type": "Course",
                    name: "CPL Meteorology",
                    description: "Complete meteorology theory preparation for CASA CPL exam",
                    provider: {
                      "@type": "EducationalOrganization",
                      name: "AviPrep",
                    },
                  },
                  {
                    "@type": "Course",
                    name: "CPL Navigation",
                    description: "In-depth navigation theory preparation for CASA CPL exam",
                    provider: {
                      "@type": "EducationalOrganization",
                      name: "AviPrep",
                    },
                  },
                  {
                    "@type": "Course",
                    name: "CPL Air Law",
                    description: "Comprehensive air law theory preparation for CASA CPL exam",
                    provider: {
                      "@type": "EducationalOrganization",
                      name: "AviPrep",
                    },
                  },
                  {
                    "@type": "Course",
                    name: "CPL Human Factors",
                    description: "Complete human factors theory preparation for CASA CPL exam",
                    provider: {
                      "@type": "EducationalOrganization",
                      name: "AviPrep",
                    },
                  },
                  {
                    "@type": "Course",
                    name: "CPL Flight Planning",
                    description: "Detailed flight planning theory preparation for CASA CPL exam",
                    provider: {
                      "@type": "EducationalOrganization",
                      name: "AviPrep",
                    },
                  },
                  {
                    "@type": "Course",
                    name: "CPL Aircraft Systems",
                    description: "Comprehensive aircraft systems theory preparation for CASA CPL exam",
                    provider: {
                      "@type": "EducationalOrganization",
                      name: "AviPrep",
                    },
                  },
                ],
              },
            }),
          }}
        />
      </head>
      <body className="antialiased overflow-x-hidden cursor-default">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TenantProvider>
            <CaptchaProvider>
              {children}
            </CaptchaProvider>
          </TenantProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}