import type { ExtractedRow } from "@/lib/types";

export type DocumentExtractionInput = {
  documentId: string;
  filePath: string;
  file?: {
    bytes: Buffer;
    mimeType: string;
    filename: string;
  };
};

export type DocumentExtractionProvider = {
  name: string;
  kind: "icr" | "ocr" | "vision-ai" | "hybrid";
  extract: (input: DocumentExtractionInput) => Promise<ExtractedRow[]>;
};

export function hasConfiguredIcrProvider() {
  return Boolean(process.env.ICR_PROVIDER_API_KEY);
}

export function hasConfiguredOcrFallbackProvider() {
  return Boolean(process.env.OCR_PROVIDER_API_KEY);
}

export function getExtractionProviderLabel() {
  if (process.env.OCR_PROVIDER_API_KEY) return "configured OCR provider";
  return "mock OCR provider";
}
