# Deployment Checklist

Use this after creating the Vercel project.

## 1. Supabase

1. Open the Supabase project.
2. Go to SQL Editor.
3. Run `supabase/migrations/001_initial_schema.sql`.
4. Go to Storage and confirm these private buckets exist:
   - `original-documents`
   - `generated-csv`
   - `master-csv`
5. Go to Project Settings, API, and copy:
   - Project URL
   - anon public key
   - service_role key

## 2. Vercel Environment Variables

In Vercel, open the project, then Settings, Environment Variables.

Add these to Production, Preview, and Development unless you intentionally want separate Supabase projects:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
ICR_PROVIDER_API_KEY=
ICR_PROVIDER_MODEL=gpt-4o
OCR_PROVIDER_API_KEY=
OCR_PROVIDER_MODEL=gpt-4o
ALLOW_MOCK_EXTRACTION=false
```

Set `ICR_PROVIDER_API_KEY` for real extraction from uploaded files. Set `OCR_PROVIDER_API_KEY` only if using a separate fallback key. Keep `ALLOW_MOCK_EXTRACTION=false` in production.

## 3. Deploy

If the repository is linked to Vercel, push to GitHub and Vercel will deploy.

For a manual local deploy:

```bash
npm install
npm run build
npx vercel --prod
```

On Windows PowerShell with script execution restrictions, use `npm.cmd`.

## 4. Smoke Test

After deployment, open:

```text
https://your-vercel-domain/api/health
```

Expected success:

```json
{
  "ok": true,
  "database": {
    "ok": true
  }
}
```

Then test the product workflow:

1. Open the app home page.
2. Upload any JPG, PNG, or PDF test file.
3. Review the mock extracted rows.
4. Mark uncertain cells reviewed.
5. Save corrected data.
6. Upload `samples/master.csv`.
7. Run comparison.
8. Download the corrected, updated, and exception CSV files.

## 5. Common Deployment Issues

- `Missing required environment variables`: add all required env vars in Vercel and redeploy.
- `relation "documents" does not exist`: run the Supabase SQL migration.
- `Bucket not found` or storage upload errors: run the Supabase migration again, or create private buckets named `original-documents`, `generated-csv`, and `master-csv` in Supabase Storage. The API will also try to create missing buckets when the service role key has permission.
- Download link errors: confirm `SUPABASE_SERVICE_ROLE_KEY` is set on Vercel.
- Build succeeds but app errors on dashboard: check `/api/health` first.
