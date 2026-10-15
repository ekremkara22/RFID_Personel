import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  experimental: {
    // Product image uploads (Satış & Pazarlama): up to 5 images x 2 MB plus form fields.
    serverActions: { bodySizeLimit: "12mb" },
  },
  outputFileTracingIncludes: {
    "/api/reports/operation-summary": ["./node_modules/dejavu-fonts-ttf/ttf/*.ttf"],
  },
};

export default nextConfig;
