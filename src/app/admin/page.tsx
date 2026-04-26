"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Booking, InventoryItem, Transaction } from "@/lib/types";
import { TrendingUp, CalendarCheck, PackageSearch, ArrowRight, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

// ฟังก์ชันคำนวณ start/end ของวันนี้ (UTC)
function getTodayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

// ฟอร์แมตเงินบาท
function formatBaht(amount: number) {
  return `฿${amount.toLocaleString("th-TH", { minimumFractionDigits: 0 })}`;
}

// ฟอร์แมตเวลา
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

const statusConfig = {
  pending: { label: "รอยืนยัน", class: "badge-pending", icon: Clock },
  confirmed: { label: "ยืนยันแล้ว", class: "badge-confirmed", icon: CheckCircle2 },
  completed: { label: "เสร็จแล้ว", class: "badge-completed", icon: CheckCircle2 },
  cancelled: { label: "ยกเลิก", class: "badge-cancelled", icon: XCircle },
};

export default function AdminDashboard() {
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [todayIncome, setTodayIncome] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    const { start, end } = getTodayRange();

    // ดึงคิววันนี้ พร้อม join customers + services
    const { data: bookings } = await supabase
      .from("bookings")
      .select("*, customers(name, phone), services(name, price, duration)")
      .gte("start_time", start)
      .lt("start_time", end)
      .neq("status", "cancelled")
      .order("start_time", { ascending: true });

    // ดึงรายรับวันนี้ (income transactions)
    const { data: transactions } = await supabase
      .from("transactions")
      .select("amount")
      .eq("type", "income")
      .gte("created_at", start)
      .lt("created_at", end);

    // ดึงสินค้าใกล้หมด
    const { data: inventory } = await supabase
      .from("inventory")
      .select("id, quantity, min_threshold");

    setTodayBookings((bookings as Booking[]) || []);
    setTodayIncome(
      ((transactions as Transaction[]) || []).reduce((sum, t) => sum + t.amount, 0)
    );
    setLowStockCount(
      ((inventory as InventoryItem[]) || []).filter(
        (item) => item.quantity <= item.min_threshold
      ).length
    );
    setLoading(false);
  }

  const completedCount = todayBookings.filter((b) => b.status === "completed").length;
  const estimatedRevenue = todayBookings.reduce(
    (sum, b) => sum + (b.total_price || b.services?.price || 0),
    0
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">สวัสดี! วันนี้ร้านเป็นยังไงบ้าง ✨</h2>
          <p className="page-subtitle">
            {new Date().toLocaleDateString("th-TH", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <Link href="/admin/booking" className="btn-primary">
          <ArrowRight size={16} />
          <span>ลงคิวใหม่</span>
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* คิววันนี้ */}
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">คิววันนี้</p>
              {loading ? (
                <div className="h-8 w-16 bg-pink-100 rounded animate-pulse mt-2" />
              ) : (
                <p className="text-3xl font-bold text-brand-dark mt-1">
                  {todayBookings.length}
                  <span className="text-sm font-normal text-slate-400 ml-1">คิว</span>
                </p>
              )}
              <p className="text-xs text-slate-400 mt-1">เสร็จแล้ว {completedCount} คิว</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <CalendarCheck size={20} className="text-blue-500" />
            </div>
          </div>
        </div>

        {/* รายรับวันนี้ */}
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">รายรับวันนี้</p>
              {loading ? (
                <div className="h-8 w-24 bg-pink-100 rounded animate-pulse mt-2" />
              ) : (
                <p className="text-3xl font-bold text-brand-dark mt-1">
                  {formatBaht(todayIncome || estimatedRevenue)}
                </p>
              )}
              <p className="text-xs text-slate-400 mt-1">
                {todayIncome > 0 ? "บันทึกแล้ว" : `ประเมินจาก ${todayBookings.length} คิว`}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <TrendingUp size={20} className="text-emerald-500" />
            </div>
          </div>
        </div>

        {/* สต็อกใกล้หมด */}
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">สต็อกใกล้หมด</p>
              {loading ? (
                <div className="h-8 w-12 bg-pink-100 rounded animate-pulse mt-2" />
              ) : (
                <p className={`text-3xl font-bold mt-1 ${lowStockCount > 0 ? "text-rose-500" : "text-emerald-500"}`}>
                  {lowStockCount}
                  <span className="text-sm font-normal text-slate-400 ml-1">รายการ</span>
                </p>
              )}
              <p className="text-xs text-slate-400 mt-1">
                {lowStockCount > 0 ? "ต้องเติมสต็อก" : "สต็อกปกติ"}
              </p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${lowStockCount > 0 ? "bg-rose-50" : "bg-emerald-50"}`}>
              <PackageSearch size={20} className={lowStockCount > 0 ? "text-rose-500" : "text-emerald-500"} />
            </div>
          </div>
          {lowStockCount > 0 && (
            <Link href="/admin/inventory" className="mt-3 flex items-center gap-1 text-xs text-rose-500 hover:underline font-medium">
              <AlertCircle size={12} />
              ดูรายการสต็อก →
            </Link>
          )}
        </div>
      </div>

      {/* Today's Bookings */}
      <div className="card">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-pink-50">
          <h3 className="font-semibold text-brand-dark">คิวงานวันนี้</h3>
          <Link href="/admin/calendar" className="text-xs text-rose-400 hover:text-rose-600 font-medium hover:underline">
            ดูปฏิทิน →
          </Link>
        </div>

        <div className="divide-y divide-pink-50">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="px-6 py-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-pink-100 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-pink-100 rounded w-32 animate-pulse" />
                  <div className="h-3 bg-pink-50 rounded w-24 animate-pulse" />
                </div>
              </div>
            ))
          ) : todayBookings.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <CalendarCheck size={36} className="text-pink-200 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">ยังไม่มีคิววันนี้</p>
              <Link href="/admin/booking" className="text-rose-400 text-sm font-medium hover:underline mt-1 inline-block">
                + เพิ่มคิวใหม่
              </Link>
            </div>
          ) : (
            todayBookings.map((booking) => {
              const status = booking.status as keyof typeof statusConfig;
              const cfg = statusConfig[status] || statusConfig.pending;
              const customerName = booking.customers?.name || "ลูกค้า";
              const serviceName = booking.services?.name || booking.notes || "-";

              return (
                <div key={booking.id} className="px-6 py-4 flex items-center gap-4 hover:bg-pink-50/50 transition-colors">
                  {/* Time block */}
                  <div className="w-14 text-center shrink-0">
                    <p className="text-xs font-bold text-rose-400">{formatTime(booking.start_time)}</p>
                    <p className="text-[10px] text-slate-400">{formatTime(booking.end_time)}</p>
                  </div>

                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-100 to-pink-200 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-rose-500">
                      {customerName.charAt(0)}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-brand-dark truncate">{customerName}</p>
                    <p className="text-xs text-slate-400 truncate">{serviceName}</p>
                  </div>

                  {/* Price */}
                  {(booking.total_price || booking.services?.price) && (
                    <p className="text-sm font-semibold text-brand-dark shrink-0">
                      {formatBaht(booking.total_price || booking.services?.price || 0)}
                    </p>
                  )}

                  {/* Status */}
                  <span className={`badge ${cfg.class} shrink-0`}>
                    {cfg.label}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}