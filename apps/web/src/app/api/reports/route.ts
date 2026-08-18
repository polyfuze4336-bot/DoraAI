import { z } from "zod";

import {
  configuredRecipients,
  emailSender,
  ensureCurrentBrief,
  generateCurrentBrief,
  reportRepository,
} from "@/lib/report-runtime";
import {
  AdminAuthorizationError,
  requireAdmin,
} from "@/lib/admin-authorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const actionSchema = z.object({
  action: z.enum(["regenerate", "send-test", "send"]),
  reportId: z.string().uuid().optional(),
});

export async function GET() {
  await ensureCurrentBrief();
  return Response.json({ reports: await reportRepository().list() });
}

export async function POST(request: Request) {
  try {
    requireAdmin(request.headers);
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
  const input = actionSchema.parse(await request.json());
  const repository = reportRepository();
  if (input.action === "regenerate") {
    const report = await generateCurrentBrief();
    await repository.save(report);
    return Response.json({ report }, { status: 201 });
  }
  if (!input.reportId) {
    return Response.json({ error: "reportId is required." }, { status: 400 });
  }
  const report = await repository.get(input.reportId);
  if (!report)
    return Response.json({ error: "Report not found." }, { status: 404 });
  const test = input.action === "send-test";
  const recipients = await configuredRecipients(test);
  if (!recipients.length) {
    const updated = {
      ...report,
      deliveryStatus: "awaiting-email-configuration" as const,
      recipients: [],
    };
    await repository.save(updated);
    return Response.json({
      report: updated,
      message: "Recipient configuration is required.",
    });
  }
  try {
    const delivery = await emailSender().send({
      report,
      recipients,
      subjectPrefix: test ? "[DORA TEST] " : undefined,
    });
    const updated = {
      ...report,
      deliveryStatus:
        delivery.status === "sent"
          ? test
            ? ("test-sent" as const)
            : ("sent" as const)
          : ("awaiting-email-configuration" as const),
      recipients,
      deliveryMessageId: delivery.messageId,
      sentAt: delivery.status === "sent" ? new Date().toISOString() : undefined,
    };
    await repository.save(updated);
    return Response.json({ report: updated });
  } catch (error) {
    const updated = {
      ...report,
      deliveryStatus: "failed" as const,
      recipients,
    };
    await repository.save(updated);
    return Response.json(
      {
        report: updated,
        error: error instanceof Error ? error.message : "Delivery failed.",
      },
      { status: 502 },
    );
  }
}
