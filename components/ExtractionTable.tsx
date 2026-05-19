"use client";

import { useMemo, useState } from "react";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { EditableCell } from "@/components/EditableCell";
import { FORM_HEADERS, HEADER_TO_FIELD, type ExtractedCell, type ExtractedRow, type FieldKey } from "@/lib/types";

type Props = {
  rows: ExtractedRow[];
  onRowsChange: (rows: ExtractedRow[]) => void;
};

export function ExtractionTable({ rows, onRowsChange }: Props) {
  const firstUncertain = useMemo(() => {
    for (const row of rows) {
      for (const header of FORM_HEADERS) {
        const key = HEADER_TO_FIELD[header];
        if (row[key].isUncertain && !row[key].reviewed) return { rowIndex: row.rowIndex, key, cell: row[key] };
      }
    }
    return null;
  }, [rows]);

  const [selected, setSelected] = useState<{ rowIndex: number; key: FieldKey; cell: ExtractedCell } | null>(firstUncertain);
  const active = selected ?? firstUncertain;

  function updateCell(rowIndex: number, key: FieldKey, cell: ExtractedCell) {
    onRowsChange(rows.map((row) => (row.rowIndex === rowIndex ? { ...row, [key]: cell } : row)));
    setSelected({ rowIndex, key, cell });
  }

  function markReviewed() {
    if (!active) return;
    updateCell(active.rowIndex, active.key, { ...active.cell, reviewed: true, isUncertain: false, reason: active.cell.reason });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="table-scroll overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-soft">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="sticky left-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-3">#</th>
              {FORM_HEADERS.map((header) => (
                <th key={header} className="whitespace-nowrap border-b border-slate-200 px-3 py-3">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.rowIndex} className="border-b border-slate-100">
                <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium text-slate-500">{row.rowIndex}</td>
                {FORM_HEADERS.map((header) => {
                  const key = HEADER_TO_FIELD[header];
                  return (
                    <td key={header} className="px-2 py-2 align-top">
                      <EditableCell
                        cell={row[key]}
                        onFocus={() => setSelected({ rowIndex: row.rowIndex, key, cell: row[key] })}
                        onChange={(cell) => updateCell(row.rowIndex, key, cell)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
        <h3 className="font-semibold text-ink">Cell review</h3>
        {active ? (
          <div className="mt-4 space-y-4">
            <div>
              <div className="text-xs font-semibold uppercase text-slate-500">Row {active.rowIndex}</div>
              <div className="mt-1 text-sm text-slate-700">{active.key}</div>
            </div>
            <ConfidenceBadge confidence={active.cell.confidence} isUncertain={active.cell.isUncertain} />
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Current value</label>
              <input
                value={active.cell.value}
                onChange={(event) => updateCell(active.rowIndex, active.key, { ...active.cell, value: event.target.value, reviewed: false })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
              {active.cell.reason || "This cell is currently accepted by the confidence rules."}
            </p>
            <button
              type="button"
              onClick={markReviewed}
              className="w-full rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Mark reviewed
            </button>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">Select a cell to view confidence details.</p>
        )}
      </aside>
    </div>
  );
}
