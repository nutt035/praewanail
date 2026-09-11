import "server-only";
import { clean } from "./config-utils";

export type LineConfig = {
  accessToken: string;
  adminUserIds: string;
  source: "environment" | "database-fallback";
};

type LineFallbackSettings = {
  line_channel_token?: unknown;
  admin_line_uid?: unknown;
};

export function resolveLineConfig(fallback?: LineFallbackSettings): LineConfig | null {
  const environmentToken = clean(process.env.LINE_CHANNEL_ACCESS_TOKEN);
  const environmentAdminUserIds = clean(process.env.LINE_ADMIN_USER_IDS);
  const fallbackToken = clean(fallback?.line_channel_token);
  const fallbackAdminUserIds = clean(fallback?.admin_line_uid);

  const accessToken = environmentToken || fallbackToken;
  if (!accessToken) return null;

  const usedDatabaseFallback = !environmentToken || (!environmentAdminUserIds && fallbackAdminUserIds);
  if (usedDatabaseFallback) {
    console.warn("[LINE_CONFIG_DATABASE_FALLBACK]");
  }

  return {
    accessToken,
    adminUserIds: environmentAdminUserIds || fallbackAdminUserIds,
    source: environmentToken ? "environment" : "database-fallback",
  };
}
