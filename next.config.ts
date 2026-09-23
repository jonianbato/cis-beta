import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin the workspace root: a stray package-lock.json in the parent folder
  // otherwise makes Turbopack infer the wrong root.
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        // Without no-store a browser can serve a cached worker for up to 24h,
        // which is how a PWA gets stuck on an old build.
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
