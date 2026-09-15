/** @type {import('next').NextConfig} */
const nextConfig = {
    cleanDistDir: true,
    reactStrictMode: true,
    poweredByHeader: false,
    env: {
        NEXT_TELEMETRY_DISABLED: '1',
    },
    async headers() {
        return [
            {
                // Always revalidate the service worker, or an old one can hang around for a day.
                source: "/sw.js",
                headers: [
                    { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
                    { key: "Service-Worker-Allowed", value: "/" },
                    { key: "Content-Type", value: "application/javascript; charset=utf-8" },
                ],
            },
        ]
    },
    // eslint: { ignoreDuringBuilds: true },
    // typescript: { ignoreBuildErrors: true },
}

export default nextConfig;