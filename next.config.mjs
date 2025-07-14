/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Router is stable in Next.js 15+, no experimental flag needed
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
}

export default nextConfig