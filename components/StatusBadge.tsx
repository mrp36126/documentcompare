import clsx from "clsx";
import type { DocumentStatus } from "@/lib/types";

const LABELS: Record<string, string> = {
  uploaded: "Uploaded",
  extracting: "Extracting",
  needs_review: "Needs Review",
  reviewed: "Reviewed",
  compared: "Compared",
  completed: "Completed",
  failed: "Failed"
};

const STYLES: Record<string, string> = {
  uploaded: "bg-slate-100 text-slate-700 ring-slate-200",
  extracting: "bg-blue-50 text-blue-700 ring-blue-200",
  needs_review: "bg-amber-50 text-amber-800 ring-amber-200",
  reviewed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  compared: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  completed: "bg-teal-50 text-teal-700 ring-teal-200",
  failed: "bg-red-50 text-red-700 ring-red-200"
};

export function StatusBadge({ status }: { status: DocumentStatus | string }) {
  return (
    <span className={clsx("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1", STYLES[status] ?? STYLES.uploaded)}>
      {LABELS[status] ?? status}
    </span>
  );
}
