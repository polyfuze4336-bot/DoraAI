import { createHash } from "node:crypto";

import { DOMParser } from "@xmldom/xmldom";
import { strFromU8, unzipSync } from "fflate";

export interface ParsedDocument {
  readonly text: string;
  readonly contentHash: string;
}

const textExtensions = new Set(["txt", "md", "csv", "json", "html", "htm"]);

export async function parseDocument(
  fileName: string,
  contentType: string,
  data: Uint8Array,
): Promise<ParsedDocument> {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  let text: string;

  if (textExtensions.has(extension) || contentType.startsWith("text/")) {
    text = new TextDecoder().decode(data);
  } else if (extension === "docx") {
    text = parseOpenXml(data, /^word\/document\.xml$/, "w:t");
  } else if (extension === "pptx") {
    text = parseOpenXml(data, /^ppt\/slides\/slide\d+\.xml$/, "a:t");
  } else if (extension === "pdf" || contentType === "application/pdf") {
    text = await parsePdf(data);
  } else {
    throw new Error(
      `Unsupported document format '${extension || contentType}'. Supported: PDF, DOCX, PPTX, TXT, MD, CSV, JSON, HTML.`,
    );
  }

  const normalized = normalizeText(text);
  if (normalized.length < 20) {
    throw new Error("The document contains insufficient extractable text.");
  }
  return {
    text: normalized,
    contentHash: createHash("sha256").update(data).digest("hex"),
  };
}

async function parsePdf(data: Uint8Array): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: data.slice(),
    useSystemFonts: false,
  });
  const document = await loadingTask.promise;
  const pages: string[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(
        content.items
          .flatMap((item) =>
            "str" in item && typeof item.str === "string" ? [item.str] : [],
          )
          .join(" "),
      );
      page.cleanup();
    }
  } finally {
    await loadingTask.destroy();
  }
  return pages.join("\n\n");
}

function parseOpenXml(
  data: Uint8Array,
  filePattern: RegExp,
  textTag: string,
): string {
  const archive = unzipSync(data);
  return Object.entries(archive)
    .filter(([path]) => filePattern.test(path))
    .sort(([left], [right]) =>
      left.localeCompare(right, undefined, { numeric: true }),
    )
    .map(([, bytes]) => extractXmlText(strFromU8(bytes), textTag))
    .join("\n\n");
}

function extractXmlText(xml: string, textTag: string): string {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  const nodes = document.getElementsByTagName(textTag);
  const fragments: string[] = [];
  for (let index = 0; index < nodes.length; index += 1) {
    const value = nodes.item(index)?.textContent?.trim();
    if (value) fragments.push(value);
  }
  return fragments.join(" ");
}

function normalizeText(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
