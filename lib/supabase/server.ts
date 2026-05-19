import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { assertServerEnv } from "@/lib/env/server";

export function createServiceClient() {
  assertServerEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return createSupabaseClient(url!, serviceKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export async function createAuditLog(documentId: string, action: string, details?: Record<string, unknown>) {
  const supabase = createServiceClient();
  await supabase.from("audit_logs").insert({
    document_id: documentId,
    action,
    details: details ?? {}
  });
}
