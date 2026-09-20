import type { MetadataRoute } from "next"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aviprep.com.au"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /demo is a sales walkthrough full of invented students; it's shared
        // by link, not found by search.
        disallow: ["/api/", "/checkout/", "/dashboard/settings/", "/admin/", "/demo"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
