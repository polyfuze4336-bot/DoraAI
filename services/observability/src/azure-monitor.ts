import { useAzureMonitor } from "@azure/monitor-opentelemetry";
import { DefaultAzureCredential } from "@azure/identity";

let initialized = false;

export function initializeObservability(
  serviceName: string,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): void {
  if (initialized || !environment.APPLICATIONINSIGHTS_CONNECTION_STRING) return;
  process.env.OTEL_SERVICE_NAME = serviceName;
  useAzureMonitor({
    azureMonitorExporterOptions: {
      connectionString: environment.APPLICATIONINSIGHTS_CONNECTION_STRING,
      credential: new DefaultAzureCredential(
        environment.AZURE_CLIENT_ID
          ? { managedIdentityClientId: environment.AZURE_CLIENT_ID }
          : undefined,
      ),
      disableOfflineStorage: true,
    },
    enableLiveMetrics: environment.DORA_ENABLE_LIVE_METRICS === "true",
  });
  initialized = true;
}
