import Link from "next/link";
import { AppLayout } from "@/components/AppLayout";
import { DocumentPreview } from "@/components/DocumentPreview";
import { DownloadButton } from "@/components/DownloadButton";
import { StatusBadge } from "@/components/StatusBadge";
import { createServiceClient } from "@/lib/supabase/server";
import type { DocumentRecord } from "@/lib/types";

type PageProps = { params: Promise<{ id: string }> };

export default async function DocumentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data: document } = await supabase.from("documents").select("*").eq("id", id).single<DocumentRecord>();
  const { data: logs } = await supabase.from("audit_logs").select("*").eq("document_id", id).order("created_at", { ascending: false });

  if (!document) {
    return (
      <AppLayout>
        <div className="rounded-lg border border-slate-200 bg-white p-6">Document not found.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">{document.country_name}</h1>
          <p className="mt-1 text-sm text-slate-600">{document.description || "No description"}</p>
        </div>
        <StatusBadge status={document.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
        <DocumentPreview path={document.original_file_path} />
        <div className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
            <h2 className="font-semibold text-ink">Actions and downloads</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href={`/documents/${id}/review`} className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">
                Review data
              </Link>
              <Link href={`/documents/${id}/compare`} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                Compare CSV
              </Link>
              <DownloadButton href={document.extracted_csv_path ? `/api/download?bucket=generated-csv&path=${encodeURIComponent(document.extracted_csv_path)}` : null} label="Corrected CSV" />
              <DownloadButton href={document.updated_csv_path ? `/api/download?bucket=generated-csv&path=${encodeURIComponent(document.updated_csv_path)}` : null} label="Updated CSV" />
              <DownloadButton href={document.exception_csv_path ? `/api/download?bucket=generated-csv&path=${encodeURIComponent(document.exception_csv_path)}` : null} label="Exception CSV" />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
            <h2 className="font-semibold text-ink">Audit trail</h2>
            <div className="mt-4 divide-y divide-slate-100">
              {(logs ?? []).length ? (logs ?? []).map((log) => (
                <div key={log.id} className="py-3 text-sm">
                  <div className="font-medium text-ink">{log.action}</div>
                  <div className="text-slate-500">{new Date(log.created_at).toLocaleString()}</div>
                </div>
              )) : <p className="text-sm text-slate-600">No audit events yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
