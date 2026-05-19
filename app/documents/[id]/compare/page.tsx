"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { AppLayout } from "@/components/AppLayout";
import { CompareSummary } from "@/components/CompareSummary";
import { CsvPreviewTable } from "@/components/CsvPreviewTable";
import { DownloadButton } from "@/components/DownloadButton";
import { FileUpload } from "@/components/FileUpload";

type Summary = {
  totalExtractedRows: number;
  matchedRows: number;
  unmatchedRows: number;
  updatedRows: number;
  exceptionRows: number;
};

export default function ComparePage() {
  const params = useParams<{ id: string }>();
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [paths, setPaths] = useState<{ updatedPath?: string; exceptionPath?: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function compare() {
    if (!file) {
      setError("Choose a master CSV before comparing.");
      return;
    }
    if (!window.confirm("Run comparison and generate updated and exception CSV files?")) return;

    setBusy(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/documents/${params.id}/compare`, { method: "POST", body: formData });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error);
      setSummary(json.summary);
      setPreview(json.preview ?? []);
      setPaths(json.paths);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Comparison failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">Compare against master CSV</h1>
          <p className="mt-1 text-sm text-slate-600">Primary matching uses Issued to or received from, normalized for case, spaces, and punctuation.</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
          <FileUpload
            label="Upload Existing Master CSV"
            accept=".csv,text/csv"
            helpText="CSV with stock/control rows"
            onFile={setFile}
          />
          {error ? <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
          <button
            type="button"
            onClick={compare}
            disabled={busy}
            className="mt-6 rounded-md bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Comparing..." : "Compare and generate files"}
          </button>
        </div>

        {summary ? <CompareSummary summary={summary} /> : null}
        {preview.length ? (
          <div>
            <h2 className="mb-3 font-semibold text-ink">Master CSV preview</h2>
            <CsvPreviewTable rows={preview} />
          </div>
        ) : null}
        {paths ? (
          <div className="flex flex-wrap gap-3 rounded-lg border border-slate-200 bg-white p-4">
            <DownloadButton href={paths.updatedPath ? `/api/download?bucket=generated-csv&path=${encodeURIComponent(paths.updatedPath)}` : null} label="Download updated CSV" />
            <DownloadButton href={paths.exceptionPath ? `/api/download?bucket=generated-csv&path=${encodeURIComponent(paths.exceptionPath)}` : null} label="Download exception CSV" />
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}
