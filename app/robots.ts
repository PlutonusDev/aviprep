import type { MetadataRoute } from "next"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aviprep.com.au"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/checkout/", "/practice/settings/", "/admin/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
