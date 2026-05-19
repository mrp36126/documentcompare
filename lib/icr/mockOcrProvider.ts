import type { DocumentExtractionProvider } from "@/lib/icr/provider";
import type { ExtractedCell } from "@/lib/types";

function cell(value: string, confidence: number, reason?: string): ExtractedCell {
  return {
    value,
    confidence,
    isUncertain: confidence < 0.85 || Boolean(reason),
    reason
  };
}

export const mockOcrFallbackProvider: DocumentExtractionProvider = {
  name: "Mock OCR Fallback Provider",
  kind: "ocr",
  async extract(input) {
    const seed = input.documentId.slice(0, 8).toUpperCase();
    return [
      {
        rowIndex: 1,
        date: cell("2026-05-12", 0.9),
        refNo: cell(`REF-${seed.slice(0, 4)}`, 0.88),
        batchNo: cell("B-1042", 0.86),
        expiryDate: cell("2028-05-12", 0.88),
        issuedToOrReceivedFrom: cell("Central Medical Store", 0.86),
        quantityReceived: cell("120", 0.91),
        quantityIssued: cell("0", 0.9),
        lossesAndAdjustments: cell("0", 0.9),
        balance: cell("120", 0.9),
        remarks: cell("Initial receipt", 0.78, "Printed context is readable; handwritten note needs review."),
        nameAndSignature: cell("A. Mokoena", 0.66, "Signature remains difficult for OCR.")
      },
      {
        rowIndex: 2,
        date: cell("15/05/2026", 0.86),
        refNo: cell("REF-7281", 0.84, "Fallback OCR agrees but confidence is still below acceptance."),
        batchNo: cell("B-1042", 0.88),
        expiryDate: cell("2028-05-12", 0.88),
        issuedToOrReceivedFrom: cell("North District Clinic", 0.86),
        quantityReceived: cell("0", 0.89),
        quantityIssued: cell("40", 0.9),
        lossesAndAdjustments: cell("0", 0.87),
        balance: cell("80", 0.88),
        remarks: cell("Issued for outreach", 0.72, "OCR found the same phrase with low confidence."),
        nameAndSignature: cell("N. Dlamini", 0.73)
      },
      {
        rowIndex: 3,
        date: cell("18-05-2026", 0.8, "Date separator is visible but order needs confirmation."),
        refNo: cell("REF-7395", 0.84),
        batchNo: cell("B-1042", 0.89),
        expiryDate: cell("2028-05-12", 0.88),
        issuedToOrReceivedFrom: cell("West Rural Depot", 0.85),
        quantityReceived: cell("0", 0.82, "OCR inferred zero from surrounding marks."),
        quantityIssued: cell("15", 0.86),
        lossesAndAdjustments: cell("0", 0.86),
        balance: cell("65", 0.87),
        remarks: cell("Emergency transfer", 0.7),
        nameAndSignature: cell("P. Naidoo", 0.82)
      }
    ];
  }
};
