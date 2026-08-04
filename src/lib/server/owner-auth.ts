import "server-only";

import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function getOwnerUser(): Promise<User | null> {
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (!ownerEmail) return null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return !error && user?.email?.trim().toLowerCase() === ownerEmail ? user : null;
}

export async function hasOwnerSession(): Promise<boolean> {
  return Boolean(await getOwnerUser());
}
