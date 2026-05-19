import { mockIcrProvider } from "@/lib/icr/mockIcrProvider";
import { mockOcrFallbackProvider } from "@/lib/icr/mockOcrProvider";
import { createOpenAiDocumentProvider } from "@/lib/icr/openAiDocumentProvider";
import type { DocumentExtractionInput, DocumentExtractionProvider } from "@/lib/icr/provider";
import { CONFIDENCE_ACCEPTED } from "@/lib/ocr/confidenceRules";
import { normalizeExtractedRows } from "@/lib/ocr/normalizeExtractedRows";
import { validateExtractedRows } from "@/lib/ocr/validateExtractedRows";
import { FIELD_KEYS, type ExtractedCell, type ExtractedRow } from "@/lib/types";

function getConfiguredIcrProvider(): DocumentExtractionProvider {
  if (process.env.ICR_PROVIDER_API_KEY || process.env.OCR_PROVIDER_API_KEY) {
    return createOpenAiDocumentProvider("icr");
  }

  if (process.env.ALLOW_MOCK_EXTRACTION === "true") {
    return mockIcrProvider;
  }

  throw new Error("No real ICR provider is configured. Add ICR_PROVIDER_API_KEY, or set ALLOW_MOCK_EXTRACTION=true only for testing.");
}

function getConfiguredOcrFallbackProvider(): DocumentExtractionProvider {
  if (process.env.OCR_PROVIDER_API_KEY || process.env.ICR_PROVIDER_API_KEY) {
    return createOpenAiDocumentProvider("ocr");
  }

  if (process.env.ALLOW_MOCK_EXTRACTION === "true") {
    return mockOcrFallbackProvider;
  }

  // If ICR is real but OCR fallback is not configured, reuse the ICR provider
  // rather than silently falling back to dummy data.
  return mockIcrProvider;
}

function shouldTryOcrFallback(cell: ExtractedCell) {
  return cell.isUncertain || cell.confidence < CONFIDENCE_ACCEPTED || !cell.value.trim();
}

function shouldUseOcrFallback(icrCell: ExtractedCell, ocrCell: ExtractedCell) {
  if (!shouldTryOcrFallback(icrCell)) return false;
  if (!ocrCell.value.trim()) return false;
  if (!icrCell.value.trim()) return true;
  return ocrCell.confidence > icrCell.confidence;
}

function mergeIcrWithOcrFallback(icrRows: ExtractedRow[], ocrRows: ExtractedRow[]) {
  const ocrByIndex = new Map(ocrRows.map((row) => [row.rowIndex, row]));
  let fallbackCellsUsed = 0;

  const rows = icrRows.map((icrRow) => {
    const ocrRow = ocrByIndex.get(icrRow.rowIndex);
    if (!ocrRow) return icrRow;

    const merged = { ...icrRow };
    for (const key of FIELD_KEYS) {
      const icrCell = icrRow[key];
      const ocrCell = ocrRow[key];
      if (!shouldUseOcrFallback(icrCell, ocrCell)) continue;

      fallbackCellsUsed += 1;
      merged[key] = {
        ...ocrCell,
        isUncertain: ocrCell.confidence < CONFIDENCE_ACCEPTED,
        reason: [
          "ICR could not confidently identify this value, so OCR fallback was used.",
          ocrCell.reason
        ].filter(Boolean).join(" ")
      };
    }

    return merged;
  });

  return { rows, fallbackCellsUsed };
}

export async function extractDocument(input: DocumentExtractionInput) {
  const icrProvider = getConfiguredIcrProvider();
  const ocrFallbackProvider = getConfiguredOcrFallbackProvider();
  const icrRows = validateExtractedRows(normalizeExtractedRows(await icrProvider.extract(input)));
  const needsFallback = icrRows.some((row) => FIELD_KEYS.some((key) => shouldTryOcrFallback(row[key])));
  const ocrRows = needsFallback
    ? validateExtractedRows(normalizeExtractedRows(await ocrFallbackProvider.extract(input)))
    : [];
  const merged = needsFallback ? mergeIcrWithOcrFallback(icrRows, ocrRows) : { rows: icrRows, fallbackCellsUsed: 0 };

  return {
    provider: {
      name: needsFallback ? `${icrProvider.name} + ${ocrFallbackProvider.name}` : icrProvider.name,
      kind: needsFallback ? "hybrid" : icrProvider.kind,
      strategy: "ICR first; OCR fallback for unreadable or low-confidence cells",
      icrProvider: icrProvider.name,
      ocrFallbackProvider: needsFallback ? ocrFallbackProvider.name : null,
      fallbackAttempted: needsFallback,
      fallbackCellsUsed: merged.fallbackCellsUsed
    },
    rows: validateExtractedRows(merged.rows)
  };
}
