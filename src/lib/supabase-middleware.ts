import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export async function refreshOwnerSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: {
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: SESSION_MAX_AGE_SECONDS,
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const isOwner = Boolean(
    ownerEmail && user?.email && user.email.toLowerCase() === ownerEmail,
  );

  return { response, isOwner };
}

export function copySessionCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
  return to;
}
