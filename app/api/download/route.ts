import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const ALLOWED_BUCKETS = new Set(["original-documents", "generated-csv", "master-csv"]);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bucket = searchParams.get("bucket") ?? "";
    const path = searchParams.get("path") ?? "";

    if (!ALLOWED_BUCKETS.has(bucket) || !path) {
      return NextResponse.json({ error: "Invalid download request." }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
    if (error) throw error;

    return NextResponse.redirect(data.signedUrl);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Download failed." }, { status: 500 });
  }
}
