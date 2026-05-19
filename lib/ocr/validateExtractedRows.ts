import { FIELD_KEYS, type ExtractedRow } from "@/lib/types";
import { validateCell } from "@/lib/ocr/confidenceRules";

export function validateExtractedRows(rows: ExtractedRow[]) {
  return rows.map((row) => {
    const validated = { ...row };
    for (const key of FIELD_KEYS) {
      validated[key] = validateCell(key, row[key]);
    }
    return validated;
  });
}
