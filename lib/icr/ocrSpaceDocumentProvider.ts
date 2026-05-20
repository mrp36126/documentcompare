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
const EMPTY_CELL_CONFIDENCE = 0.99;

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

const HEADER_ALIASES: Record<FieldKey, string[]> = {
  date: ["date"],
  refNo: ["ref", "ref no", "reference"],
  batchNo: ["batch", "batch no"],
  expiryDate: ["expiry", "expiry date"],
  issuedToOrReceivedFrom: ["issued to or received from", "issued to", "received from"],
  quantityReceived: ["quantity received", "qty received"],
  quantityIssued: ["quantity issued", "qty issued"],
  lossesAndAdjustments: ["losses", "adjustments"],
  balance: ["balance"],
  remarks: ["remarks"],
  nameAndSignature: ["signature", "name"]
};

const STOCK_SHEET_COLUMN_RATIOS = [
  0,
  0.065,
  0.158,
  0.248,
  0.321,
  0.474,
  0.532,
  0.591,
  0.662,
  0.721,
  0.864,
  1
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
  if (!trimmed) {
    return {
      value: "",
      confidence: EMPTY_CELL_CONFIDENCE,
      isUncertain: false
    };
  }

  return {
    value: trimmed,
    confidence,
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

  const headerBounds = estimateColumnBoundsFromHeaders(lines);
  if (headerBounds) return headerBounds;

  return estimateStockSheetColumnBounds(allWords);
}

function estimateColumnBoundsFromHeaders(lines: OcrSpaceLine[]) {
  const headerWords = lines
    .filter(isHeaderLine)
    .flatMap(wordsFromLine)
    .sort((a, b) => a.left - b.left);

  if (headerWords.length < 2) return null;

  const centers = FIELD_KEYS.map((key) => findHeaderCenter(key, headerWords));
  if (centers.filter((center): center is number => typeof center === "number").length < 5) {
    return null;
  }

  const allWords = lines.flatMap(wordsFromLine);
  const minLeft = Math.min(...allWords.map((word) => word.left));
  const maxRight = Math.max(...allWords.map((word) => word.right));
  const resolvedCenters = interpolateCenters(centers, minLeft, maxRight);

  return resolvedCenters.map((center, index) => {
    const previous = resolvedCenters[index - 1];
    const next = resolvedCenters[index + 1];
    return {
      left: index === 0 ? minLeft : (previous + center) / 2,
      right: index === resolvedCenters.length - 1 ? maxRight : (center + next) / 2
    };
  });
}

function estimateStockSheetColumnBounds(words: PositionedWord[]) {
  const minLeft = Math.min(...words.map((word) => word.left));
  const maxRight = Math.max(...words.map((word) => word.right));
  const width = Math.max(maxRight - minLeft, FIELD_KEYS.length);

  return FIELD_KEYS.map((_, index) => ({
    left: minLeft + width * STOCK_SHEET_COLUMN_RATIOS[index],
    right: minLeft + width * STOCK_SHEET_COLUMN_RATIOS[index + 1]
  }));
}

function findHeaderCenter(key: FieldKey, words: PositionedWord[]) {
  const aliases = HEADER_ALIASES[key];
  const normalizedWords = words.map((word) => ({
    ...word,
    normalized: normalizeHeaderToken(word.text)
  }));

  for (const alias of aliases) {
    const aliasParts = alias.split(" ").map(normalizeHeaderToken);
    for (let index = 0; index <= normalizedWords.length - aliasParts.length; index += 1) {
      const phrase = normalizedWords.slice(index, index + aliasParts.length);
      if (phrase.every((word, partIndex) => word.normalized.includes(aliasParts[partIndex]))) {
        const left = Math.min(...phrase.map((word) => word.left));
        const right = Math.max(...phrase.map((word) => word.right));
        return (left + right) / 2;
      }
    }
  }

  return undefined;
}

function normalizeHeaderToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function interpolateCenters(
  centers: Array<number | undefined>,
  minLeft: number,
  maxRight: number
) {
  const fallbackWidth = Math.max(maxRight - minLeft, FIELD_KEYS.length);
  const evenCenters = FIELD_KEYS.map((_, index) => minLeft + (fallbackWidth * (index + 0.5)) / FIELD_KEYS.length);
  const resolved = centers.map((center, index) => center ?? evenCenters[index]);

  for (let index = 1; index < resolved.length; index += 1) {
    if (resolved[index] <= resolved[index - 1]) {
      resolved[index] = resolved[index - 1] + 1;
    }
  }

  return resolved;
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

  if (line.includes("\t")) return line.split(/\t/).map((value) => value.trim());
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
