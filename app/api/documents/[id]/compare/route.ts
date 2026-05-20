import { NextResponse } from "next/server";
import { compareRows } from "@/lib/csv/compareRows";
import { rowsToCsv } from "@/lib/csv/exportCsv";
import { parseCsv } from "@/lib/csv/parseCsv";
import { createServiceClient, createAuditLog } from "@/lib/supabase/server";
import { ensureStorageBucket } from "@/lib/supabase/storage";
import { FIELD_KEYS, FIELD_TO_DB_FIELD, type CorrectedRow } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

const EXCEPTION_COLUMNS = [
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
  "Name and signature",
  "Exception reason"
];

function rowsFromDb(rows: Record<string, unknown>[]): CorrectedRow[] {
  return rows.map((row) => {
    const corrected = { id: String(row.id), rowIndex: Number(row.row_index) } as CorrectedRow;
    for (const key of FIELD_KEYS) corrected[key] = String(row[FIELD_TO_DB_FIELD[key]] ?? "");
    return corrected;
  });
}

export async function POST(request: Request, context: Params) {
  try {
    const { id } = await context.params;
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Please upload a master CSV file." }, { status: 400 });
    }

    const csvText = await file.text();
    const parsed = parseCsv(csvText);
    const supabase = createServiceClient();
    await ensureStorageBucket(supabase, "master-csv");
    await ensureStorageBucket(supabase, "generated-csv");

    const masterPath = `${id}/master.csv`;

    const masterUpload = await supabase.storage
      .from("master-csv")
      .upload(masterPath, Buffer.from(csvText, "utf8"), {
        contentType: "text/csv;charset=utf-8",
        upsert: true
      });
    if (masterUpload.error) throw masterUpload.error;

    const { data: dbRows, error: rowError } = await supabase
      .from("extracted_rows")
      .select("*")
      .eq("document_id", id)
      .order("row_index", { ascending: true });
    if (rowError) throw rowError;

    const extractedRows = rowsFromDb(dbRows ?? []);
    if (!extractedRows.length) return NextResponse.json({ error: "No corrected extracted rows are available." }, { status: 400 });

    const result = compareRows(extractedRows, parsed.rows, { sourceDocumentId: id, headerMap: parsed.headerMap });
    const allUpdatedColumns = Array.from(new Set([...parsed.headers, "lastUpdated", "sourceDocumentId", "updateStatus"]));
    const updatedCsv = rowsToCsv(result.updatedRows, allUpdatedColumns);
    const exceptionCsv = rowsToCsv(
      result.exceptionRows.map((row) => ({
        Date: row.date,
        "Ref. no": row.refNo,
        "Batch no": row.batchNo,
        "Expiry date": row.expiryDate,
        "Issued to or received from": row.issuedToOrReceivedFrom,
        "Quantity received": row.quantityReceived,
        "Quantity issued": row.quantityIssued,
        "Losses and adjustments": row.lossesAndAdjustments,
        Balance: row.balance,
        Remarks: row.remarks,
        "Name and signature": row.nameAndSignature,
        "Exception reason": row.exceptionReason
      })),
      EXCEPTION_COLUMNS
    );

    const updatedPath = `${id}/updated.csv`;
    const exceptionPath = `${id}/exceptions.csv`;

    const [updatedUpload, exceptionUpload] = await Promise.all([
      supabase.storage.from("generated-csv").upload(updatedPath, Buffer.from(updatedCsv, "utf8"), {
        contentType: "text/csv;charset=utf-8",
        upsert: true
      }),
      supabase.storage.from("generated-csv").upload(exceptionPath, Buffer.from(exceptionCsv, "utf8"), {
        contentType: "text/csv;charset=utf-8",
        upsert: true
      })
    ]);

    if (updatedUpload.error) throw updatedUpload.error;
    if (exceptionUpload.error) throw exceptionUpload.error;

    const { error: comparisonError } = await supabase.from("comparison_results").insert({
      document_id: id,
      master_csv_path: masterPath,
      matched_count: result.matched.length,
      unmatched_count: result.unmatched.length,
      updated_csv_path: updatedPath,
      exception_csv_path: exceptionPath
    });
    if (comparisonError) throw comparisonError;

    const { error: documentError } = await supabase
      .from("documents")
      .update({
        status: "completed",
        updated_csv_path: updatedPath,
        exception_csv_path: exceptionPath,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);
    if (documentError) throw documentError;

    await createAuditLog(id, "comparison_completed", {
      matched: result.matched.length,
      unmatched: result.unmatched.length,
      masterCsvPath: masterPath
    });

    return NextResponse.json({
      summary: {
        totalExtractedRows: extractedRows.length,
        matchedRows: result.matched.length,
        unmatchedRows: result.unmatched.length,
        updatedRows: result.updatedRows.length,
        exceptionRows: result.exceptionRows.length
      },
      preview: parsed.rows.slice(0, 10),
      paths: { updatedPath, exceptionPath, masterPath }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Comparison failed." }, { status: 500 });
  }
}
