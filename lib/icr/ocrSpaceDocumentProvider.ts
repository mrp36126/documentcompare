import { errorMessage } from "@/lib/errors";
import type { DocumentExtractionProvider } from "@/lib/icr/provider";
import { FIELD_KEYS, type ExtractedCell, type ExtractedRow, type FieldKey } from "@/lib/types";

type OcrSpaceWord = {
  WordText?: string;
  Left?: number;
  Top?: number;
  Height?: number;
  Width?: number;
};

type OcrSpaceLine = {
  LineText?: string;
  Words?: OcrSpaceWord[];
  MinTop?: number;
  MaxHeight?: number;
};

type OcrSpaceParsedResult = {
  ParsedText?: string;
  ErrorMessage?: string | string[];
  TextOverlay?: {
    Lines?: OcrSpaceLine[];
  };
};

type OcrSpaceResponse = {
  OCRExitCode?: number;
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string | string[];
  ErrorDetails?: string;
  ParsedResults?: OcrSpaceParsedResult[];
};

type PositionedWord = {
  text: string;
  left: number;
  right: number;
  top: number;
  height: number;
};

const OCR_SPACE_ENDPOINT = "https://api.ocr.space/parse/image";
const CELL_CONFIDENCE = 0.7;
const EMPTY_CELL_CONFIDENCE = 0.35;

const HEADER_HINTS = [
  "date",
  "ref",
  "batch",
  "expiry",
  "issued",
  "quantity",
  "losses",
  "balance",
  "remarks",
  "signature"
];

function ocrSpaceError(payload: OcrSpaceResponse, fallback: string) {
  const errors = [
    payload.ErrorMessage,
    payload.ErrorDetails,
    ...(payload.ParsedResults ?? []).map((result) => result.ErrorMessage)
  ].flat();

  const message = errors.filter(Boolean).join(" ");
  return message || fallback;
}

function cell(value: string, confidence = CELL_CONFIDENCE, reason?: string): ExtractedCell {
  const trimmed = value.trim();
  return {
    value: trimmed,
    confidence: trimmed ? confidence : EMPTY_CELL_CONFIDENCE,
    isUncertain: true,
    reason: reason || "OCR.Space provides text extraction only; please review this field."
  };
}

function emptyRow(rowIndex: number): ExtractedRow {
  const row = { rowIndex } as ExtractedRow;
  for (const key of FIELD_KEYS) row[key] = cell("");
  return row;
}

function rowFromValues(values: string[], rowIndex: number): ExtractedRow {
  const row = emptyRow(rowIndex);
  FIELD_KEYS.forEach((key, index) => {
    row[key] = cell(values[index] ?? "");
  });
  return row;
}

function normalizedLineText(line: OcrSpaceLine) {
  return [
    line.LineText,
    ...(line.Words ?? []).map((word) => word.WordText)
  ].filter(Boolean).join(" ").toLowerCase();
}

function isHeaderLine(line: OcrSpaceLine) {
  const text = normalizedLineText(line);
  return HEADER_HINTS.some((hint) => text.includes(hint));
}

function isUsefulDataText(value: string) {
  return /[a-z0-9]/i.test(value) && !HEADER_HINTS.includes(value.toLowerCase());
}

function lineTop(line: OcrSpaceLine) {
  if (typeof line.MinTop === "number") return line.MinTop;
  const tops = (line.Words ?? []).map((word) => word.Top).filter((top): top is number => typeof top === "number");
  return tops.length ? Math.min(...tops) : 0;
}

function lineHeight(line: OcrSpaceLine) {
  if (typeof line.MaxHeight === "number") return line.MaxHeight;
  const heights = (line.Words ?? []).map((word) => word.Height).filter((height): height is number => typeof height === "number");
  return heights.length ? Math.max(...heights) : 0;
}

function wordsFromLine(line: OcrSpaceLine): PositionedWord[] {
  return (line.Words ?? [])
    .map((word) => {
      const text = (word.WordText ?? "").trim();
      if (!text || typeof word.Left !== "number") return null;

      const width = typeof word.Width === "number" ? word.Width : 0;
      const top = typeof word.Top === "number" ? word.Top : lineTop(line);
      const height = typeof word.Height === "number" ? word.Height : lineHeight(line);
      return {
        text,
        left: word.Left,
        right: word.Left + width,
        top,
        height
      };
    })
    .filter((word): word is PositionedWord => Boolean(word));
}

function headerBottom(lines: OcrSpaceLine[]) {
  const headerLines = lines.filter(isHeaderLine);
  if (!headerLines.length) return 0;
  return Math.max(...headerLines.map((line) => lineTop(line) + lineHeight(line)));
}

function estimateColumnBounds(lines: OcrSpaceLine[]) {
  const allWords = lines.flatMap(wordsFromLine);
  if (!allWords.length) return null;

  const minLeft = Math.min(...allWords.map((word) => word.left));
  const maxRight = Math.max(...allWords.map((word) => word.right));
  const width = Math.max(maxRight - minLeft, FIELD_KEYS.length);

  return FIELD_KEYS.map((_, index) => ({
    left: minLeft + (width * index) / FIELD_KEYS.length,
    right: minLeft + (width * (index + 1)) / FIELD_KEYS.length
  }));
}

function keyForWord(word: PositionedWord, bounds: Array<{ left: number; right: number }>): FieldKey {
  const center = (word.left + word.right) / 2;
  const index = bounds.findIndex((bound) => center >= bound.left && center < bound.right);
  return FIELD_KEYS[Math.max(0, index === -1 ? FIELD_KEYS.length - 1 : index)];
}

function rowsFromOverlay(results: OcrSpaceParsedResult[]) {
  const lines = results.flatMap((result) => result.TextOverlay?.Lines ?? []);
  if (!lines.length) return [];

  const bounds = estimateColumnBounds(lines);
  if (!bounds) return [];

  const firstDataTop = headerBottom(lines);
  const dataLines = lines
    .filter((line) => lineTop(line) > firstDataTop)
    .filter((line) => wordsFromLine(line).some((word) => isUsefulDataText(word.text)));

  return dataLines.map((line, index) => {
    const values = FIELD_KEYS.reduce((accumulator, key) => {
      accumulator[key] = [];
      return accumulator;
    }, {} as Record<FieldKey, string[]>);
    for (const word of wordsFromLine(line)) {
      values[keyForWord(word, bounds)].push(word.text);
    }

    return rowFromValues(FIELD_KEYS.map((key) => values[key].join(" ")), index + 1);
  });
}

function splitParsedTextLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return [];

  if (trimmed.includes("\t")) return trimmed.split(/\t+/).map((value) => value.trim()).filter(Boolean);
  return trimmed.split(/\s{2,}/).map((value) => value.trim()).filter(Boolean);
}

function rowsFromParsedText(results: OcrSpaceParsedResult[]) {
  const lines = results
    .flatMap((result) => (result.ParsedText ?? "").split(/\r?\n/))
    .map((line) => line.trim())
    .filter(Boolean);

  const firstDataIndex = lines.findIndex((line) => HEADER_HINTS.some((hint) => line.toLowerCase().includes(hint)));
  const candidates = lines.slice(firstDataIndex === -1 ? 0 : firstDataIndex + 1);

  return candidates
    .map(splitParsedTextLine)
    .filter((parts) => parts.length >= 2 && parts.some(isUsefulDataText))
    .map((parts, index) => {
      const values = parts.length > FIELD_KEYS.length
        ? [...parts.slice(0, FIELD_KEYS.length - 1), parts.slice(FIELD_KEYS.length - 1).join(" ")]
        : parts;
      return rowFromValues(values, index + 1);
    });
}

function toExtractedRows(payload: OcrSpaceResponse) {
  const results = payload.ParsedResults ?? [];
  const overlayRows = rowsFromOverlay(results);
  return overlayRows.length ? overlayRows : rowsFromParsedText(results);
}

export function createOcrSpaceDocumentProvider(): DocumentExtractionProvider {
  return {
    name: "OCR.Space OCR Provider",
    kind: "ocr",
    async extract(input) {
      const key = process.env.OCR_SPACE_API_KEY || process.env.OCR_PROVIDER_API_KEY;
      if (!key) throw new Error("OCR.Space API key is not configured.");
      if (!input.file) throw new Error("The uploaded file bytes were not provided to the extraction provider.");

      const body = new FormData();
      body.set("apikey", key);
      body.set("language", process.env.OCR_SPACE_LANGUAGE || "eng");
      body.set("OCREngine", process.env.OCR_SPACE_ENGINE || "2");
      body.set("isOverlayRequired", "true");
      body.set("isTable", "true");
      body.set("scale", "true");
      const fileBytes = new Uint8Array(input.file.bytes.byteLength);
      fileBytes.set(input.file.bytes);
      body.set("file", new Blob([fileBytes.buffer], { type: input.file.mimeType }), input.file.filename);

      const response = await fetch(OCR_SPACE_ENDPOINT, {
        method: "POST",
        body
      });

      const json = await response.json() as OcrSpaceResponse;
      if (!response.ok || json.IsErroredOnProcessing) {
        throw new Error(`OCR.Space extraction failed: ${ocrSpaceError(json, response.statusText)}`);
      }

      const rows = toExtractedRows(json);
      if (!rows.length) {
        throw new Error("OCR.Space extraction returned text, but no table rows could be detected.");
      }

      return rows;
    }
  };
}
