import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  allowedDevOrigins: ["finance.localhost", "*.finance.localhost"],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

export default withWorkflow(nextConfig, {
  workflows: {
    dirs: ["lib/workflows"],
  },
} as Record<string, unknown>);
