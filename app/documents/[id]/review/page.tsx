"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AppLayout } from "@/components/AppLayout";
import { DocumentPreview } from "@/components/DocumentPreview";
import { DownloadButton } from "@/components/DownloadButton";
import { ExtractionTable } from "@/components/ExtractionTable";
import { ReviewProgress } from "@/components/ReviewProgress";
import { FIELD_KEYS, type DocumentRecord, type ExtractedRow } from "@/lib/types";

export default function ReviewPage() {
  const params = useParams<{ id: string }>();
  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [rows, setRows] = useState<ExtractedRow[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [documentResponse, rowsResponse] = await Promise.all([
          fetch(`/api/documents/${params.id}`),
          fetch(`/api/documents/${params.id}/rows`)
        ]);
        const documentJson = await documentResponse.json();
        const rowsJson = await rowsResponse.json();
        if (!documentResponse.ok) throw new Error(documentJson.error);
        if (!rowsResponse.ok) throw new Error(rowsJson.error);
        setDocument(documentJson.document);
        setRows(rowsJson.rows);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to load review data.");
      }
    }
    load();
  }, [params.id]);

  const reviewStats = useMemo(() => {
    let total = 0;
    let reviewed = 0;
    for (const row of rows) {
      for (const key of FIELD_KEYS) {
        if (row[key].isUncertain) {
          total += 1;
          if (row[key].reviewed) reviewed += 1;
        }
      }
    }
    return { total, reviewed };
  }, [rows]);

  async function save() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/documents/${params.id}/rows`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows })
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error);
      setMessage("Corrected spreadsheet saved and CSV generated.");
      setDocument((current) => current ? { ...current, extracted_csv_path: json.csvPath, status: "reviewed" } : current);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save corrected data.");
    } finally {
      setBusy(false);
    }
  }

  const canSave = reviewStats.reviewed === reviewStats.total;

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Review extracted spreadsheet</h1>
          <p className="text-sm text-slate-600">{document?.country_name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DownloadButton href={document?.extracted_csv_path ? `/api/download?bucket=generated-csv&path=${encodeURIComponent(document.extracted_csv_path)}` : null} label="Download corrected CSV" />
          <Link href={`/documents/${params.id}/compare`} className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            Compare CSV
          </Link>
        </div>
      </div>

      {error ? <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="mb-4 rounded-md bg-teal-50 p-3 text-sm text-teal-800">{message}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <DocumentPreview path={document?.original_file_path} />
        <div className="space-y-4">
          <ReviewProgress reviewed={reviewStats.reviewed} total={reviewStats.total} />
          <ExtractionTable rows={rows} onRowsChange={setRows} />
          <button
            type="button"
            disabled={!canSave || busy}
            onClick={save}
            className="rounded-md bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Saving..." : "Save Corrected Data"}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
