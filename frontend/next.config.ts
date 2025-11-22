import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },

  env: {
    CDP_API_KEY_NAME: process.env.CDP_API_KEY_NAME,
    CDP_API_KEY_PRIVATE_KEY: process.env.CDP_API_KEY_PRIVATE_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  },
  images: {
    domains: [
      'payload-marketing.moonpay.com',
      'encrypted-tbn0.gstatic.com',
      'storage.googleapis.com',
      'upload.wikimedia.org',
    ],
  },
};

export default nextConfig;
