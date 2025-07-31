/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone build for Docker (disabled for dev)
  // output: 'standalone',
  
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=()',
          },
        ],
      },
    ]
  },
  
  // Server external packages
  serverExternalPackages: ['@prisma/client', 'prisma'],
  
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
    FRONTEND_URL: process.env.FRONTEND_URL,
    STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
  },
  
  // Webpack configuration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Ignore node-specific modules in client bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: require.resolve('crypto-browserify'),
      }
    }
    
    return config
  },
  
  // Compression
  compress: true,
  
  // Power by header
  poweredByHeader: false,
  
  // Trailing slash
  trailingSlash: false,
  
  // Redirects
  async redirects() {
    return [
      // Removed /home redirect - /home should be accessible for authenticated users
    ]
  },
  
  // Rewrites for API proxying (if needed)
  async rewrites() {
    return [
      // Add any API rewrites here if needed
    ]
  },
}

module.exports = nextConfig