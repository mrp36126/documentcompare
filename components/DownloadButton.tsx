import { Download } from "lucide-react";

export function DownloadButton({ href, label }: { href?: string | null; label: string }) {
  if (!href) {
    return (
      <span className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-400">
        <Download className="h-4 w-4" /> {label}
      </span>
    );
  }

  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
    >
      <Download className="h-4 w-4" /> {label}
    </a>
  );
}
