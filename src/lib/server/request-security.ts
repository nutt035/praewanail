import "server-only";

import type { NextRequest } from "next/server";

type RateEntry = { count: number; resetAt: number };

const rateEntries = new Map<string, RateEntry>();

export function requestIp(request: Request): string {
  return request.headers.get("cf-connecting-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
}

export function hasSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    const originHost = new URL(origin).host.toLowerCase();
    const forwardedHost = request.headers.get("x-forwarded-host")
      ?.split(",")[0]
      ?.trim()
      .toLowerCase();
    const requestHost = request.headers.get("host")?.toLowerCase();
    const configuredHost = process.env.NEXT_PUBLIC_SITE_URL
      ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host.toLowerCase()
      : null;

    return request.headers.get("sec-fetch-site") === "same-origin" || [
      forwardedHost,
      requestHost,
      request.nextUrl.host.toLowerCase(),
      configuredHost,
    ].some((host) => Boolean(host) && host === originHost);
  } catch {
    return false;
  }
}

export function takeRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const key = `${scope}:${requestIp(request)}`;
  const current = rateEntries.get(key);

  if (!current || current.resetAt <= now) {
    rateEntries.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}
