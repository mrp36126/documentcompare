import { NextResponse } from "next/server";
import { createServiceClient, createAuditLog } from "@/lib/supabase/server";
import {
  FIELD_KEYS,
  FIELD_TO_DB_FIELD,
  DB_FIELD_TO_FIELD,
  type CorrectedRow,
  type ExtractedCell,
  type ExtractedRow
} from "@/lib/types";
import { correctedRowsToCsv } from "@/lib/csv/exportCsv";

type Params = { params: Promise<{ id: string }> };

function dbRowToExtracted(row: Record<string, unknown>): ExtractedRow {
  const confidence = (row.confidence_json ?? {}) as Record<string, Partial<ExtractedCell>>;
  const converted = {
    id: String(row.id),
    rowIndex: Number(row.row_index)
  } as ExtractedRow;

  for (const [dbField, field] of Object.entries(DB_FIELD_TO_FIELD)) {
    converted[field] = {
      value: String(row[dbField] ?? ""),
      confidence: Number(confidence[field]?.confidence ?? 1),
      isUncertain: Boolean(confidence[field]?.isUncertain),
      reason: confidence[field]?.reason,
      reviewed: Boolean(confidence[field]?.reviewed)
    };
  }

  return converted;
}

export async function GET(_request: Request, context: Params) {
  try {
    const { id } = await context.params;
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("extracted_rows")
      .select("*")
      .eq("document_id", id)
      .order("row_index", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ rows: (data ?? []).map(dbRowToExtracted) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load rows." }, { status: 500 });
  }
}

export async function PUT(request: Request, context: Params) {
  try {
    const { id } = await context.params;
    const { rows } = (await request.json()) as { rows?: ExtractedRow[] };
    if (!rows?.length) return NextResponse.json({ error: "No rows were provided." }, { status: 400 });

    const unresolved = rows.flatMap((row) =>
      FIELD_KEYS.filter((key) => row[key].isUncertain && !row[key].reviewed).map((key) => `${row.rowIndex}:${key}`)
    );
    if (unresolved.length) {
      return NextResponse.json({ error: "All uncertain cells must be corrected or marked reviewed before saving." }, { status: 400 });
    }

    const supabase = createServiceClient();
    const correctedRows: CorrectedRow[] = rows.map((row) => {
      const corrected = { id: row.id, rowIndex: row.rowIndex } as CorrectedRow;
      for (const key of FIELD_KEYS) corrected[key] = row[key].value.trim();
      return corrected;
    });

    for (const row of rows) {
      const updates: Record<string, unknown> = {
        reviewed: true,
        updated_at: new Date().toISOString(),
        confidence_json: Object.fromEntries(FIELD_KEYS.map((key) => [key, {
          confidence: row[key].confidence,
          isUncertain: row[key].isUncertain,
          reason: row[key].reason,
          reviewed: row[key].reviewed ?? !row[key].isUncertain
        }]))
      };

      for (const key of FIELD_KEYS) updates[FIELD_TO_DB_FIELD[key]] = row[key].value.trim();

      const query = supabase.from("extracted_rows").update(updates);
      const { error } = row.id
        ? await query.eq("id", row.id)
        : await query.eq("document_id", id).eq("row_index", row.rowIndex);
      if (error) throw error;
    }

    const csv = correctedRowsToCsv(correctedRows);
    const path = `${id}/extracted.csv`;
    const upload = await supabase.storage
      .from("generated-csv")
      .upload(path, Buffer.from(csv, "utf8"), {
        contentType: "text/csv;charset=utf-8",
        upsert: true
      });
    if (upload.error) throw upload.error;

    const { error: documentError } = await supabase
      .from("documents")
      .update({
        status: "reviewed",
        extracted_csv_path: path,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);
    if (documentError) throw documentError;

    await createAuditLog(id, "corrected_data_saved", { rows: rows.length, extractedCsvPath: path });

    return NextResponse.json({ csvPath: path });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save corrected rows." }, { status: 500 });
  }
}
