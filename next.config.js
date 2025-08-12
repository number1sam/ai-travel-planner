/** @type {import('next').NextConfig} */
const nextConfig = {
  // Images configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // Environment variables available to client
  env: {
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
    STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || '',
  },
  
  // Compression
  compress: true,
  
  // Power by header
  poweredByHeader: false,
  
  // Trailing slash
  trailingSlash: false,
}

module.exports = nextConfig