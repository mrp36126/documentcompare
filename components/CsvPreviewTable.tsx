export function CsvPreviewTable({ rows }: { rows: Record<string, string>[] }) {
  if (!rows.length) return null;
  const columns = Object.keys(rows[0]);

  return (
    <div className="table-scroll overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-600">
          <tr>
            {columns.map((column) => (
              <th key={column} className="whitespace-nowrap border-b border-slate-200 px-3 py-3">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 8).map((row, index) => (
            <tr key={index} className="border-b border-slate-100">
              {columns.map((column) => (
                <td key={column} className="whitespace-nowrap px-3 py-2 text-slate-700">
                  {row[column]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
