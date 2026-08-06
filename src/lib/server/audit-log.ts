import "server-only";

import { isIP } from "net";
import { createClient } from "@supabase/supabase-js";

type AuditActorType = "owner" | "staff" | "agent" | "system" | "customer";

export type AuditLogInput = {
  action: string;
  actorType: AuditActorType;
  actorUserId?: string | null;
  actorEmail?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  beforeData?: unknown;
  afterData?: unknown;
  metadata?: Record<string, unknown>;
  request?: Request;
};

function requestIp(request?: Request): string | null {
  if (!request) return null;

  const candidate = request.headers.get("cf-connecting-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || null;

  return candidate && isIP(candidate) ? candidate : null;
}

export async function writeAuditLog(input: AuditLogInput): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error("[AUDIT_LOG_NOT_CONFIGURED]");
    return false;
  }

  try {
    const admin = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await admin.from("audit_logs").insert({
      action: input.action,
      actor_type: input.actorType,
      actor_user_id: input.actorUserId || null,
      actor_email: input.actorEmail || null,
      entity_type: input.entityType || null,
      entity_id: input.entityId || null,
      before_data: input.beforeData ?? null,
      after_data: input.afterData ?? null,
      metadata: input.metadata || {},
      ip_address: requestIp(input.request),
      user_agent: input.request?.headers.get("user-agent")?.slice(0, 500) || null,
    });

    if (error) {
      console.error("[AUDIT_LOG_WRITE_FAILED]", { code: error.code });
      return false;
    }

    return true;
  } catch (error: unknown) {
    console.error("[AUDIT_LOG_WRITE_ERROR]", {
      error: error instanceof Error ? error.message : "Unknown audit error",
    });
    return false;
  }
}
