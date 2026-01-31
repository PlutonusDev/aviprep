/** @type {import('next').NextConfig} */
const nextConfig = {
    cleanDistDir: true,
    reactStrictMode: true,
    poweredByHeader: false,
    env: {
        NEXT_TELEMETRY_DISABLED: '1',
    },
    // eslint: { ignoreDuringBuilds: true },
    // typescript: { ignoreBuildErrors: true },
}

export default nextConfig;