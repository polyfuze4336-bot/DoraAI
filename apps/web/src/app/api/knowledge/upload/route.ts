import { getKnowledgeService, parseKnowledgeMetadata } from "@dora/knowledge";
import { ZodError } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maximumFileBytes = 20 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const metadataValue = form.get("metadata");
    if (!(file instanceof File)) {
      return Response.json(
        { error: "A document file is required." },
        { status: 400 },
      );
    }
    if (file.size > maximumFileBytes) {
      return Response.json(
        { error: "The document exceeds the 20 MB prototype upload limit." },
        { status: 413 },
      );
    }
    if (typeof metadataValue !== "string") {
      return Response.json(
        { error: "Document metadata is required." },
        { status: 400 },
      );
    }
    const metadata = parseKnowledgeMetadata(JSON.parse(metadataValue));
    const service = await getKnowledgeService();
    const document = await service.upload({
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      data: new Uint8Array(await file.arrayBuffer()),
      metadata,
    });
    return Response.json({ document }, { status: 201 });
  } catch (error) {
    return knowledgeError(error);
  }
}

function knowledgeError(error: unknown): Response {
  if (error instanceof ZodError || error instanceof SyntaxError) {
    return Response.json(
      { error: "The document metadata is invalid.", details: error.message },
      { status: 400 },
    );
  }
  return Response.json(
    { error: error instanceof Error ? error.message : "Upload failed." },
    { status: 500 },
  );
}
