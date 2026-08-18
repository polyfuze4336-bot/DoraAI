import {
  SpanStatusCode,
  context,
  propagation,
  trace,
  type Attributes,
} from "@opentelemetry/api";

export interface StructuredEvent {
  readonly event: string;
  readonly correlationId: string;
  readonly timestamp: string;
  readonly success?: boolean;
  readonly durationMs?: number;
  readonly attributes?: Readonly<Record<string, unknown>>;
  readonly error?: { readonly type: string; readonly message: string };
}

export function correlationIdFromHeaders(headers: Headers): string {
  const supplied = headers.get("x-correlation-id")?.trim();
  return supplied && /^[a-zA-Z0-9._:-]{8,128}$/.test(supplied)
    ? supplied
    : crypto.randomUUID();
}

export function injectTraceHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  propagation.inject(context.active(), headers);
  return headers;
}

export async function withObservedOperation<T>(
  name: string,
  input: {
    readonly correlationId: string;
    readonly category:
      | "api"
      | "connector"
      | "ingestion"
      | "analysis"
      | "ai"
      | "forecast"
      | "email"
      | "scheduled-job";
    readonly attributes?: Readonly<Record<string, unknown>>;
  },
  operation: () => Promise<T>,
): Promise<T> {
  const startedAt = performance.now();
  const tracer = trace.getTracer("dora");
  return tracer.startActiveSpan(name, async (span) => {
    span.setAttributes(
      toAttributes({
        "dora.correlation_id": input.correlationId,
        "dora.category": input.category,
        ...input.attributes,
      }),
    );
    try {
      const result = await operation();
      const durationMs = Math.round(performance.now() - startedAt);
      span.setAttribute("dora.duration_ms", durationMs);
      span.setStatus({ code: SpanStatusCode.OK });
      logStructured({
        event: name,
        correlationId: input.correlationId,
        timestamp: new Date().toISOString(),
        success: true,
        durationMs,
        attributes: input.attributes,
      });
      return result;
    } catch (error) {
      const durationMs = Math.round(performance.now() - startedAt);
      const normalized = normalizeError(error);
      span.recordException(normalized);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: normalized.message,
      });
      logStructured({
        event: name,
        correlationId: input.correlationId,
        timestamp: new Date().toISOString(),
        success: false,
        durationMs,
        attributes: input.attributes,
        error: { type: normalized.name, message: normalized.message },
      });
      throw error;
    } finally {
      span.end();
    }
  });
}

export function logStructured(event: StructuredEvent): void {
  process.stdout.write(`${JSON.stringify(redact(event))}\n`);
}

export function redact<T>(value: T): T {
  return redactValue(value, new WeakSet<object>()) as T;
}

function redactValue(value: unknown, seen: WeakSet<object>): unknown {
  if (Array.isArray(value)) return value.map((item) => redactValue(item, seen));
  if (!value || typeof value !== "object") return value;
  if (seen.has(value)) return "[Circular]";
  seen.add(value);
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      isSensitiveKey(key) ? "[REDACTED]" : redactValue(item, seen),
    ]),
  );
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.replaceAll(/[-_]/g, "").toLowerCase();
  if (
    [
      "prompttokens",
      "completiontokens",
      "totaltokens",
      "tokencount",
      "tokenusage",
    ].includes(normalized)
  ) {
    return false;
  }
  return (
    normalized === "token" ||
    /authorization|apikey|accesstoken|refreshtoken|idtoken|secret|password|credential|connectionstring|reporthtml|reportcontent/.test(
      normalized,
    )
  );
}

function toAttributes(input: Readonly<Record<string, unknown>>): Attributes {
  return Object.fromEntries(
    Object.entries(redact(input)).flatMap(([key, value]) =>
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
        ? [[key, value]]
        : [],
    ),
  );
}

function normalizeError(error: unknown): Error {
  return error instanceof Error
    ? error
    : new Error("Unknown operation failure.");
}
