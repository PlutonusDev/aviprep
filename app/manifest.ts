import type { MetadataRoute } from "next"

/**
 * Web app manifest, served at /manifest.webmanifest and linked automatically.
 *
 * Replaces public/site.webmanifest, whose absolute start_url
 * (https://aviprep.com.au/m) made the manifest invalid on every other origin -
 * localhost, staging and school subdomains - so Chrome never offered to install.
 * Every URL here is relative, so each origin gets a working app.
 *
 * Chrome's install criteria: name, 192px and 512px icons, a start_url,
 * a standalone-type display, and HTTPS (or localhost).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/m",
    name: "AviPrep",
    short_name: "AviPrep",
    description: "CASA theory exam prep: practice exams, lessons and progress tracking.",
    start_url: "/m?source=pwa",
    // The whole site, so the dashboard, exams and lessons open inside the app
    // rather than bouncing out to a browser tab.
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#ffffff",
    theme_color: "#f78601",
    categories: ["education"],
    lang: "en-AU",
    dir: "ltr",
    prefer_related_applications: false,
    icons: [
      { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Padded to the 80% safe zone so Android's circle and squircle masks don't crop the logo.
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Practice exams",
        short_name: "Exams",
        url: "/dashboard/exams",
        icons: [{ src: "/android-chrome-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Subject courses",
        short_name: "Courses",
        url: "/dashboard/learn",
        icons: [{ src: "/android-chrome-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Exam history",
        short_name: "History",
        url: "/dashboard/history",
        icons: [{ src: "/android-chrome-192x192.png", sizes: "192x192" }],
      },
    ],
  }
}
