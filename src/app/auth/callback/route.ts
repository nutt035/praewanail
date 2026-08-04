import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const safeRedirect = new URL("/admin", request.url);

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const signedInEmail = data.user?.email?.toLowerCase();

  if (error || !ownerEmail || signedInEmail !== ownerEmail) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url));
  }

  return NextResponse.redirect(safeRedirect);
}
