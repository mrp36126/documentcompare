import { mockOcrFallbackProvider as mockOcrProvider } from "@/lib/icr/mockOcrProvider";
import { createOpenAiDocumentProvider } from "@/lib/icr/openAiDocumentProvider";
import type { DocumentExtractionInput, DocumentExtractionProvider } from "@/lib/icr/provider";
import { normalizeExtractedRows } from "@/lib/ocr/normalizeExtractedRows";
import { validateExtractedRows } from "@/lib/ocr/validateExtractedRows";
import { FIELD_KEYS } from "@/lib/types";

function getConfiguredOcrProvider(): DocumentExtractionProvider {
  if (process.env.OCR_PROVIDER_API_KEY) {
    return createOpenAiDocumentProvider("ocr");
  }

  if (process.env.ALLOW_MOCK_EXTRACTION === "true") {
    return mockOcrProvider;
  }

  throw new Error("No real OCR provider is configured. Add OCR_PROVIDER_API_KEY, or set ALLOW_MOCK_EXTRACTION=true only for local testing.");
}

export async function extractDocument(input: DocumentExtractionInput) {
  const provider = getConfiguredOcrProvider();
  const rows = validateExtractedRows(normalizeExtractedRows(await provider.extract(input)));

  return {
    provider: {
      name: provider.name,
      kind: provider.kind,
      strategy: "OCR only; extract structured rows from the uploaded file",
      ocrProvider: provider.name,
      fieldsValidated: FIELD_KEYS.length
    },
    rows
  };
}
