const REQUIRED_SERVER_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY"
] as const;

export type ServerEnvStatus = {
  ok: boolean;
  missing: string[];
  hasIcrProviderKey: boolean;
  hasLegacyOcrProviderKey: boolean;
};

export function getServerEnvStatus(): ServerEnvStatus {
  const missing = REQUIRED_SERVER_ENV.filter((key) => !process.env[key]);
  return {
    ok: missing.length === 0,
    missing,
    hasIcrProviderKey: Boolean(process.env.ICR_PROVIDER_API_KEY),
    hasLegacyOcrProviderKey: Boolean(process.env.OCR_PROVIDER_API_KEY)
  };
}

export function assertServerEnv() {
  const status = getServerEnvStatus();
  if (!status.ok) {
    throw new Error(`Missing required environment variables: ${status.missing.join(", ")}`);
  }
}
