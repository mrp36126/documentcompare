type Summary = {
  totalExtractedRows: number;
  matchedRows: number;
  unmatchedRows: number;
  updatedRows: number;
  exceptionRows: number;
};

export function CompareSummary({ summary }: { summary: Summary }) {
  const items = [
    ["Total extracted rows", summary.totalExtractedRows],
    ["Matched rows", summary.matchedRows],
    ["Unmatched rows", summary.unmatchedRows],
    ["Updated rows", summary.updatedRows],
    ["Exception rows", summary.exceptionRows]
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-2xl font-semibold text-ink">{value}</div>
          <div className="mt-1 text-sm text-slate-600">{label}</div>
        </div>
      ))}
    </div>
  );
}
