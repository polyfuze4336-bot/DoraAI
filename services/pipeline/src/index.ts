import { setDefaultResultOrder } from "node:dns";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { withObservedOperation } from "@dora/observability";
import { initializeObservability } from "@dora/observability/azure-monitor";

import { runScheduledProcessing } from "./scheduled-processing";

async function main(): Promise<void> {
  try {
    setDefaultResultOrder("ipv4first");
    loadLocalEnvironment();
    initializeObservability("dora-pipeline");
    const correlationId = crypto.randomUUID();
    const summary = await withObservedOperation(
      "scheduled-job.execution",
      {
        correlationId,
        category: "scheduled-job",
        attributes: { workload: "dora-pipeline" },
      },
      () => runScheduledProcessing(process.env, new Date(), correlationId),
    );
    console.info(
      JSON.stringify({ event: "scheduled-processing.completed", ...summary }),
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "pipeline.failed",
        message:
          error instanceof Error ? error.message : "Unknown pipeline failure.",
      }),
    );
    process.exitCode = 1;
  }
}

void main();

function loadLocalEnvironment(): void {
  const rootDirectory =
    process.env.DORA_ROOT ?? process.env.INIT_CWD ?? process.cwd();
  const environmentPath = resolve(rootDirectory, ".env.local");
  if (existsSync(environmentPath)) {
    process.loadEnvFile(environmentPath);
  }
}
