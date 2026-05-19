import clsx from "clsx";

export function ConfidenceBadge({ confidence, isUncertain }: { confidence: number; isUncertain: boolean }) {
  const label = confidence >= 0.85 && !isUncertain ? "Accepted" : confidence >= 0.65 ? "Needs review" : "Uncertain";
  return (
    <span
      className={clsx(
        "inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1",
        label === "Accepted" && "bg-emerald-50 text-emerald-700 ring-emerald-200",
        label === "Needs review" && "bg-amber-50 text-amber-800 ring-amber-200",
        label === "Uncertain" && "bg-red-50 text-red-700 ring-red-200"
      )}
    >
      {label} {Math.round(confidence * 100)}%
    </span>
  );
}
