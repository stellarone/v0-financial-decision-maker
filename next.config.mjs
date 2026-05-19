/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["finance.localhost", "*.finance.localhost"],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
