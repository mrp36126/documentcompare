import Papa from "papaparse";
import { FIELD_KEYS, FIELD_TO_HEADER, type CorrectedRow } from "@/lib/types";

export function correctedRowsToCsv(rows: CorrectedRow[]) {
  const data = rows.map((row) => {
    const item: Record<string, string> = {};
    for (const key of FIELD_KEYS) item[FIELD_TO_HEADER[key]] = row[key] ?? "";
    return item;
  });

  return Papa.unparse(data, {
    columns: FIELD_KEYS.map((key) => FIELD_TO_HEADER[key])
  });
}

export function rowsToCsv(rows: Record<string, string>[], columns?: string[]) {
  return Papa.unparse(rows, { columns });
}
