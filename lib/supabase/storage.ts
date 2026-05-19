import type { SupabaseClient } from "@supabase/supabase-js";

export const REQUIRED_STORAGE_BUCKETS = [
  "original-documents",
  "generated-csv",
  "master-csv"
] as const;

export type RequiredStorageBucket = (typeof REQUIRED_STORAGE_BUCKETS)[number];

export async function ensureStorageBucket(supabase: SupabaseClient, bucket: RequiredStorageBucket) {
  const { data: existing, error: getError } = await supabase.storage.getBucket(bucket);
  if (existing && !getError) return;

  const { error: createError } = await supabase.storage.createBucket(bucket, {
    public: false,
    fileSizeLimit: bucket === "original-documents" ? "25MB" : "10MB"
  });

  if (createError && !/already exists/i.test(createError.message)) {
    throw createError;
  }
}

export async function ensureRequiredStorageBuckets(supabase: SupabaseClient) {
  for (const bucket of REQUIRED_STORAGE_BUCKETS) {
    await ensureStorageBucket(supabase, bucket);
  }
}

export async function getStorageBucketStatus(supabase: SupabaseClient) {
  const results = await Promise.all(
    REQUIRED_STORAGE_BUCKETS.map(async (bucket) => {
      const { data, error } = await supabase.storage.getBucket(bucket);
      return {
        bucket,
        ok: Boolean(data && !error),
        message: error?.message
      };
    })
  );

  return {
    ok: results.every((result) => result.ok),
    buckets: results
  };
}
