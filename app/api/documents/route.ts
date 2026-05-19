import { NextResponse } from "next/server";
import { createServiceClient, createAuditLog } from "@/lib/supabase/server";

const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
  "image/heic",
  "image/heif"
]);

function extensionFor(file: File) {
  const nameExtension = file.name.split(".").pop();
  if (nameExtension) return nameExtension.toLowerCase();
  if (file.type === "application/pdf") return "pdf";
  if (file.type === "image/png") return "png";
  if (file.type === "image/heic") return "heic";
  return "jpg";
}

export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;
    return NextResponse.json({ documents: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load documents." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const countryName = String(formData.get("countryName") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Please choose a scanned JPG, PNG, PDF, or HEIC file." }, { status: 400 });
    }

    if (!ACCEPTED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Unsupported file type. Use JPG, PNG, PDF, or HEIC." }, { status: 400 });
    }

    if (!countryName) {
      return NextResponse.json({ error: "Country name is required." }, { status: 400 });
    }

    const supabase = createServiceClient();
    const documentId = crypto.randomUUID();
    const originalFilePath = `${documentId}/original-file.${extensionFor(file)}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const upload = await supabase.storage
      .from("original-documents")
      .upload(originalFilePath, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (upload.error) throw upload.error;

    const { data, error } = await supabase
      .from("documents")
      .insert({
        id: documentId,
        country_name: countryName,
        description: description || null,
        original_file_path: originalFilePath,
        status: "uploaded"
      })
      .select("*")
      .single();

    if (error) throw error;
    await createAuditLog(documentId, "document_uploaded", { fileName: file.name, contentType: file.type });

    return NextResponse.json({ document: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed." }, { status: 500 });
  }
}
