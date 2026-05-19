# Country Stock Sheet Digitizer

A production-ready Next.js app for turning scanned handwritten country stock/control forms into validated spreadsheet data, comparing the corrected rows against a master CSV, and exporting updated and exception CSV files.

## Stack

- Next.js App Router, React, TypeScript
- Tailwind CSS
- Supabase Postgres and Supabase Storage
- PapaParse for CSV parsing/export
- Secure API routes for upload, OCR extraction, correction saves, comparison, and signed downloads
- Real-file OCR provider support, isolated for replacement in `lib/icr/extractDocument.ts`

## Local Setup

1. Install dependencies:

```bash
npm install
```

On Windows PowerShell with script policy restrictions, use:

```bash
npm.cmd install
```

2. Create `.env.local`:

```bash
cp .env.example .env.local
```

Set:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OCR_PROVIDER=ocrspace
OCR_PROVIDER_API_KEY=
OCR_SPACE_LANGUAGE=eng
OCR_SPACE_ENGINE=2
ALLOW_MOCK_EXTRACTION=false
```

Set `OCR_PROVIDER_API_KEY` to your OCR.Space API key. The app uses OCR.Space by default and runs one OCR pass against the actual uploaded file.

To use OpenAI vision instead, set `OCR_PROVIDER=openai`, set `OCR_PROVIDER_API_KEY` to an OpenAI API key, and optionally set `OCR_PROVIDER_MODEL`.

Mock extraction is now opt-in only. Set `ALLOW_MOCK_EXTRACTION=true` for local workflow testing without a real provider.

3. Configure Supabase:

- Create a Supabase project.
- Open the SQL editor.
- Run `supabase/migrations/001_initial_schema.sql`.
- Confirm these private storage buckets exist:
  - `original-documents`
  - `generated-csv`
  - `master-csv`

The API also attempts to create missing buckets with the service role key at runtime. If uploads show `Bucket not found`, run the migration again or create the buckets manually in Supabase Storage.

4. Start the app:

```bash
npm run dev
```

PowerShell alternative:

```bash
npm.cmd run dev
```

Open `http://localhost:3000`.

## Workflow Test

1. Open the dashboard.
2. Click `New document`.
3. Enter a country name and optional description.
4. Upload a JPG, PNG, PDF, or HEIC scanned form.
5. The app stores the file in `original-documents/{documentId}/original-file.ext`.
6. The app downloads the uploaded file from Supabase Storage and sends the actual PDF/image to the configured OCR provider before validation.
7. On the review screen, edit highlighted cells and mark uncertain fields reviewed.
8. Click `Save Corrected Data`.
9. Upload a master CSV on the compare page.
10. Click `Compare and generate files`.
11. Download:
    - corrected extracted CSV
    - updated master CSV
    - exception CSV

## Required CSV Headers

Generated CSV files preserve these exact headers:

```csv
Date,Ref. no,Batch no,Expiry date,Issued to or received from,Quantity received,Quantity issued,Losses and adjustments,Balance,Remarks,Name and signature
```

Master CSV upload supports exact headers plus flexible aliases such as `Ref no`, `Reference number`, `Batch number`, `Expiry`, `Issued to`, `Received from`, `Qty received`, `Qty issued`, `Losses`, `Adjustments`, `Name`, and `Signature`.

## OCR Provider Replacement

For the current phase, the app uses one OCR/vision extraction pass against the real uploaded file. The extraction boundary is intentionally small:

- `lib/icr/extractDocument.ts`
- `lib/icr/provider.ts`
- `lib/icr/mockOcrProvider.ts`
- `lib/ocr/normalizeExtractedRows.ts`
- `lib/ocr/validateExtractedRows.ts`
- `lib/ocr/confidenceRules.ts`

The default production adapter in `lib/icr/ocrSpaceDocumentProvider.ts` sends the actual uploaded PDF/image bytes to OCR.Space and converts returned table/overlay text into the app's extracted row format. OCR.Space does not provide semantic per-field certainty, so extracted cells are intentionally marked for review.

An optional OpenAI adapter remains available in `lib/icr/openAiDocumentProvider.ts`. Set `OCR_PROVIDER=openai` to use it with an OpenAI API key.


You can replace `getConfiguredOcrProvider` in `lib/icr/extractDocument.ts` with another production OCR adapter. Keep each provider return value as `ExtractedRow[]`:

```ts
type ExtractedCell = {
  value: string;
  confidence: number;
  isUncertain: boolean;
  reason?: string;
};
```

The validation layer will continue marking uncertain cells when dates are invalid, numeric values contain invalid characters, required fields are missing, or confidence is below thresholds.

## Supabase Security

The frontend only receives the Supabase anon key. All writes, storage uploads, storage signed URLs, extraction, and CSV processing happen through Next.js API routes using `SUPABASE_SERVICE_ROLE_KEY`.

The migration enables RLS and intentionally does not add broad public policies for v1.

## Vercel Deployment

1. Push this repository to GitHub.
2. Import the GitHub repository in Vercel.
3. Add the environment variables from `.env.example` in Vercel project settings.
4. Deploy.
5. Confirm the Supabase migration has been run before using the deployed app.

See `docs/deployment-checklist.md` for the full production checklist and smoke test.

After deployment, verify configuration with:

```text
https://your-vercel-domain/api/health
```

## GitHub Setup

```bash
git add .
git commit -m "Build country stock sheet digitizer"
git branch -M main
git remote add origin https://github.com/YOUR-ORG/YOUR-REPO.git
git push -u origin main
```

You can also use GitHub Desktop: add the local repository, commit all generated files, then publish.

## Sample CSV Files

Use `samples/master.csv` to test a normal comparison. Use `samples/alternate-header-master.csv` to test flexible master CSV header mapping.
