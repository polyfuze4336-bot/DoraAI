import type { WeeklyBrief, WeeklyBriefContent } from "./contracts";
import { logStructured } from "@dora/observability";

export function generateWeeklyBrief(
  content: WeeklyBriefContent,
  timezone: string,
  generatedAt = new Date().toISOString(),
): WeeklyBrief {
  if (content.executiveSummary.length > 5) {
    throw new Error("Executive Summary must contain no more than five points.");
  }
  new Intl.DateTimeFormat("en", { timeZone: timezone }).format(
    new Date(generatedAt),
  );
  const reportId = crypto.randomUUID();
  const title = "DORA Weekly Commodity Intelligence Brief" as const;
  const report: WeeklyBrief = {
    reportId,
    title,
    generatedAt,
    asOf: content.asOf,
    timezone,
    html: renderHtml(title, content, generatedAt, timezone),
    content,
    status: "ready",
    deliveryStatus: "not-sent",
    recipients: [],
  };
  logStructured({
    event: "report.generated",
    correlationId: reportId,
    timestamp: generatedAt,
    success: true,
    attributes: {
      reportType: "weekly-commodity-intelligence",
      timezone,
      executiveSummaryPoints: content.executiveSummary.length,
    },
  });
  return report;
}

function renderHtml(
  title: string,
  content: WeeklyBriefContent,
  generatedAt: string,
  timezone: string,
): string {
  const sections: readonly [string, readonly string[]][] = [
    ["Executive Summary", content.executiveSummary],
    ["Market Outlook", content.marketOutlook],
    ["Major Commodity Moves", content.majorCommodityMoves],
    ["Key Drivers", content.keyDrivers],
    ["Emerging Risks", content.emergingRisks],
    ["Manufacturing Signals", content.manufacturingSignals],
    ["Forecast Changes", content.forecastChanges],
    ["Management Actions", content.managementActions],
    ["Watchlist for Coming Week", content.watchlist],
    ["Confidence & Data Quality", content.confidenceAndDataQuality],
  ];
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(title)}</title></head>
<body style="margin:0;background:#f2f4f1;color:#17262e;font-family:Arial,sans-serif">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f4f1"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:720px;background:#fcfdfa;border:1px solid #dce2df">
<tr><td style="background:#0d2638;color:white;padding:30px"><div style="font-size:12px;text-transform:uppercase;color:#9bd4cc">DORA · Weekly intelligence</div><h1 style="margin:8px 0 0;font-family:Georgia,serif;font-size:32px;line-height:1.1">${escape(title)}</h1><p style="margin:12px 0 0;color:#c9d4da;font-size:12px">As of ${escape(content.asOf)} · Generated ${escape(formatDate(generatedAt, timezone))} · ${escape(timezone)}</p></td></tr>
${sections.map(([heading, items]) => `<tr><td style="padding:24px 30px;border-bottom:1px solid #e9edeb"><h2 style="margin:0 0 12px;font-family:Georgia,serif;font-size:21px;color:#0d2638">${escape(heading)}</h2>${items.length ? `<ul style="margin:0;padding-left:20px">${items.map((item) => `<li style="margin:8px 0;font-size:14px;line-height:1.55">${escape(item)}</li>`).join("")}</ul>` : '<p style="color:#65727a;font-size:14px">No material update.</p>'}</td></tr>`).join("")}
<tr><td style="padding:20px 30px;color:#65727a;font-size:11px;line-height:1.5">DORA distinguishes observed data, calculations, model forecasts and AI interpretation. Review cited evidence before management action.</td></tr>
</table></td></tr></table></body></html>`;
}

function formatDate(value: string, timezone: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(value));
}

function escape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
