import { NextResponse } from "next/server";
import { getServerEnvStatus } from "@/lib/env/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getStorageBucketStatus } from "@/lib/supabase/storage";

export async function GET() {
  const env = getServerEnvStatus();

  if (!env.ok) {
    return NextResponse.json(
      {
        ok: false,
        service: "country-stock-sheet-digitizer",
        environment: env,
        database: { ok: false, message: "Skipped because required environment variables are missing." }
      },
      { status: 503 }
    );
  }

  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("documents").select("id", { count: "exact", head: true });
    if (error) throw error;
    const storage = await getStorageBucketStatus(supabase);

    return NextResponse.json({
      ok: storage.ok,
      service: "country-stock-sheet-digitizer",
      environment: env,
      database: { ok: true },
      storage
    }, { status: storage.ok ? 200 : 503 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        service: "country-stock-sheet-digitizer",
        environment: env,
        database: {
          ok: false,
          message: error instanceof Error ? error.message : "Unable to reach Supabase."
        },
        storage: { ok: false, buckets: [] }
      },
      { status: 503 }
    );
  }
}
