import { z } from "zod";
import { correlationIdFromHeaders } from "@dora/observability";

import { createDoraAgent } from "@/lib/dora-agent-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  question: z.string().trim().min(3).max(1_500),
  commodityIds: z.array(z.string().trim().min(1).max(80)).max(10).default([]),
  dateFrom: z.iso.datetime({ offset: true }).optional(),
  dateTo: z.iso.datetime({ offset: true }).optional(),
});

export async function POST(request: Request) {
  const query = {
    ...requestSchema.parse(await request.json()),
    correlationId: correlationIdFromHeaders(request.headers),
  };
  const agent = await createDoraAgent();
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for await (const event of agent.stream(query)) {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-content-type-options": "nosniff",
    },
  });
}
