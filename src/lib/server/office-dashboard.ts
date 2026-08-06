import "server-only";

import { createClient } from "@supabase/supabase-js";

export type OfficeBookingSummary = {
  id: string;
  bookingCode: string | null;
  customerName: string;
  startTime: string;
  endTime: string;
  status: string;
  totalPrice: number;
  depositPaid: boolean;
  services: string[];
};

export type OfficeAuditSummary = {
  id: string;
  action: string;
  actorType: string;
  entityType: string | null;
  createdAt: string;
};

type BookingRow = {
  id: string;
  booking_code: string | null;
  start_time: string;
  end_time: string;
  status: string;
  total_price: number | string | null;
  deposit_paid: boolean | null;
  customers: { name?: string } | Array<{ name?: string }> | null;
  booking_services: Array<{ service_name?: string }> | null;
};

type AuditRow = {
  id: string;
  action: string;
  actor_type: string;
  entity_type: string | null;
  created_at: string;
};

function bangkokDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export async function getOfficeDashboardData() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Office data source is not configured");

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const date = bangkokDate(new Date());
  const start = new Date(`${date}T00:00:00+07:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const [bookingsResult, pendingDepositResult, humanChatsResult, auditResult] = await Promise.all([
    admin
      .from("bookings")
      .select("id,booking_code,start_time,end_time,status,total_price,deposit_paid,customers(name),booking_services(service_name)")
      .gte("start_time", start.toISOString())
      .lt("start_time", end.toISOString())
      .order("start_time", { ascending: true }),
    admin
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "confirmed"])
      .eq("deposit_paid", false),
    admin
      .from("chat_sessions")
      .select("id", { count: "exact", head: true })
      .eq("status", "human"),
    admin
      .from("audit_logs")
      .select("id,action,actor_type,entity_type,created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const warnings = [
    bookingsResult.error,
    pendingDepositResult.error,
    humanChatsResult.error,
    auditResult.error,
  ].filter(Boolean);

  if (warnings.length > 0) {
    console.error("[OFFICE_DASHBOARD_PARTIAL_DATA]", {
      codes: warnings.map((warning) => warning?.code),
    });
  }

  const bookings = ((bookingsResult.data || []) as unknown as BookingRow[]).map((booking) => {
    const customer = Array.isArray(booking.customers) ? booking.customers[0] : booking.customers;
    return {
      id: booking.id,
      bookingCode: booking.booking_code,
      customerName: customer?.name?.trim() || "ไม่ระบุชื่อลูกค้า",
      startTime: booking.start_time,
      endTime: booking.end_time,
      status: booking.status,
      totalPrice: Number(booking.total_price) || 0,
      depositPaid: Boolean(booking.deposit_paid),
      services: (booking.booking_services || [])
        .map((service) => service.service_name?.trim())
        .filter((service): service is string => Boolean(service)),
    } satisfies OfficeBookingSummary;
  });

  const audits = ((auditResult.data || []) as AuditRow[]).map((audit) => ({
    id: audit.id,
    action: audit.action,
    actorType: audit.actor_type,
    entityType: audit.entity_type,
    createdAt: audit.created_at,
  } satisfies OfficeAuditSummary));

  return {
    date,
    bookings,
    estimatedRevenue: bookings
      .filter((booking) => booking.status !== "cancelled")
      .reduce((sum, booking) => sum + booking.totalPrice, 0),
    pendingDepositCount: pendingDepositResult.count || 0,
    humanChatCount: humanChatsResult.count || 0,
    audits,
    hasPartialData: warnings.length > 0,
  };
}
