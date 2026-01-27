import { Metadata, Viewport } from "next";
import "../components/globals.css";
import CaptchaProvider from "@/components/meta/recaptcha-provider";
import { ThemeProvider } from "@/components/meta/theme-provider";

export const metadata: Metadata = {
  metadataBase: new URL("https://aviprep.com.au"),
  themeColor: '#f78601',
  alternates: {
    canonical: "/",
  },
  title: "AviPrep",
  description:
    "Australia's #1 CPL exam preparation platform. 5,000+ practice questions across 7 theory subjects, AI-powered insights, and detailed analytics. Join 500+ pilots on the waitlist.",
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
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0f" },
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
          <CaptchaProvider>
            {children}
          </CaptchaProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}