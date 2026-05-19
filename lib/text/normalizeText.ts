export function normalizeText(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.,;:]/g, "");
}

export function normalizeLooseHeader(value: string | null | undefined) {
  return normalizeText(value).replace(/[^a-z0-9]/g, "");
}
