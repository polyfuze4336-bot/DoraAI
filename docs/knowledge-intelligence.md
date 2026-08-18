# DORA Knowledge and Document Intelligence

## Workflow

1. `/knowledge` submits a document and complete business metadata to `POST /api/knowledge/upload`.
2. The knowledge service validates metadata, hashes the original bytes, and stores the source under `knowledge/{documentId}/{fileName}`.
3. The parser extracts text from PDF, DOCX, PPTX, TXT, Markdown, CSV, JSON, or HTML.
4. Heading-aware chunking creates bounded passages with overlap, hashes, and citation labels.
5. The configured index receives document chunks. Local development uses an atomic JSON index; Azure uses AI Search.
6. Search combines keyword, optional vector, semantic, authority, freshness, and lifecycle signals.
7. Answers are generated only from retrieved passages. A response without valid citations is rejected.

## Metadata

Every source includes title, author, document date, business unit, commodity, region, document type, source system, version, classification, authority rank, and lifecycle status.

Supported source systems are upload, SharePoint, Databricks, internal research, and news archive. SharePoint and Databricks connectors are future ingestion adapters; they feed the same `KnowledgeService.upload` contract and do not require a second indexing path.

## Ranking Policy

Current documents receive full score. Superseded documents receive a `0.35` multiplier and archived documents receive a `0.2` multiplier after keyword/vector/semantic relevance, authority, and freshness are combined. Azure Search retrieves a wider candidate set and applies the same lifecycle reranking before returning results.

## Azure AI Search

The `dora-knowledge` index includes searchable content and title fields, filterable/facetable business metadata, sortable dates and authority, a configurable vector field, semantic configuration, and an authority/freshness scoring profile. Authentication uses Microsoft Entra ID with Search local auth disabled.

Vector retrieval is activated when the caller supplies an embedding. Until an approved embedding deployment is configured, keyword and semantic retrieval remain functional.

## Local Development

With Azure endpoints unset, originals and the local index are written under `.dora-data`. This allows upload, search, citation, and ranking behavior to run without cloud resources. Set the variables in `.env.example` to switch individual storage and retrieval adapters to Azure.

## Production Gates

Classification is indexed and filterable, but production rollout requires user identity propagation and authorization filters so users cannot retrieve documents above their permitted classification. Malware scanning, DLP, retention policy, private endpoints, and source-system delta synchronization are also production controls rather than prototype upload concerns.
