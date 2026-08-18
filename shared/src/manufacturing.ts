export interface NormalizedManufacturingStatus {
  readonly recordId: string;
  readonly site: string;
  readonly region: string;
  readonly product: string;
  readonly capacity: number;
  readonly utilization: number;
  readonly plannedOutput: number;
  readonly actualOutput: number;
  readonly downtime: number;
  readonly inventory: number;
  readonly feedstockAvailability: number;
  readonly demandIndicator: number;
  readonly status: "normal" | "constrained" | "disrupted" | "maintenance";
  readonly timestamp: string;
  readonly dataOrigin: "internal" | "seeded-demo";
}
