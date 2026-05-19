export function ReviewProgress({ reviewed, total }: { reviewed: number; total: number }) {
  const percent = total ? Math.round((reviewed / total) * 100) : 100;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-ink">Review progress</span>
        <span className="text-slate-600">
          {reviewed} of {total} uncertain fields reviewed
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full bg-brand transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
