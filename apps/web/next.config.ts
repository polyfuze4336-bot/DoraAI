import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: [
    "@azure/monitor-opentelemetry",
    "import-in-the-middle",
  ],
  transpilePackages: [
    "@dora/agents",
    "@dora/connectors",
    "@dora/forecasting",
    "@dora/intelligence",
    "@dora/knowledge",
    "@dora/observability",
    "@dora/pipeline",
    "@dora/reporting",
    "@dora/shared",
    "@dora/storage",
  ],
};

export default nextConfig;
