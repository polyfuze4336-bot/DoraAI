export const alertTypes = [
  "price-movement",
  "forecast-change",
  "risk-threshold",
  "anomaly",
  "source-outage",
  "important-news",
  "manufacturing-disruption",
  "confidence-deterioration",
] as const;

export type AlertType = (typeof alertTypes)[number];

export interface AlertCandidate {
  readonly type: AlertType;
  readonly severity: "info" | "low" | "medium" | "high" | "critical";
  readonly commodity: string | null;
  readonly reason: string;
  readonly timestamp: string;
  readonly evidence: readonly string[];
  readonly recommendedNextAction: string;
  readonly deduplicationKey: string;
}

export interface DoraAlert extends AlertCandidate {
  readonly alertId: string;
  readonly status: "open" | "acknowledged";
  readonly occurrenceCount: number;
  readonly firstOccurredAt: string;
  readonly lastOccurredAt: string;
  readonly acknowledgedAt?: string;
  readonly acknowledgedBy?: string;
}

export interface AlertPolicy {
  readonly cooldownMinutes: number;
  readonly maximumOpenAlertsPerKey: number;
}

export class DoraAlertEngine {
  constructor(
    private readonly policy: AlertPolicy = {
      cooldownMinutes: 240,
      maximumOpenAlertsPerKey: 1,
    },
  ) {}

  evaluate(
    candidate: AlertCandidate,
    existing: readonly DoraAlert[],
  ): { readonly alert?: DoraAlert; readonly deduplicated: boolean } {
    const matching = existing
      .filter(
        (alert) =>
          alert.deduplicationKey === candidate.deduplicationKey &&
          alert.status === "open",
      )
      .sort(
        (left, right) =>
          Date.parse(right.lastOccurredAt) - Date.parse(left.lastOccurredAt),
      );
    const latest = matching[0];
    const insideCooldown = latest
      ? Date.parse(candidate.timestamp) - Date.parse(latest.lastOccurredAt) <
        this.policy.cooldownMinutes * 60_000
      : false;
    if (
      latest &&
      (insideCooldown ||
        matching.length >= this.policy.maximumOpenAlertsPerKey)
    ) {
      return {
        alert: {
          ...latest,
          severity: maximumSeverity(latest.severity, candidate.severity),
          reason: candidate.reason,
          evidence: [...new Set([...latest.evidence, ...candidate.evidence])],
          occurrenceCount: latest.occurrenceCount + 1,
          lastOccurredAt: candidate.timestamp,
          recommendedNextAction: candidate.recommendedNextAction,
        },
        deduplicated: true,
      };
    }
    return {
      alert: {
        ...candidate,
        alertId: crypto.randomUUID(),
        status: "open",
        occurrenceCount: 1,
        firstOccurredAt: candidate.timestamp,
        lastOccurredAt: candidate.timestamp,
      },
      deduplicated: false,
    };
  }

  acknowledge(
    alert: DoraAlert,
    acknowledgedBy: string,
    acknowledgedAt = new Date().toISOString(),
  ): DoraAlert {
    if (!acknowledgedBy.trim()) throw new Error("Acknowledging user is required.");
    return {
      ...alert,
      status: "acknowledged",
      acknowledgedAt,
      acknowledgedBy,
    };
  }
}

const severities = ["info", "low", "medium", "high", "critical"] as const;
function maximumSeverity(
  left: AlertCandidate["severity"],
  right: AlertCandidate["severity"],
): AlertCandidate["severity"] {
  return severities[Math.max(severities.indexOf(left), severities.indexOf(right))]!;
}