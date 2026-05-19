import { FIELD_KEYS, type ExtractedRow } from "@/lib/types";

export function normalizeExtractedRows(rows: ExtractedRow[]) {
  return rows.map((row, index) => {
    const normalized = { ...row, rowIndex: row.rowIndex ?? index + 1 };
    for (const key of FIELD_KEYS) {
      normalized[key] = {
        value: row[key]?.value?.trim() ?? "",
        confidence: Number(row[key]?.confidence ?? 0),
        isUncertain: Boolean(row[key]?.isUncertain),
        reason: row[key]?.reason,
        reviewed: Boolean(row[key]?.reviewed)
      };
    }
    return normalized;
  });
}
