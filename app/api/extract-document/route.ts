import { NextResponse } from "next/server";
import { extractDocument } from "@/lib/icr/extractDocument";
import { createServiceClient, createAuditLog } from "@/lib/supabase/server";
import { FIELD_KEYS, FIELD_TO_DB_FIELD } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { documentId } = (await request.json()) as { documentId?: string };
    if (!documentId) return NextResponse.json({ error: "documentId is required." }, { status: 400 });

    const supabase = createServiceClient();
    const { data: document, error: documentError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (documentError || !document) throw documentError ?? new Error("Document not found.");

    await supabase.from("documents").update({ status: "extracting", updated_at: new Date().toISOString() }).eq("id", documentId);
    await createAuditLog(documentId, "extraction_started");

    const extraction = await extractDocument({
      documentId,
      filePath: document.original_file_path
    });
    const rows = extraction.rows;

    const dbRows = rows.map((row) => {
      const record: Record<string, unknown> = {
        document_id: documentId,
        row_index: row.rowIndex,
        confidence_json: Object.fromEntries(FIELD_KEYS.map((key) => [key, {
          confidence: row[key].confidence,
          isUncertain: row[key].isUncertain,
          reason: row[key].reason,
          reviewed: row[key].reviewed ?? false
        }])),
        reviewed: false
      };

      for (const key of FIELD_KEYS) record[FIELD_TO_DB_FIELD[key]] = row[key].value;
      return record;
    });

    await supabase.from("extracted_rows").delete().eq("document_id", documentId);
    const { error: insertError } = await supabase.from("extracted_rows").insert(dbRows);
    if (insertError) throw insertError;

    await supabase
      .from("documents")
      .update({ status: "needs_review", updated_at: new Date().toISOString() })
      .eq("id", documentId);

    await createAuditLog(documentId, "extraction_completed", {
      provider: extraction.provider,
      rows: rows.length,
      uncertainFields: rows.flatMap((row) => FIELD_KEYS.filter((key) => row[key].isUncertain)).length
    });

    return NextResponse.json({ provider: extraction.provider, rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Extraction failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
