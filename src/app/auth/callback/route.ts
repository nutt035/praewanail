import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function publicUrl(path: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL;
  if (!siteUrl) {
    throw new Error("Public site URL is not configured");
  }
  return new URL(path, siteUrl);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(publicUrl("/login?error=missing_code"));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const signedInEmail = data.user?.email?.toLowerCase();

  if (error || !ownerEmail || signedInEmail !== ownerEmail) {
    await supabase.auth.signOut();
    return NextResponse.redirect(publicUrl("/login?error=unauthorized"));
  }

  return NextResponse.redirect(publicUrl("/admin"));
}
