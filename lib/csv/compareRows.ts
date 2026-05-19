import {
  FIELD_KEYS,
  FIELD_TO_HEADER,
  type CompareResult,
  type CorrectedRow,
  type MasterCsvRow
} from "@/lib/types";
import { normalizeText } from "@/lib/text/normalizeText";

export type CompareOptions = {
  matchFields?: Array<"issuedToOrReceivedFrom" | "refNo" | "batchNo" | "date">;
  sourceDocumentId?: string;
};

const DEFAULT_MATCH_FIELDS: NonNullable<CompareOptions["matchFields"]> = ["issuedToOrReceivedFrom"];

function getMasterValue(row: MasterCsvRow, header: string) {
  const exact = row[header];
  if (exact !== undefined) return exact;
  const foundKey = Object.keys(row).find((key) => normalizeText(key) === normalizeText(header));
  return foundKey ? row[foundKey] : "";
}

function buildKeyFromExtracted(row: CorrectedRow, fields: NonNullable<CompareOptions["matchFields"]>) {
  return fields.map((field) => normalizeText(row[field])).join("|");
}

function buildKeyFromMaster(row: MasterCsvRow, fields: NonNullable<CompareOptions["matchFields"]>) {
  return fields.map((field) => normalizeText(getMasterValue(row, FIELD_TO_HEADER[field]))).join("|");
}

export function compareRows(
  extractedRows: CorrectedRow[],
  masterRows: MasterCsvRow[],
  options: CompareOptions = {}
): CompareResult {
  const matchFields = options.matchFields?.length ? options.matchFields : DEFAULT_MATCH_FIELDS;
  const masterByKey = new Map<string, MasterCsvRow>();
  const duplicateKeys = new Set<string>();

  for (const row of masterRows) {
    const key = buildKeyFromMaster(row, matchFields);
    if (!key) continue;
    if (masterByKey.has(key)) duplicateKeys.add(key);
    else masterByKey.set(key, row);
  }

  const matched: CompareResult["matched"] = [];
  const unmatched: CompareResult["unmatched"] = [];
  const updatedRows = masterRows.map((row) => ({ ...row }));
  const exceptionRows: CompareResult["exceptionRows"] = [];

  for (const extracted of extractedRows) {
    const key = buildKeyFromExtracted(extracted, matchFields);
    const master = masterByKey.get(key);

    if (!key || !master || duplicateKeys.has(key)) {
      const reason = duplicateKeys.has(key)
        ? "Duplicate match key found in existing CSV"
        : "Name or entry not found on existing CSV";
      unmatched.push({ extracted, matchKey: key, reason });
      exceptionRows.push({ ...extracted, exceptionReason: reason });
      continue;
    }

    const index = masterRows.indexOf(master);
    const updated = { ...updatedRows[index] };
    for (const field of FIELD_KEYS) updated[FIELD_TO_HEADER[field]] = extracted[field] ?? "";
    updated.lastUpdated = new Date().toISOString();
    updated.sourceDocumentId = options.sourceDocumentId ?? "";
    updated.updateStatus = "updated";
    updatedRows[index] = updated;
    matched.push({ extracted, master, matchKey: key });
  }

  return { matched, unmatched, updatedRows, exceptionRows };
}
