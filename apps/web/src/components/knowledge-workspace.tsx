"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BookOpenText,
  CheckCircle2,
  ChevronRight,
  FileSearch,
  FileText,
  Filter,
  Library,
  LoaderCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

interface DocumentMetadata {
  title: string;
  author: string;
  date: string;
  businessUnit: string;
  commodity: string;
  region: string;
  documentType: string;
  sourceSystem: string;
  version: string;
  classification: string;
  authorityRank: number;
  status: string;
}

interface KnowledgeDocument {
  documentId: string;
  fileName: string;
  metadata: DocumentMetadata;
  summary: string;
  indexedAt: string;
}

interface SearchResult {
  chunk: {
    chunkId: string;
    content: string;
    heading: string | null;
    citationLabel: string;
  };
  document: KnowledgeDocument;
  score: number;
}

interface GroundedAnswer {
  answer: string;
  citations: {
    citationId: string;
    documentId: string;
    chunkId: string;
    title: string;
    author: string;
    date: string;
    citationLabel: string;
    excerpt: string;
  }[];
  relatedReports: KnowledgeDocument[];
  mode: "azure-openai" | "extractive";
  limitations: string[];
}

const initialMetadata: DocumentMetadata = {
  title: "",
  author: "",
  date: new Date().toISOString().slice(0, 10),
  businessUnit: "Procurement",
  commodity: "Copper",
  region: "Global",
  documentType: "Research report",
  sourceSystem: "upload",
  version: "1.0",
  classification: "internal",
  authorityRank: 70,
  status: "current",
};

export function KnowledgeWorkspace() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [answer, setAnswer] = useState<GroundedAnswer | null>(null);
  const [query, setQuery] = useState("");
  const [commodity, setCommodity] = useState("");
  const [region, setRegion] = useState("");
  const [metadata, setMetadata] = useState(initialMetadata);
  const [file, setFile] = useState<File | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [busy, setBusy] = useState<"search" | "upload" | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void loadDocuments();
  }, []);

  async function loadDocuments() {
    const response = await fetch("/api/knowledge/documents");
    if (response.ok) {
      const payload = (await response.json()) as {
        documents: KnowledgeDocument[];
      };
      setDocuments(payload.documents);
    }
  }

  async function runSearch(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setBusy("search");
    setMessage("");
    setAnswer(null);
    const filters = {
      commodity: commodity || undefined,
      region: region || undefined,
    };
    try {
      const [searchResponse, answerResponse] = await Promise.all([
        fetch("/api/knowledge/search", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query, ...filters }),
        }),
        fetch("/api/knowledge/answer", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ question: query, ...filters }),
        }),
      ]);
      const searchPayload = (await searchResponse.json()) as {
        results?: SearchResult[];
        error?: string;
      };
      const answerPayload = (await answerResponse.json()) as GroundedAnswer & {
        error?: string;
      };
      if (!searchResponse.ok || !answerResponse.ok) {
        throw new Error(
          searchPayload.error ?? answerPayload.error ?? "Search failed.",
        );
      }
      setResults(searchPayload.results ?? []);
      setAnswer(answerPayload);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Search failed.");
    } finally {
      setBusy(null);
    }
  }

  async function uploadDocument(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setMessage("Choose a document to upload.");
      return;
    }
    setBusy("upload");
    setMessage("");
    const form = new FormData();
    form.set("file", file);
    form.set(
      "metadata",
      JSON.stringify({
        ...metadata,
        date: new Date(`${metadata.date}T00:00:00Z`).toISOString(),
      }),
    );
    try {
      const response = await fetch("/api/knowledge/upload", {
        method: "POST",
        body: form,
      });
      const payload = (await response.json()) as {
        document?: KnowledgeDocument;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "Upload failed.");
      setMessage(
        `${payload.document?.metadata.title ?? file.name} is indexed.`,
      );
      setFile(null);
      setMetadata(initialMetadata);
      setShowUpload(false);
      await loadDocuments();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(null);
    }
  }

  const commodities = unique(documents.map((item) => item.metadata.commodity));
  const regions = unique(documents.map((item) => item.metadata.region));

  return (
    <main className="min-h-screen bg-[var(--canvas)]">
      <header className="border-b border-[var(--line)] bg-[rgba(252,253,250,0.9)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="dora-floating-control grid size-9 place-items-center"
              aria-label="Back to command centre"
            >
              <ArrowLeft size={17} />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--teal)]">
                <Library size={14} /> DORA knowledge
              </div>
              <h1 className="font-serif text-2xl text-[var(--navy)] sm:text-3xl">
                Research intelligence
              </h1>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowUpload(true)}
            aria-label="Add source"
            className="flex h-10 items-center gap-2 rounded-lg bg-[var(--navy)] px-4 text-sm font-semibold text-white shadow-[var(--shadow-control)]"
          >
            <Upload size={16} />
            <span className="hidden sm:inline">Add source</span>
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-6 px-5 py-7 lg:grid-cols-[230px_minmax(0,1fr)_290px] lg:px-8">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-[var(--navy)]">
            <Filter size={15} /> Scope
          </div>
          <FilterSelect
            label="Commodity"
            allLabel="All commodities"
            value={commodity}
            onChange={setCommodity}
            options={commodities}
          />
          <FilterSelect
            label="Region"
            allLabel="All regions"
            value={region}
            onChange={setRegion}
            options={regions}
          />
          <div className="mt-7 border-t border-[var(--line)] pt-5">
            <p className="text-xs font-semibold uppercase text-[var(--ink-faint)]">
              Retrieval policy
            </p>
            <div className="mt-3 flex gap-2 text-xs leading-5 text-[var(--ink-muted)]">
              <ShieldCheck
                className="mt-0.5 shrink-0 text-[var(--teal)]"
                size={16}
              />
              Current, authoritative research is boosted above superseded
              material.
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <form onSubmit={runSearch} className="relative">
            <Search
              className="absolute left-4 top-5 text-[var(--ink-faint)]"
              size={20}
            />
            <textarea
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ask across research, reports, and market documents..."
              rows={3}
              className="w-full resize-none rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] py-4 pl-12 pr-4 text-base shadow-[var(--shadow-card)] outline-none focus:border-[var(--teal)] sm:pr-36"
            />
            <button
              type="submit"
              disabled={busy === "search" || !query.trim()}
              className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[var(--teal)] px-4 text-sm font-semibold text-white disabled:opacity-50 sm:absolute sm:bottom-3 sm:right-3 sm:mt-0 sm:w-auto"
            >
              {busy === "search" ? (
                <LoaderCircle className="animate-spin" size={16} />
              ) : (
                <Sparkles size={16} />
              )}
              Synthesize
            </button>
          </form>

          {message && (
            <div className="mt-4 rounded-lg border border-[var(--teal-line)] bg-[var(--teal-soft)] px-4 py-3 text-sm text-[var(--ink)]">
              {message}
            </div>
          )}

          {answer ? (
            <article className="mt-7 border-y border-[var(--line)] py-7">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-[var(--teal)]" />
                  <h2 className="font-serif text-2xl text-[var(--navy)]">
                    Grounded synthesis
                  </h2>
                </div>
                <span className="rounded-full bg-[var(--teal-soft)] px-3 py-1 text-xs font-semibold text-[var(--teal)]">
                  {answer.mode === "azure-openai"
                    ? "AI synthesis"
                    : "Extractive summary"}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-[15px] leading-7 text-[var(--ink)]">
                {answer.answer}
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {answer.citations.map((citation, index) => (
                  <div
                    key={citation.chunkId}
                    className="border-l-2 border-[var(--teal)] pl-4"
                  >
                    <p className="text-xs font-bold text-[var(--teal)]">
                      [{index + 1}] {citation.title}
                    </p>
                    <p className="mt-1 line-clamp-3 text-xs leading-5 text-[var(--ink-muted)]">
                      {citation.excerpt}
                    </p>
                  </div>
                ))}
              </div>
              {answer.limitations.length > 0 && (
                <p className="mt-5 text-xs text-[var(--ink-faint)]">
                  {answer.limitations.join(" ")}
                </p>
              )}
            </article>
          ) : (
            <EmptyResearch documents={documents.length} />
          )}

          {results.length > 0 && (
            <div className="mt-7">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-[var(--navy)]">
                  Supporting evidence
                </h2>
                <span className="text-xs text-[var(--ink-faint)]">
                  {results.length} passages
                </span>
              </div>
              <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
                {results.map((result) => (
                  <article key={result.chunk.chunkId} className="py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-[var(--navy)]">
                          {result.document.metadata.title}
                        </p>
                        <p className="mt-1 text-xs text-[var(--ink-faint)]">
                          {result.document.metadata.author || "Unknown author"}{" "}
                          · {formatDate(result.document.metadata.date)} ·{" "}
                          {result.document.metadata.sourceSystem}
                        </p>
                      </div>
                      <ChevronRight
                        className="shrink-0 text-[var(--ink-faint)]"
                        size={17}
                      />
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--ink-muted)]">
                      {result.chunk.content}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className="border-t border-[var(--line)] pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--navy)]">
              Document library
            </h2>
            <span className="text-xs text-[var(--ink-faint)]">
              {documents.length}
            </span>
          </div>
          {documents.length ? (
            <div className="space-y-1">
              {documents.slice(0, 10).map((document) => (
                <div
                  key={document.documentId}
                  className="group flex gap-3 border-b border-[var(--line-soft)] py-4"
                >
                  <FileText
                    className="mt-0.5 shrink-0 text-[var(--blue)]"
                    size={18}
                  />
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-semibold leading-5 text-[var(--ink)]">
                      {document.metadata.title}
                    </p>
                    <p className="mt-1 truncate text-xs text-[var(--ink-faint)]">
                      {document.metadata.commodity} · {document.metadata.region}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-[10px] font-semibold uppercase text-[var(--teal)]">
                      {document.metadata.status === "current" && (
                        <CheckCircle2 size={12} />
                      )}
                      {document.metadata.status} · v{document.metadata.version}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-[var(--ink-faint)]">
              <BookOpenText className="mx-auto mb-3" size={24} />
              No documents indexed yet.
            </div>
          )}
        </aside>
      </div>

      {showUpload && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-[rgba(13,38,56,0.34)]"
          role="dialog"
          aria-modal="true"
          aria-label="Add knowledge source"
        >
          <button
            className="absolute inset-0 cursor-default"
            onClick={() => setShowUpload(false)}
            aria-label="Close upload panel"
          />
          <form
            onSubmit={uploadDocument}
            className="relative h-full w-full max-w-xl overflow-y-auto bg-[var(--surface)] p-6 shadow-[var(--shadow-drawer)] sm:p-8"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--teal)]">
                  Knowledge ingestion
                </p>
                <h2 className="mt-1 font-serif text-3xl text-[var(--navy)]">
                  Add a source
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowUpload(false)}
                className="dora-floating-control grid size-9 place-items-center"
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>

            <label className="mt-7 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[var(--line-strong)] bg-[var(--surface-subtle)] px-5 text-center">
              <Upload className="mb-2 text-[var(--teal)]" size={22} />
              <span className="text-sm font-semibold text-[var(--navy)]">
                {file?.name ?? "Choose PDF, Word, PowerPoint, text, or CSV"}
              </span>
              <span className="mt-1 text-xs text-[var(--ink-faint)]">
                Maximum 20 MB
              </span>
              <input
                type="file"
                className="sr-only"
                accept=".pdf,.docx,.pptx,.txt,.md,.csv,.json,.html"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <Field
                label="Title"
                value={metadata.title}
                onChange={(value) => setMetadata({ ...metadata, title: value })}
                required
                wide
              />
              <Field
                label="Author"
                value={metadata.author}
                onChange={(value) =>
                  setMetadata({ ...metadata, author: value })
                }
              />
              <Field
                label="Document date"
                type="date"
                value={metadata.date}
                onChange={(value) => setMetadata({ ...metadata, date: value })}
                required
              />
              <Field
                label="Business unit"
                value={metadata.businessUnit}
                onChange={(value) =>
                  setMetadata({ ...metadata, businessUnit: value })
                }
                required
              />
              <Field
                label="Commodity"
                value={metadata.commodity}
                onChange={(value) =>
                  setMetadata({ ...metadata, commodity: value })
                }
                required
              />
              <Field
                label="Region"
                value={metadata.region}
                onChange={(value) =>
                  setMetadata({ ...metadata, region: value })
                }
                required
              />
              <Field
                label="Document type"
                value={metadata.documentType}
                onChange={(value) =>
                  setMetadata({ ...metadata, documentType: value })
                }
                required
              />
              <Field
                label="Version"
                value={metadata.version}
                onChange={(value) =>
                  setMetadata({ ...metadata, version: value })
                }
                required
              />
              <SelectField
                label="Source system"
                value={metadata.sourceSystem}
                onChange={(value) =>
                  setMetadata({ ...metadata, sourceSystem: value })
                }
                options={[
                  "upload",
                  "sharepoint",
                  "databricks",
                  "internal-research",
                  "news-archive",
                ]}
              />
              <SelectField
                label="Classification"
                value={metadata.classification}
                onChange={(value) =>
                  setMetadata({ ...metadata, classification: value })
                }
                options={["public", "internal", "confidential", "restricted"]}
              />
              <SelectField
                label="Lifecycle status"
                value={metadata.status}
                onChange={(value) =>
                  setMetadata({ ...metadata, status: value })
                }
                options={["current", "superseded", "archived"]}
              />
              <label className="text-xs font-semibold text-[var(--ink-muted)]">
                Authority rank · {metadata.authorityRank}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={metadata.authorityRank}
                  onChange={(event) =>
                    setMetadata({
                      ...metadata,
                      authorityRank: Number(event.target.value),
                    })
                  }
                  className="mt-3 w-full accent-[var(--teal)]"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={busy === "upload"}
              className="mt-8 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--navy)] text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy === "upload" ? (
                <LoaderCircle className="animate-spin" size={17} />
              ) : (
                <FileSearch size={17} />
              )}
              Store and index document
            </button>
          </form>
        </div>
      )}
    </main>
  );
}

function EmptyResearch({ documents }: { documents: number }) {
  return (
    <div className="py-20 text-center">
      <FileSearch
        className="mx-auto text-[var(--teal)]"
        size={30}
        strokeWidth={1.5}
      />
      <h2 className="mt-4 font-serif text-2xl text-[var(--navy)]">
        Interrogate the evidence
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--ink-muted)]">
        {documents
          ? "Ask a decision question to synthesize the most current, authoritative material in the library."
          : "Add the first research document, then ask a decision question across its evidence."}
      </p>
    </div>
  );
}

function FilterSelect({
  label,
  allLabel,
  value,
  onChange,
  options,
}: {
  label: string;
  allLabel: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="mb-4 block text-xs font-semibold text-[var(--ink-muted)]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--teal)]"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  wide = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  wide?: boolean;
}) {
  return (
    <label
      className={`text-xs font-semibold text-[var(--ink-muted)] ${wide ? "sm:col-span-2" : ""}`}
    >
      {label}
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-10 w-full rounded-lg border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--teal)]"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="text-xs font-semibold text-[var(--ink-muted)]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-10 w-full rounded-lg border border-[var(--line)] bg-white px-3 text-sm capitalize text-[var(--ink)] outline-none focus:border-[var(--teal)]"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}
