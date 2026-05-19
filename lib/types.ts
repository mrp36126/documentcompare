export const FORM_HEADERS = [
  "Date",
  "Ref. no",
  "Batch no",
  "Expiry date",
  "Issued to or received from",
  "Quantity received",
  "Quantity issued",
  "Losses and adjustments",
  "Balance",
  "Remarks",
  "Name and signature"
] as const;

export const FIELD_KEYS = [
  "date",
  "refNo",
  "batchNo",
  "expiryDate",
  "issuedToOrReceivedFrom",
  "quantityReceived",
  "quantityIssued",
  "lossesAndAdjustments",
  "balance",
  "remarks",
  "nameAndSignature"
] as const;

export type FormHeader = (typeof FORM_HEADERS)[number];
export type FieldKey = (typeof FIELD_KEYS)[number];

export const HEADER_TO_FIELD: Record<FormHeader, FieldKey> = {
  Date: "date",
  "Ref. no": "refNo",
  "Batch no": "batchNo",
  "Expiry date": "expiryDate",
  "Issued to or received from": "issuedToOrReceivedFrom",
  "Quantity received": "quantityReceived",
  "Quantity issued": "quantityIssued",
  "Losses and adjustments": "lossesAndAdjustments",
  Balance: "balance",
  Remarks: "remarks",
  "Name and signature": "nameAndSignature"
};

export const FIELD_TO_HEADER: Record<FieldKey, FormHeader> = Object.fromEntries(
  Object.entries(HEADER_TO_FIELD).map(([header, field]) => [field, header])
) as Record<FieldKey, FormHeader>;

export const DB_FIELD_TO_FIELD: Record<string, FieldKey> = {
  date: "date",
  ref_no: "refNo",
  batch_no: "batchNo",
  expiry_date: "expiryDate",
  issued_to_or_received_from: "issuedToOrReceivedFrom",
  quantity_received: "quantityReceived",
  quantity_issued: "quantityIssued",
  losses_and_adjustments: "lossesAndAdjustments",
  balance: "balance",
  remarks: "remarks",
  name_and_signature: "nameAndSignature"
};

export const FIELD_TO_DB_FIELD: Record<FieldKey, string> = Object.fromEntries(
  Object.entries(DB_FIELD_TO_FIELD).map(([dbField, field]) => [field, dbField])
) as Record<FieldKey, string>;

export type ExtractedCell = {
  value: string;
  confidence: number;
  isUncertain: boolean;
  reason?: string;
  reviewed?: boolean;
};

export type ExtractedRow = {
  id?: string;
  rowIndex: number;
} & Record<FieldKey, ExtractedCell>;

export type CorrectedRow = {
  id?: string;
  rowIndex: number;
} & Record<FieldKey, string>;

export type DocumentStatus =
  | "uploaded"
  | "extracting"
  | "needs_review"
  | "reviewed"
  | "compared"
  | "completed"
  | "failed";

export type DocumentRecord = {
  id: string;
  country_name: string;
  description: string | null;
  original_file_path: string;
  extracted_csv_path: string | null;
  updated_csv_path: string | null;
  exception_csv_path: string | null;
  status: DocumentStatus;
  created_at: string;
  updated_at: string;
};

export type MasterCsvRow = Record<string, string>;

export type ComparedRecord = {
  extracted: CorrectedRow;
  master?: MasterCsvRow;
  matchKey: string;
  reason?: string;
};

export type CompareResult = {
  matched: ComparedRecord[];
  unmatched: ComparedRecord[];
  updatedRows: MasterCsvRow[];
  exceptionRows: Array<CorrectedRow & { exceptionReason: string }>;
};
