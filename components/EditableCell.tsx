"use client";

import clsx from "clsx";
import type { ExtractedCell } from "@/lib/types";

type Props = {
  cell: ExtractedCell;
  onChange: (cell: ExtractedCell) => void;
  onFocus: () => void;
};

export function EditableCell({ cell, onChange, onFocus }: Props) {
  const state = cell.isUncertain && !cell.reviewed ? "uncertain" : cell.confidence < 0.85 ? "review" : "ok";

  return (
    <input
      value={cell.value}
      onFocus={onFocus}
      onChange={(event) => onChange({ ...cell, value: event.target.value, reviewed: false })}
      className={clsx(
        "min-w-36 rounded-md border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand",
        state === "ok" && "border-emerald-200 bg-white",
        state === "review" && "border-amber-300 bg-amber-50",
        state === "uncertain" && "border-red-300 bg-red-50"
      )}
    />
  );
}
