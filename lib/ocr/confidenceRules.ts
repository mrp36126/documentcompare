import type { ExtractedCell, FieldKey } from "@/lib/types";
import { normalizeDate } from "@/lib/date/normalizeDate";

const DATE_FIELDS: FieldKey[] = ["date", "expiryDate"];
const NUMERIC_FIELDS: FieldKey[] = [
  "quantityReceived",
  "quantityIssued",
  "lossesAndAdjustments",
  "balance"
];
const REQUIRED_FIELDS: FieldKey[] = ["date", "issuedToOrReceivedFrom", "balance"];

export const CONFIDENCE_ACCEPTED = 0.85;
export const CONFIDENCE_REVIEW = 0.65;

export function confidenceBand(confidence: number) {
  if (confidence >= CONFIDENCE_ACCEPTED) return "accepted";
  if (confidence >= CONFIDENCE_REVIEW) return "needs_review";
  return "uncertain";
}

export function validateCell(field: FieldKey, cell: ExtractedCell): ExtractedCell {
  const reasons = new Set<string>();
  const value = cell.value.trim();
  const isBlank = !value;
  const isRequired = REQUIRED_FIELDS.includes(field);

  if (cell.reason) reasons.add(cell.reason);
  if (!isBlank && cell.confidence < CONFIDENCE_ACCEPTED) {
    reasons.add(cell.confidence < CONFIDENCE_REVIEW ? "OCR confidence is below 65%." : "OCR confidence needs review.");
  }

  if (isRequired && isBlank) {
    reasons.add("Required field is missing.");
  }

  if (DATE_FIELDS.includes(field) && value) {
    const parsed = normalizeDate(value);
    if (!parsed.isValid) reasons.add("Date does not match a valid supported format.");
  }

  if (NUMERIC_FIELDS.includes(field)) {
    if (isRequired && isBlank) {
      reasons.add("Numeric field is blank.");
    } else if (value && !/^-?\d+(\.\d+)?$/.test(value.replace(/,/g, ""))) {
      reasons.add("Numeric field contains invalid characters.");
    }
  }

  const reason = Array.from(reasons).join(" ");
  return {
    ...cell,
    value,
    isUncertain: cell.isUncertain || reasons.size > 0,
    reason: reason || undefined
  };
}
