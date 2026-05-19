import type { DocumentExtractionProvider } from "@/lib/icr/provider";
import { FIELD_KEYS, type ExtractedRow, type FieldKey } from "@/lib/types";
import { errorMessage } from "@/lib/errors";

type OpenAiMode = "icr" | "ocr";

type OpenAiExtractionResponse = {
  rows: Array<{
    rowIndex: number;
  } & Record<FieldKey, {
    value: string;
    confidence: number;
    isUncertain: boolean;
    reason: string;
  }>>;
};

const CELL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["value", "confidence", "isUncertain", "reason"],
  properties: {
    value: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    isUncertain: { type: "boolean" },
    reason: { type: "string" }
  }
};

const ROW_PROPERTIES = Object.fromEntries(
  FIELD_KEYS.map((key) => [key, CELL_SCHEMA])
);

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["rows"],
  properties: {
    rows: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["rowIndex", ...FIELD_KEYS],
        properties: {
          rowIndex: { type: "integer", minimum: 1 },
          ...ROW_PROPERTIES
        }
      }
    }
  }
};

function apiKeyFor(mode: OpenAiMode) {
  if (mode === "icr") return process.env.ICR_PROVIDER_API_KEY || process.env.OCR_PROVIDER_API_KEY;
  return process.env.OCR_PROVIDER_API_KEY;
}

function modelFor(mode: OpenAiMode) {
  if (mode === "icr") return process.env.ICR_PROVIDER_MODEL || process.env.EXTRACTION_MODEL || "gpt-4o";
  return process.env.OCR_PROVIDER_MODEL || process.env.EXTRACTION_MODEL || "gpt-4o";
}

function promptFor(mode: OpenAiMode) {
  const focus =
    mode === "icr"
      ? "Use intelligent character recognition for handwritten table entries. Prioritize handwriting interpretation and mark unclear handwriting as uncertain."
      : "Use OCR-style visual reading on the uploaded form. Focus on the visible table, printed headers, numerals, dates, and handwritten entries. Mark unclear handwritten values as uncertain.";

  return `${focus}

Extract the stock/control table from the uploaded country form. Preserve the row order from top to bottom.

The form headers are exactly:
Date
Ref. no
Batch no
Expiry date
Issued to or received from
Quantity received
Quantity issued
Losses and adjustments
Balance
Remarks
Name and signature

Return only rows that are visible in the document table. Do not invent rows. Do not use example or dummy values.

For every cell:
- value: the best reading, or empty string if unreadable
- confidence: 0 to 1
- isUncertain: true when handwriting is unclear, confidence is low, value is partial, required data is missing, dates/numbers look invalid, or multiple readings are possible
- reason: short explanation, or empty string if the reading is clear

For numeric fields, do not convert the letter O to zero unless the visual evidence is strong.`;
}

function fileContent(input: Parameters<DocumentExtractionProvider["extract"]>[0]) {
  if (!input.file) {
    throw new Error("The uploaded file bytes were not provided to the extraction provider.");
  }

  const base64 = input.file.bytes.toString("base64");
  if (input.file.mimeType === "application/pdf") {
    return {
      type: "input_file",
      filename: input.file.filename,
      file_data: `data:application/pdf;base64,${base64}`
    };
  }

  return {
    type: "input_image",
    detail: "high",
    image_url: `data:${input.file.mimeType};base64,${base64}`
  };
}

function extractOutputText(response: unknown) {
  if (!response || typeof response !== "object") return "";
  const outputText = (response as { output_text?: unknown }).output_text;
  if (typeof outputText === "string") return outputText;

  const output = (response as { output?: unknown }).output;
  if (!Array.isArray(output)) return "";

  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string") return text;
    }
  }

  return "";
}

function toExtractedRows(payload: OpenAiExtractionResponse): ExtractedRow[] {
  return payload.rows.map((row) => {
    const extracted = { rowIndex: row.rowIndex } as ExtractedRow;
    for (const key of FIELD_KEYS) {
      const cell = row[key];
      extracted[key] = {
        value: cell.value ?? "",
        confidence: Number(cell.confidence ?? 0),
        isUncertain: Boolean(cell.isUncertain),
        reason: cell.reason || undefined
      };
    }
    return extracted;
  });
}

export function createOpenAiDocumentProvider(mode: OpenAiMode): DocumentExtractionProvider {
  return {
    name: mode === "icr" ? "OpenAI Vision ICR Provider" : "OpenAI Vision OCR Provider",
    kind: mode === "icr" ? "vision-ai" : "ocr",
    async extract(input) {
      const key = apiKeyFor(mode);
      if (!key) throw new Error(`${mode.toUpperCase()} provider API key is not configured.`);

      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: modelFor(mode),
          input: [
            {
              role: "user",
              content: [
                fileContent(input),
                {
                  type: "input_text",
                  text: promptFor(mode)
                }
              ]
            }
          ],
          text: {
            format: {
              type: "json_schema",
              name: "country_stock_sheet_extraction",
              strict: true,
              schema: RESPONSE_SCHEMA
            }
          }
        })
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(`OpenAI extraction failed: ${errorMessage(json, response.statusText)}`);
      }

      const outputText = extractOutputText(json);
      if (!outputText) throw new Error("OpenAI extraction returned no structured output text.");

      try {
        return toExtractedRows(JSON.parse(outputText) as OpenAiExtractionResponse);
      } catch (error) {
        throw new Error(`OpenAI extraction returned invalid JSON: ${errorMessage(error)}`);
      }
    }
  };
}
