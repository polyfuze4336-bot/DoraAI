import { intelligenceDomains, loadSharedConfig } from "@dora/shared";

export const dynamic = "force-dynamic";

export function GET() {
  const config = loadSharedConfig();

  return Response.json(
    {
      status: "ok",
      service: "dora-web",
      environment: config.DORA_ENV,
      demoMode: config.NEXT_PUBLIC_DORA_DEMO_MODE,
      intelligenceDomains,
      checkedAt: new Date().toISOString(),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
