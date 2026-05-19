"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/AppLayout";
import { FileUpload } from "@/components/FileUpload";

export default function NewDocumentPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [countryName, setCountryName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!file) {
      setError("Choose a scanned form before uploading.");
      return;
    }
    setBusy(true);
    setError("");
    setStatus("Uploading original file...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("countryName", countryName);
      formData.append("description", description);

      const uploadResponse = await fetch("/api/documents", { method: "POST", body: formData });
      const uploadJson = await uploadResponse.json();
      if (!uploadResponse.ok) throw new Error(uploadJson.error || "Upload failed.");

      setStatus("Extracting handwriting with ICR rules...");
      const extractResponse = await fetch("/api/extract-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: uploadJson.document.id })
      });
      const extractJson = await extractResponse.json();
      if (!extractResponse.ok) throw new Error(extractJson.error || "Extraction failed.");

      setStatus("Extraction complete. Opening review screen...");
      router.push(`/documents/${uploadJson.document.id}/review`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
          <h1 className="text-2xl font-bold text-ink">Upload scanned country form</h1>
          <p className="mt-2 text-sm text-slate-600">Accepted file types: JPG, PNG, PDF, and HEIC where browser upload support is available.</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Country name</span>
              <input
                value={countryName}
                onChange={(event) => setCountryName(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-brand"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Document description</span>
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-brand"
              />
            </label>
          </div>

          <div className="mt-6">
            <FileUpload
              label="Drop the scanned form here"
              accept=".jpg,.jpeg,.png,.pdf,.heic,.heif,image/jpeg,image/png,application/pdf,image/heic,image/heif"
              helpText="JPG, PNG, PDF, or HEIC"
              onFile={setFile}
            />
          </div>

          {error ? <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
          {status ? <div className="mt-4 rounded-md bg-teal-50 p-3 text-sm text-teal-800">{status}</div> : null}

          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="mt-6 w-full rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Processing..." : "Upload and extract"}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
