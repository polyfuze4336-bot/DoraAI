import { DefaultAzureCredential, type TokenCredential } from "@azure/identity";
import { EmailClient } from "@azure/communication-email";
import { logStructured } from "@dora/observability";

import type { EmailDeliveryResult, WeeklyBriefEmailSender } from "./contracts";

export interface AcsEmailConfig {
  readonly endpoint?: string;
  readonly senderAddress?: string;
  readonly connectionString?: string;
}

export class AzureCommunicationEmailSender implements WeeklyBriefEmailSender {
  constructor(
    private readonly config: AcsEmailConfig,
    private readonly credential: TokenCredential = new DefaultAzureCredential(),
    private readonly fetchImplementation: typeof fetch = fetch,
  ) {}

  async send(input: {
    readonly report: Parameters<WeeklyBriefEmailSender["send"]>[0]["report"];
    readonly recipients: readonly string[];
    readonly subjectPrefix?: string;
  }): Promise<EmailDeliveryResult> {
    if (!this.config.endpoint || !this.config.senderAddress) {
      logStructured({
        event: "email.delivery",
        correlationId: input.report.reportId,
        timestamp: new Date().toISOString(),
        success: false,
        attributes: {
          status: "awaiting-configuration",
          recipientCount: input.recipients.length,
        },
      });
      return { status: "awaiting-configuration" };
    }
    if (!input.recipients.length)
      throw new Error("At least one report recipient is required.");
    if (this.config.connectionString) {
      const result = await new EmailClient(
        this.config.connectionString,
      ).beginSend({
        senderAddress: this.config.senderAddress,
        recipients: {
          to: input.recipients.map((address) => ({ address })),
        },
        content: {
          subject: `${input.subjectPrefix ?? ""}${input.report.title}`,
          html: input.report.html,
        },
      });
      const delivery = await result.pollUntilDone();
      if (delivery.status !== "Succeeded") {
        throw new Error(
          `ACS Email delivery failed: ${delivery.error?.message ?? delivery.status}`,
        );
      }
      return { status: "sent", messageId: delivery.id };
    }
    const token = await this.credential.getToken(
      "https://communication.azure.com/.default",
    );
    if (!token) throw new Error("Unable to acquire ACS Email access token.");
    const response = await this.fetchImplementation(
      `${this.config.endpoint.replace(/\/$/, "")}/emails:send?api-version=2023-03-31`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          senderAddress: this.config.senderAddress,
          recipients: {
            to: input.recipients.map((address) => ({ address })),
          },
          content: {
            subject: `${input.subjectPrefix ?? ""}${input.report.title}`,
            html: input.report.html,
          },
        }),
      },
    );
    if (!response.ok) {
      logStructured({
        event: "email.delivery",
        correlationId: input.report.reportId,
        timestamp: new Date().toISOString(),
        success: false,
        attributes: { statusCode: response.status },
      });
      throw new Error(`ACS Email request failed: HTTP ${response.status}`);
    }
    logStructured({
      event: "email.delivery",
      correlationId: input.report.reportId,
      timestamp: new Date().toISOString(),
      success: true,
      attributes: { recipientCount: input.recipients.length },
    });
    return {
      status: "sent",
      messageId:
        response.headers.get("operation-id") ??
        response.headers.get("x-ms-request-id") ??
        undefined,
    };
  }
}
