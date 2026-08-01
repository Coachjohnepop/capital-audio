import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  // Multi-cam / multi-track uploads (Vercel default is too small for show files)
  experimental: {
    serverActions: {
      bodySizeLimit: "512mb",
    },
    middlewareClientMaxBodySize: "512mb",
  },
};

export default nextConfig;
