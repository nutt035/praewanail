import { NextRequest, NextResponse } from 'next/server';
import { copySessionCookies, refreshOwnerSession } from '@/lib/supabase-middleware';

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const { response, isOwner } = await refreshOwnerSession(request);
  const legacyAuthEnabled = process.env.LEGACY_ADMIN_AUTH_ENABLED === 'true';
  const hasLegacySession = Boolean(request.cookies.get('admin_token')?.value);
  const hasAdminAccess = isOwner || (legacyAuthEnabled && hasLegacySession);

  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/office')) {
    if (!hasAdminAccess) {
      return copySessionCookies(
        response,
        NextResponse.redirect(new URL('/login', request.url)),
      );
    }
  }

  const isOwnerSetup = url.searchParams.get('setup') === 'owner';
  if (url.pathname === '/login' && hasAdminAccess && !isOwnerSetup) {
    return copySessionCookies(
      response,
      NextResponse.redirect(new URL('/admin', request.url)),
    );
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/office/:path*', '/login'],
};
