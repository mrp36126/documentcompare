import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Params) {
  try {
    const { id } = await context.params;
    const supabase = createServiceClient();
    const { data: document, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    const { data: logs } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("document_id", id)
      .order("created_at", { ascending: false });

    const { data: comparison } = await supabase
      .from("comparison_results")
      .select("*")
      .eq("document_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({ document, logs: logs ?? [], comparison });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Document not found." }, { status: 404 });
  }
}
