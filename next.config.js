/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure asset prefix for CDN only in production
  assetPrefix: process.env.NODE_ENV === 'production' ? process.env.NEXT_PUBLIC_CDN_URL : '',
  // Image optimization settings
  images: {
    unoptimized: true,
    domains: ['timeline8.b-cdn.net'], // Add your BunnyCDN domain
  },
  // Production optimizations
  reactStrictMode: true,
  // Disable static exports since we need server functionality
  output: 'standalone',
};

module.exports = nextConfig; 