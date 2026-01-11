/** @type {import('next').NextConfig} */
const nextConfig = {
    cleanDistDir: true,
    reactStrictMode: true,
    poweredByHeader: false,
    env: {
        NEXT_TELEMETRY_DISABLED: '1',
    }
}

export default nextConfig;