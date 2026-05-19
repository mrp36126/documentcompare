const DATE_PATTERNS = [
  /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
  /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
  /^(\d{1,2})-(\d{1,2})-(\d{4})$/
];

function isValidDateParts(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function normalizeDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return { value: "", isValid: false };

  const iso = trimmed.match(DATE_PATTERNS[0]);
  if (iso) {
    const [, y, m, d] = iso;
    const year = Number(y);
    const month = Number(m);
    const day = Number(d);
    return {
      value: `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`,
      isValid: isValidDateParts(year, month, day)
    };
  }

  const slash = trimmed.match(DATE_PATTERNS[1]);
  const dash = trimmed.match(DATE_PATTERNS[2]);
  const match = slash ?? dash;
  if (!match) return { value: trimmed, isValid: false };

  const first = Number(match[1]);
  const second = Number(match[2]);
  const year = Number(match[3]);
  const dayFirstValid = isValidDateParts(year, second, first);
  const monthFirstValid = isValidDateParts(year, first, second);

  if (first > 12 && dayFirstValid) {
    return { value: `${year}-${String(second).padStart(2, "0")}-${String(first).padStart(2, "0")}`, isValid: true };
  }

  if (monthFirstValid) {
    return { value: `${year}-${String(first).padStart(2, "0")}-${String(second).padStart(2, "0")}`, isValid: true };
  }

  if (dayFirstValid) {
    return { value: `${year}-${String(second).padStart(2, "0")}-${String(first).padStart(2, "0")}`, isValid: true };
  }

  return { value: trimmed, isValid: false };
}
