/** @type {import('next').NextConfig} */
const nextConfig = {
  // standalone only for Docker/Hostinger — Vercel manages its own output
  ...(process.env.NEXT_BUILD_STANDALONE === 'true' ? { output: 'standalone' } : {}),
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
