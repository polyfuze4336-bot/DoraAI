import { loadSharedConfig } from "@dora/shared/config";

import { DoraExecutiveDashboard } from "@/components/dora-executive-dashboard";

export default function Home() {
  const config = loadSharedConfig();

  return (
    <DoraExecutiveDashboard
      appName={config.NEXT_PUBLIC_DORA_APP_NAME}
      demoMode={config.NEXT_PUBLIC_DORA_DEMO_MODE}
    />
  );
}
