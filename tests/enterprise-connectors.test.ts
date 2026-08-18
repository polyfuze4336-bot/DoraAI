import { describe, expect, it, vi } from "vitest";

import {
  DatabricksSqlAdapter,
  PowerBiSemanticModelAdapter,
  SharePointGraphConnector,
  type AccessTokenProvider,
} from "@dora/connectors";
import {
  EnterpriseKnowledgeIngestionService,
  type KnowledgeService,
} from "@dora/knowledge";

const tokens: AccessTokenProvider = {
  getToken: vi.fn().mockResolvedValue("test-token"),
};

const context = {
  correlationId: "test-run",
  requestedAt: "2026-08-17T12:00:00.000Z",
};

describe("enterprise connector configuration", () => {
  it("reports unavailable SharePoint, Databricks, and Power BI environments honestly", async () => {
    const sharePoint = new SharePointGraphConnector(
      { authentication: { method: "managed-identity" } },
      tokens,
      vi.fn(),
    );
    const databricks = new DatabricksSqlAdapter(
      {
        authentication: { method: "managed-identity" },
      },
      tokens,
      vi.fn(),
    );
    const powerBi = new PowerBiSemanticModelAdapter(
      {
        approvedQueries: {},
        authentication: { method: "entra-application" },
      },
      tokens,
      vi.fn(),
    );

    await expect(sharePoint.healthCheck()).resolves.toMatchObject({
      status: "not-configured",
    });
    await expect(databricks.healthCheck()).resolves.toMatchObject({
      status: "not-configured",
    });
    await expect(powerBi.healthCheck()).resolves.toMatchObject({
      status: "not-configured",
    });
    await expect(databricks.queryRecords({}, context)).rejects.toThrow(
      "awaiting environment configuration",
    );
  });

  it("uses Microsoft Graph delta and preserves SharePoint source IDs", async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        value: [
          {
            id: "drive-item-42",
            name: "copper.docx",
            webUrl: "https://contoso.sharepoint.com/copper.docx",
            eTag: "etag-7",
            lastModifiedDateTime: "2026-08-17T10:00:00.000Z",
            file: {
              mimeType:
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            },
          },
        ],
        "@odata.deltaLink":
          "https://graph.microsoft.com/v1.0/drives/delta?token=next",
      }),
    );
    const connector = new SharePointGraphConnector(
      {
        siteId: "site-id",
        driveId: "drive-id",
        authentication: { method: "managed-identity" },
      },
      tokens,
      fetchImplementation,
    );

    const page = await connector.listDocuments({ maximumItems: 25 }, context);

    expect(String(fetchImplementation.mock.calls[0]?.[0])).toContain(
      "graph.microsoft.com/v1.0",
    );
    expect(String(fetchImplementation.mock.calls[0]?.[0])).toContain("$top=25");
    expect(page.documents[0]?.reference).toMatchObject({
      system: "sharepoint",
      sourceId: "drive-item-42",
      sourceVersion: "etag-7",
    });
    expect(page.deltaToken).toBeTruthy();
  });
});

describe("Databricks SQL adapter", () => {
  it("sends a bounded, parameterized filtered query and maps source IDs", async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        statement_id: "statement-1",
        status: { state: "SUCCEEDED" },
        manifest: {
          schema: {
            columns: [
              { name: "record_id", position: 0 },
              { name: "updated_at", position: 1 },
              { name: "title", position: 2 },
            ],
          },
        },
        result: {
          data_array: [
            ["report-9", "2026-08-17T10:00:00.000Z", "Copper report"],
          ],
        },
      }),
    );
    const adapter = new DatabricksSqlAdapter(
      {
        workspaceUrl: "https://adb-123.azuredatabricks.net",
        warehouseId: "warehouse-1",
        catalog: "market",
        schema: "archive",
        table: "reports",
        sourceIdColumn: "record_id",
        modifiedAtColumn: "updated_at",
        commodityColumn: "commodity_id",
        authentication: { method: "managed-identity" },
      },
      tokens,
      fetchImplementation,
    );

    const records = await adapter.queryRecords(
      {
        changedAfter: "2026-08-01T00:00:00.000Z",
        commodityIds: ["copper"],
        maximumRecords: 50,
      },
      context,
    );
    const request = JSON.parse(
      String(fetchImplementation.mock.calls[0]?.[1]?.body),
    ) as { statement: string; parameters: { name: string; value: string }[] };

    expect(request.statement).toContain("`updated_at` > :changed_after");
    expect(request.statement).toContain("LIMIT :record_limit");
    expect(request.parameters).toContainEqual({
      name: "record_limit",
      value: "50",
      type: "INT",
    });
    expect(records[0]?.reference).toMatchObject({
      system: "databricks",
      sourceId: "report-9",
    });
  });

  it("rejects unbounded or mutating approved SQL", () => {
    expect(
      () =>
        new DatabricksSqlAdapter(
          {
            workspaceUrl: "https://adb-123.azuredatabricks.net",
            warehouseId: "warehouse-1",
            catalog: "market",
            schema: "archive",
            approvedQuery: "DELETE FROM reports",
            authentication: { method: "managed-identity" },
          },
          tokens,
        ),
    ).toThrow("read-only SQL");
  });
});

describe("Power BI semantic model adapter", () => {
  it("executes only configured approved queries", async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        results: [
          { tables: [{ rows: [{ commodity: "Copper", exposure: 12 }] }] },
        ],
      }),
    );
    const adapter = new PowerBiSemanticModelAdapter(
      {
        workspaceId: "workspace-1",
        semanticModelId: "model-1",
        approvedQueries: {
          exposure: "EVALUATE TOPN(25, 'Commodity Exposure')",
        },
        authentication: { method: "entra-application" },
      },
      tokens,
      fetchImplementation,
    );

    await expect(adapter.executeApprovedQuery("unknown")).rejects.toThrow(
      "not approved",
    );
    const records = await adapter.executeApprovedQuery("exposure");
    expect(records[0]?.values).toEqual({ commodity: "Copper", exposure: 12 });
    expect(String(fetchImplementation.mock.calls[0]?.[0])).toContain(
      "api.powerbi.com/v1.0/myorg",
    );
  });
});

describe("enterprise knowledge traceability", () => {
  it("retains a Databricks record ID, URI, and version during ingestion", async () => {
    const upload = vi.fn().mockResolvedValue({ documentId: "knowledge-1" });
    const ingestion = new EnterpriseKnowledgeIngestionService({
      upload,
    } as unknown as KnowledgeService);

    await ingestion.ingestDatabricksRecord(
      {
        reference: {
          system: "databricks",
          sourceId: "report-9",
          sourceUri: "https://adb-123.azuredatabricks.net/sql/editor",
          sourceVersion: "v7",
          modifiedAt: "2026-08-17T10:00:00.000Z",
        },
        values: { title: "Copper report" },
      },
      "Copper supply remained constrained across the latest reporting period.",
      {
        title: "Copper report",
        author: "Market Intelligence",
        date: "2026-08-17T10:00:00.000Z",
        businessUnit: "Procurement",
        commodity: "Copper",
        region: "Global",
        documentType: "Databricks report",
        version: "7",
        classification: "internal",
        authorityRank: 80,
        status: "current",
      },
    );

    expect(upload).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          sourceSystem: "databricks",
          externalSourceId: "report-9",
          externalSourceUri: "https://adb-123.azuredatabricks.net/sql/editor",
          sourceVersion: "v7",
        }),
      }),
    );
  });
});
