"use client";

import { UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import clsx from "clsx";

type Props = {
  label: string;
  accept: string;
  helpText: string;
  onFile: (file: File) => void;
};

export function FileUpload({ label, accept, helpText, onFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");

  function choose(file?: File) {
    if (!file) return;
    setFileName(file.name);
    onFile(file);
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        choose(event.dataTransfer.files[0]);
      }}
      className={clsx(
        "rounded-lg border-2 border-dashed bg-white p-6 text-center transition",
        dragging ? "border-brand bg-mint" : "border-slate-300"
      )}
    >
      <UploadCloud className="mx-auto h-10 w-10 text-brand" aria-hidden="true" />
      <div className="mt-3 text-sm font-semibold text-ink">{label}</div>
      <p className="mt-1 text-sm text-slate-600">{fileName || helpText}</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-4 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
      >
        Choose file
      </button>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept={accept}
        onChange={(event) => choose(event.target.files?.[0])}
      />
    </div>
  );
}
