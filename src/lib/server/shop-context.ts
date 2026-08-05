import "server-only";

import { DEFAULT_SETTINGS, settingsToMap, type Service, type ShopSettings } from "@/lib/types";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";

export const REVIEWED_SHOP_SETTING_KEYS = [
  "weekday_open_time",
  "weekday_close_time",
  "weekend_open_time",
  "weekend_close_time",
  "deposit_amount",
  "booking_policy",
  "cancellation_policy",
  "walk_in_policy",
  "repair_policy",
] as const;

export async function getSharedShopSettings() {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("shop_settings")
    .select("key,value")
    .in("key", [...REVIEWED_SHOP_SETTING_KEYS]);

  if (error) throw new Error(`Could not load shared shop settings: ${error.code}`);
  return {
    ...DEFAULT_SETTINGS,
    ...settingsToMap((data || []) as ShopSettings[]),
  };
}

export async function getSharedShopContext() {
  const admin = createSupabaseAdminClient();
  const [settings, { data: servicesData, error: servicesError }] = await Promise.all([
    getSharedShopSettings(),
    admin.from("services").select("id,name,price,price_per_finger,unit_name,duration,category").order("category").order("name"),
  ]);

  if (servicesError) throw new Error(`Could not load shared services: ${servicesError.code}`);

  return {
    settings,
    services: (servicesData || []) as Pick<Service, "id" | "name" | "price" | "price_per_finger" | "unit_name" | "duration" | "category">[],
  };
}
