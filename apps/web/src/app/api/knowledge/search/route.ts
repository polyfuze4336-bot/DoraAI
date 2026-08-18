import {
  getKnowledgeService,
  type KnowledgeSearchRequest,
} from "@dora/knowledge";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  query: z.string().trim().max(500).default(""),
  top: z.coerce.number().int().min(1).max(50).default(10),
  commodity: z.string().trim().optional(),
  region: z.string().trim().optional(),
  classification: z
    .enum(["public", "internal", "confidential", "restricted"])
    .optional(),
});

export async function POST(request: Request) {
  try {
    const searchRequest = requestSchema.parse(await request.json());
    const service = await getKnowledgeService();
    const results = await service.search(
      searchRequest as KnowledgeSearchRequest,
    );
    return Response.json({ results });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Search failed." },
      { status: 400 },
    );
  }
}
