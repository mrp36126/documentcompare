import type { ExtractedRow } from "@/lib/types";

export type DocumentExtractionInput = {
  documentId: string;
  filePath: string;
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
  if (process.env.ICR_PROVIDER_API_KEY && process.env.OCR_PROVIDER_API_KEY) {
    return "configured ICR provider with OCR fallback";
  }
  if (process.env.ICR_PROVIDER_API_KEY) return "configured ICR provider";
  if (process.env.OCR_PROVIDER_API_KEY) return "mock ICR provider with configured OCR fallback";
  return "mock ICR provider with mock OCR fallback";
}
