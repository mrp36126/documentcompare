import Link from "next/link";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { createServiceClient } from "@/lib/supabase/server";
import type { DocumentRecord } from "@/lib/types";

async function getDocuments(): Promise<{ documents: DocumentRecord[]; error?: string }> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw error;
    return { documents: data ?? [] };
  } catch (error) {
    return { documents: [], error: error instanceof Error ? error.message : "Unable to load documents." };
  }
}

export default async function DashboardPage() {
  const { documents, error } = await getDocuments();

  return (
    <AppLayout>
      <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">Production workflow</p>
          <h1 className="mt-2 text-3xl font-bold text-ink">Country Stock Sheet Digitizer</h1>
          <p className="mt-3 max-w-3xl text-slate-600">
            Upload scanned handwritten stock/control forms, review uncertain OCR fields, compare corrected rows against a master CSV,
            and export updated and exception files.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/documents/new" className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">
              Start new document processing
            </Link>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="font-semibold text-ink">Workflow</h2>
          <ol className="mt-4 space-y-3 text-sm text-slate-700">
            <li>1. Upload scanned form</li>
            <li>2. Extract handwritten rows</li>
            <li>3. Review uncertain fields</li>
            <li>4. Save corrected spreadsheet</li>
            <li>5. Compare and export CSV files</li>
          </ol>
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-slate-200 bg-white shadow-soft">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="font-semibold text-ink">Recent uploaded documents</h2>
          {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
        </div>
        <div className="divide-y divide-slate-100">
          {documents.length ? (
            documents.map((document) => (
              <Link key={document.id} href={`/documents/${document.id}`} className="flex flex-col gap-3 px-6 py-4 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium text-ink">{document.country_name}</div>
                  <div className="text-sm text-slate-500">{document.description || "No description"} · {new Date(document.created_at).toLocaleString()}</div>
                </div>
                <StatusBadge status={document.status} />
              </Link>
            ))
          ) : (
            <div className="px-6 py-8 text-sm text-slate-600">No documents have been uploaded yet.</div>
          )}
        </div>
      </section>
    </AppLayout>
  );
}
