import Papa from "papaparse";
import { FORM_HEADERS, type MasterCsvRow } from "@/lib/types";
import { normalizeLooseHeader } from "@/lib/text/normalizeText";

const HEADER_ALIASES: Record<string, string[]> = {
  Date: ["date"],
  "Ref. no": ["refno", "referenceno", "referencenumber"],
  "Batch no": ["batchno", "batchnumber"],
  "Expiry date": ["expirydate", "expiry"],
  "Issued to or received from": ["issuedtoorreceivedfrom", "issuedto", "receivedfrom"],
  "Quantity received": ["quantityreceived", "qtyreceived"],
  "Quantity issued": ["quantityissued", "qtyissued"],
  "Losses and adjustments": ["lossesandadjustments", "losses", "adjustments"],
  Balance: ["balance"],
  Remarks: ["remarks"],
  "Name and signature": ["nameandsignature", "name", "signature"]
};

export function mapCsvHeaders(headers: string[]) {
  const normalizedHeaderMap = new Map(headers.map((header) => [normalizeLooseHeader(header), header]));
  const result = new Map<string, string>();

  for (const canonical of FORM_HEADERS) {
    const aliases = [normalizeLooseHeader(canonical), ...HEADER_ALIASES[canonical]];
    const found = aliases.map((alias) => normalizedHeaderMap.get(alias)).find(Boolean);
    if (found) result.set(canonical, found);
  }

  return result;
}

export function parseCsv(content: string) {
  const parsed = Papa.parse<MasterCsvRow>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
    transform: (value) => value.trim()
  });

  if (parsed.errors.length) {
    throw new Error(parsed.errors.map((error) => error.message).join("; "));
  }

  const headers = parsed.meta.fields ?? [];
  if (!headers.length) throw new Error("CSV file does not contain headers.");

  const headerMap = mapCsvHeaders(headers);
  if (!headerMap.get("Issued to or received from")) {
    throw new Error("Master CSV must include an Issued to or received from column or a supported alias.");
  }

  return {
    rows: parsed.data.filter((row) => Object.values(row).some(Boolean)),
    headers,
    headerMap
  };
}
