import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const root = process.env.DORA_ROOT ?? process.env.INIT_CWD ?? process.cwd();
  const events = JSON.parse(
    await readFile(resolve(root, "config/demo-timeline-events.json"), "utf8"),
  );
  return Response.json({
    events,
    source: "seeded-demo-history",
    purpose:
      "Demonstrates event ordering and whether DORA signals preceded or followed market movement.",
  });
}
