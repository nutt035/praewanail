import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function hasOwnerSession(): Promise<boolean> {
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (!ownerEmail) return false;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return !error && user?.email?.trim().toLowerCase() === ownerEmail;
}
