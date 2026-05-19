type ErrorLike = {
  message?: unknown;
  error?: unknown;
  details?: unknown;
  hint?: unknown;
  code?: unknown;
  statusCode?: unknown;
  status?: unknown;
};

export function errorMessage(error: unknown, fallback = "Something went wrong.") {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;

  if (error && typeof error === "object") {
    const errorLike = error as ErrorLike;
    const parts = [
      errorLike.message,
      errorLike.error,
      errorLike.details,
      errorLike.hint,
      errorLike.code ? `Code: ${String(errorLike.code)}` : undefined,
      errorLike.statusCode ? `Status: ${String(errorLike.statusCode)}` : undefined,
      errorLike.status ? `Status: ${String(errorLike.status)}` : undefined
    ]
      .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
      .map((part) => part.trim());

    if (parts.length) return parts.join(" ");
  }

  return fallback;
}
