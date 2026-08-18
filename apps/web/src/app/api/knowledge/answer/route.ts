import { getKnowledgeService } from "@dora/knowledge";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  question: z.string().trim().min(3).max(1_000),
  commodity: z.string().trim().optional(),
  region: z.string().trim().optional(),
  classification: z
    .enum(["public", "internal", "confidential", "restricted"])
    .optional(),
});

export async function POST(request: Request) {
  try {
    const { question, ...filters } = requestSchema.parse(await request.json());
    const service = await getKnowledgeService();
    return Response.json(await service.answer(question, filters));
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Answer generation failed.",
      },
      { status: 400 },
    );
  }
}
