import type { NextConfig } from "next";
import path from "path";

// Resolve the absolute project root once so Turbopack never crawls upward
const projectRoot = path.resolve(__dirname);

const nextConfig: NextConfig = {
  output: "standalone", // Required for Hostinger Node.js deployment
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cms.cooketricks.com" },
      {
        protocol: "https",
        hostname: "image.pollinations.ai",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  // CRITICAL: pin Turbopack to THIS directory.
  // Without this (or with a stray package-lock.json in a parent folder),
  // Turbopack walks all the way up to /home/mizoo and watches the entire
  // home directory — causing extreme I/O and laptop freeze.
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
