import { NextResponse } from "next/server";
import { getServerEnvStatus } from "@/lib/env/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getStorageBucketStatus } from "@/lib/supabase/storage";
import { errorMessage } from "@/lib/errors";

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
    const requiredTables = ["documents", "extracted_rows", "comparison_results", "audit_logs"];
    const tables = await Promise.all(
      requiredTables.map(async (table) => {
        const { error } = await supabase.from(table).select("id", { count: "exact", head: true });
        return {
          table,
          ok: !error,
          message: error ? errorMessage(error) : undefined
        };
      })
    );
    const database = {
      ok: tables.every((table) => table.ok),
      tables
    };
    const storage = await getStorageBucketStatus(supabase);

    return NextResponse.json({
      ok: database.ok && storage.ok,
      service: "country-stock-sheet-digitizer",
      environment: env,
      database,
      storage
    }, { status: database.ok && storage.ok ? 200 : 503 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        service: "country-stock-sheet-digitizer",
        environment: env,
        database: {
          ok: false,
          message: errorMessage(error, "Unable to reach Supabase.")
        },
        storage: { ok: false, buckets: [] }
      },
      { status: 503 }
    );
  }
}
