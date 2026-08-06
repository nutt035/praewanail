import "server-only";

export type SlipOkConfig = {
  branchId: string;
  apiKey: string;
  source: "environment" | "database-fallback";
};

type SlipOkFallbackSettings = {
  slipok_branch_id?: unknown;
  slipok_api_key?: unknown;
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function resolveSlipOkConfig(
  fallback?: SlipOkFallbackSettings,
): SlipOkConfig | null {
  const environmentBranchId = clean(process.env.SLIPOK_BRANCH_ID);
  const environmentApiKey = clean(process.env.SLIPOK_API_KEY);
  const fallbackBranchId = clean(fallback?.slipok_branch_id);
  const fallbackApiKey = clean(fallback?.slipok_api_key);

  const branchId = environmentBranchId || fallbackBranchId;
  const apiKey = environmentApiKey || fallbackApiKey;
  if (!branchId || !apiKey) return null;

  const usedDatabaseFallback = !environmentBranchId || !environmentApiKey;
  if (usedDatabaseFallback) {
    console.warn("[SLIPOK_CONFIG_DATABASE_FALLBACK]");
  }

  return {
    branchId,
    apiKey,
    source: usedDatabaseFallback ? "database-fallback" : "environment",
  };
}
