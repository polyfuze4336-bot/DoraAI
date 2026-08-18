import type { Metadata } from "next";
import { loadSharedConfig } from "@dora/shared/config";

import { DoraCommandCentre } from "@/components/dora-command-centre";

export const metadata: Metadata = {
  title: "DORA Executive Command Centre",
  description:
    "Executive commodity market state, outlook, risks, intelligence and management attention.",
};

export default function DashboardPage() {
  const config = loadSharedConfig();

  return (
    <DoraCommandCentre
      appName={config.NEXT_PUBLIC_DORA_APP_NAME}
      demoMode={config.NEXT_PUBLIC_DORA_DEMO_MODE}
    />
  );
}
