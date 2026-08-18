export interface WeeklyBriefContent {
  readonly asOf: string;
  readonly executiveSummary: readonly string[];
  readonly marketOutlook: readonly string[];
  readonly majorCommodityMoves: readonly string[];
  readonly keyDrivers: readonly string[];
  readonly emergingRisks: readonly string[];
  readonly manufacturingSignals: readonly string[];
  readonly forecastChanges: readonly string[];
  readonly managementActions: readonly string[];
  readonly watchlist: readonly string[];
  readonly confidenceAndDataQuality: readonly string[];
}

export interface WeeklyBrief {
  readonly reportId: string;
  readonly title: "DORA Weekly Commodity Intelligence Brief";
  readonly generatedAt: string;
  readonly asOf: string;
  readonly timezone: string;
  readonly html: string;
  readonly content: WeeklyBriefContent;
  readonly status: "draft" | "ready";
  readonly deliveryStatus:
    | "not-sent"
    | "test-sent"
    | "sent"
    | "failed"
    | "awaiting-email-configuration";
  readonly recipients: readonly string[];
  readonly deliveryMessageId?: string;
  readonly sentAt?: string;
}

export interface EmailDeliveryResult {
  readonly status: "sent" | "awaiting-configuration";
  readonly messageId?: string;
}

export interface WeeklyBriefEmailSender {
  send(input: {
    readonly report: WeeklyBrief;
    readonly recipients: readonly string[];
    readonly subjectPrefix?: string;
  }): Promise<EmailDeliveryResult>;
}
