import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  outputFileTracingIncludes: {
    "/api/reports/operation-summary": ["./node_modules/dejavu-fonts-ttf/ttf/*.ttf"],
  },
};

export default nextConfig;
