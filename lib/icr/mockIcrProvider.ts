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

export const mockIcrProvider: DocumentExtractionProvider = {
  name: "Mock ICR Provider",
  kind: "icr",
  async extract(input) {
    const seed = input.documentId.slice(0, 8).toUpperCase();
    return [
      {
        rowIndex: 1,
        date: cell("2026-05-12", 0.93),
        refNo: cell(`REF-${seed.slice(0, 4)}`, 0.9),
        batchNo: cell("B-1042", 0.88),
        expiryDate: cell("12/05/2028", 0.82, "Date is readable but format should be confirmed."),
        issuedToOrReceivedFrom: cell("Central Medical Store", 0.91),
        quantityReceived: cell("120", 0.94),
        quantityIssued: cell("0", 0.92),
        lossesAndAdjustments: cell("0", 0.88),
        balance: cell("120", 0.94),
        remarks: cell("Initial receipt", 0.86),
        nameAndSignature: cell("A. Mokoena", 0.72, "Signature handwriting is partly unclear.")
      },
      {
        rowIndex: 2,
        date: cell("15/05/2026", 0.89),
        refNo: cell("REF-7281", 0.81, "One digit may be ambiguous."),
        batchNo: cell("B-1042", 0.91),
        expiryDate: cell("2028-05-12", 0.9),
        issuedToOrReceivedFrom: cell("North District Clinic", 0.84, "Clinic name has possible alternate reading."),
        quantityReceived: cell("0", 0.9),
        quantityIssued: cell("40", 0.93),
        lossesAndAdjustments: cell("O", 0.48, "ICR read a letter where a number is expected."),
        balance: cell("80", 0.88),
        remarks: cell("Issued for outreach", 0.78),
        nameAndSignature: cell("N. Dlamini", 0.8)
      },
      {
        rowIndex: 3,
        date: cell("18-05-2026", 0.83),
        refNo: cell("REF-7395", 0.87),
        batchNo: cell("B-1042", 0.92),
        expiryDate: cell("2028-05-12", 0.9),
        issuedToOrReceivedFrom: cell("West Rural Depot", 0.9),
        quantityReceived: cell("", 0.44, "Blank or unreadable handwritten quantity."),
        quantityIssued: cell("15", 0.87),
        lossesAndAdjustments: cell("0", 0.86),
        balance: cell("65", 0.88),
        remarks: cell("Emergency transfer", 0.74, "Handwriting is light."),
        nameAndSignature: cell("P. Naidoo", 0.86)
      }
    ];
  }
};
