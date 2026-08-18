import { correlationIdFromHeaders, logStructured } from "@dora/observability";
import { z } from "zod";

export const runtime = "nodejs";

const errorSchema = z.object({
  name: z.string().max(120),
  message: z.string().max(1_000),
  digest: z.string().max(200).optional(),
  path: z.string().max(500),
});

export async function POST(request: Request) {
  const event = errorSchema.parse(await request.json());
  logStructured({
    event: "web.page_failure",
    correlationId: correlationIdFromHeaders(request.headers),
    timestamp: new Date().toISOString(),
    success: false,
    attributes: { path: event.path, digest: event.digest },
    error: { type: event.name, message: event.message },
  });
  return new Response(null, { status: 204 });
}
