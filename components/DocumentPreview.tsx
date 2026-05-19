import { DownloadButton } from "@/components/DownloadButton";

export function DocumentPreview({ path }: { path?: string | null }) {
  if (!path) {
    return <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">No original file is available.</div>;
  }

  const isImage = /\.(jpg|jpeg|png|heic|heif)$/i.test(path);
  const signedPath = `/api/download?bucket=original-documents&path=${encodeURIComponent(path)}`;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-ink">Scanned document</h2>
        <DownloadButton href={signedPath} label="Open original" />
      </div>
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={signedPath} alt="Uploaded scanned country form" className="max-h-[520px] w-full rounded-md object-contain" />
      ) : (
        <iframe title="Uploaded PDF preview" src={signedPath} className="h-[520px] w-full rounded-md border border-slate-200" />
      )}
    </div>
  );
}
