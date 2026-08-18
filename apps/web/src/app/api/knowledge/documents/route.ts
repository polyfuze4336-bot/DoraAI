import { getKnowledgeService } from "@dora/knowledge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const service = await getKnowledgeService();
    return Response.json({ documents: await service.listDocuments() });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Documents are unavailable.",
      },
      { status: 503 },
    );
  }
}
