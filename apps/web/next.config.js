/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    appDir: true,
  },
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
  env: {
    NEXT_PUBLIC_DOMA_RPC: process.env.NEXT_PUBLIC_DOMA_RPC,
    NEXT_PUBLIC_AVALANCHE_RPC: process.env.NEXT_PUBLIC_AVALANCHE_RPC,
    NEXT_PUBLIC_CIRCLE_FACTORY_ADDRESS: process.env.NEXT_PUBLIC_CIRCLE_FACTORY_ADDRESS,
    NEXT_PUBLIC_MIRROR_NFT_ADDRESS: process.env.NEXT_PUBLIC_MIRROR_NFT_ADDRESS,
  },
};

module.exports = nextConfig;