/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'berry.b-cdn.net',
        port: '',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: '2.3ja.com',
        port: '',
        pathname: '/images/**',
      }
    ],
  },
};

export default nextConfig;
