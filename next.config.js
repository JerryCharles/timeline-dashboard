/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure asset prefix for CDN only if URL is provided
  // assetPrefix: process.env.NEXT_PUBLIC_CDN_URL || '',
  // Image optimization settings
  images: {
    unoptimized: true,
    domains: ['timeline8.b-cdn.net'], // Add your BunnyCDN domain
  },
  // Production optimizations
  reactStrictMode: true,
  // Use standalone output for better deployment compatibility
  output: 'standalone',
};

module.exports = nextConfig; 