import { reportRepository } from "@/lib/report-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ reportId: string }> },
) {
  const { reportId } = await context.params;
  const report = await reportRepository().get(reportId);
  if (!report)
    return Response.json({ error: "Report not found." }, { status: 404 });
  return new Response(report.html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-disposition": `attachment; filename="dora-weekly-brief-${report.asOf.slice(0, 10)}.html"`,
    },
  });
}
