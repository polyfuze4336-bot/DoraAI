import { calculateManufacturingOutlookInfluence } from "@dora/intelligence";
import { PostgresOperationalStore } from "@dora/storage";
import { LocalSqliteManufacturingStore } from "@dora/storage/local-sqlite-store";
import { resolve } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const host = process.env.PGHOST;
  const database = process.env.PGDATABASE;
  const user = process.env.PGUSER;
  if (!host || !database || !user) {
    const root = process.env.DORA_ROOT ?? process.env.INIT_CWD ?? process.cwd();
    const store = await LocalSqliteManufacturingStore.open(
      resolve(
        root,
        process.env.DORA_LOCAL_DATABASE_PATH ?? ".dora-data/dora-local.db",
      ),
      resolve(root, "config/demo-manufacturing-records.json"),
    );
    const records = await store.listManufacturingStatus();
    store.close();
    return Response.json({
      status: "ready",
      database: "local-sqlite",
      records,
      influence: calculateManufacturingOutlookInfluence(records),
      message:
        "Using seeded demo rows persisted in the local application database. Configure PostgreSQL for production.",
    });
  }
  const url = new URL(request.url);
  const store = new PostgresOperationalStore({
    host,
    database,
    user,
    port: Number(process.env.PGPORT ?? 5432),
    password: process.env.PGPASSWORD,
    useEntraIdentity: process.env.PG_USE_ENTRA_IDENTITY !== "false",
    ssl: process.env.PGSSL !== "false",
  });
  try {
    const records = await store.listManufacturingStatus({
      region: url.searchParams.get("region") ?? undefined,
      status:
        (url.searchParams.get("status") as
          "normal" | "constrained" | "disrupted" | "maintenance" | null) ??
        undefined,
    });
    return Response.json({
      status: "ready",
      records,
      influence: calculateManufacturingOutlookInfluence(records),
      generatedAt: new Date().toISOString(),
    });
  } finally {
    await store.close();
  }
}
