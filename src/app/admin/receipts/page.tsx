"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Booking, ShopSettings, settingsToMap, DEFAULT_SETTINGS } from "@/lib/types";
import { Receipt, Search, X, Printer, Clock, User, Scissors, Banknote, CalendarDays, CreditCard } from "lucide-react";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}
function formatFullDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: "💵 เงินสด",
  promptpay: "📱 พร้อมเพย์",
  transfer: "🏦 โอนเงิน",
};

export default function ReceiptsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filtered, setFiltered] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showReceipt, setShowReceipt] = useState<Booking | null>(null);
  const [shopSettings, setShopSettings] = useState<Record<string, string>>(DEFAULT_SETTINGS);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCompletedBookings();
    fetchShopSettings();
  }, []);

  useEffect(() => {
    const q = query.toLowerCase();
    setFiltered(bookings.filter((b) =>
      (b.customers?.name || "").toLowerCase().includes(q) ||
      (b.services?.name || "").toLowerCase().includes(q) ||
      b.id.toLowerCase().includes(q)
    ));
  }, [query, bookings]);

  async function fetchCompletedBookings() {
    setLoading(true);
    const { data } = await supabase
      .from("bookings")
      .select("*, customers(name, phone), services(name, price, duration)")
      .eq("status", "completed")
      .order("start_time", { ascending: false })
      .limit(200);
    setBookings((data as Booking[]) || []);
    setFiltered((data as Booking[]) || []);
    setLoading(false);
  }

  async function fetchShopSettings() {
    const { data } = await supabase.from("shop_settings").select("*");
    if (data && data.length > 0) {
      setShopSettings({ ...DEFAULT_SETTINGS, ...settingsToMap(data as ShopSettings[]) });
    }
  }

  function printReceipt() {
    if (!receiptRef.current) return;
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html><html><head>
        <title>ใบเสร็จ - ${shopSettings.shop_name}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Prompt', sans-serif; padding: 20px; max-width: 320px; margin: 0 auto; color: #1e293b; }
          .divider { border-top: 1px dashed #e2e8f0; margin: 12px 0; }
          .row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 13px; }
          .bold { font-weight: 600; }
          .small { font-size: 11px; color: #94a3b8; }
          @media print { body { padding: 0; } }
        </style>
      </head><body>
        ${receiptRef.current.innerHTML}
        <script>window.onload=function(){window.print();}<\/script>
      </body></html>
    `);
    printWindow.document.close();
  }

  // Summary stats
  const totalRevenue = bookings.reduce((sum, b) => sum + (b.total_price || b.services?.price || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="page-title">ประวัติบิล 🧾</h2>
        <p className="page-subtitle">ดูใบเสร็จจากคิวที่เสร็จแล้วทั้งหมด</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Receipt size={18} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400">บิลทั้งหมด</p>
              <p className="text-xl font-bold text-brand-dark">{bookings.length} ใบ</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center">
              <Banknote size={18} className="text-rose-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400">ยอดรวม</p>
              <p className="text-xl font-bold text-brand-dark">฿{totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="ค้นหาชื่อลูกค้า, บริการ, หรือเลขบิล..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input-field pl-9 text-sm"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Bills list */}
      <div className="card overflow-hidden">
        <div className="divide-y divide-pink-50 max-h-[500px] overflow-y-auto">
          {loading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-50 animate-pulse" />
                <div className="flex-1 space-y-2"><div className="h-4 bg-pink-100 rounded w-32 animate-pulse" /><div className="h-3 bg-pink-50 rounded w-20 animate-pulse" /></div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="px-5 py-12 text-center text-slate-400">
              <Receipt size={32} className="mx-auto mb-2 text-pink-200" />
              <p className="text-sm">ยังไม่มีบิล</p>
            </div>
          ) : (
            filtered.map((b) => (
              <button
                key={b.id}
                onClick={() => setShowReceipt(b)}
                className="w-full text-left px-5 py-3.5 flex items-center gap-3 hover:bg-pink-50/50 transition-colors"
              >
                {/* Receipt icon + date */}
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center shrink-0">
                  <Receipt size={18} className="text-emerald-600" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-brand-dark truncate">{b.customers?.name || "ลูกค้า"}</p>
                    <span className="text-[10px] font-mono text-slate-300">#{b.id.slice(0, 6)}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Scissors size={10} /> {b.services?.name || "-"}
                    </p>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <CalendarDays size={10} /> {formatDate(b.start_time)}
                    </p>
                  </div>
                </div>

                {/* Price + payment */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-emerald-600">฿{(b.total_price || b.services?.price || 0).toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400">{PAYMENT_LABELS[b.payment_method || "cash"] || b.payment_method}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Receipt Detail Modal */}
      {showReceipt && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up">
            <div className="px-6 py-3 border-b border-pink-100 flex items-center justify-between">
              <h4 className="font-bold text-brand-dark flex items-center gap-2">
                <Receipt size={16} className="text-rose-400" /> ใบเสร็จ
              </h4>
              <div className="flex gap-2">
                <button onClick={printReceipt} className="btn-ghost py-1 px-2" title="พิมพ์"><Printer size={16} /></button>
                <button onClick={() => setShowReceipt(null)} className="btn-ghost py-1 px-2"><X size={16} /></button>
              </div>
            </div>

            <div className="p-6" ref={receiptRef}>
              <div style={{ textAlign: "center", marginBottom: "16px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: 700 }}>✨ {shopSettings.shop_name}</h2>
                {shopSettings.shop_phone && <p style={{ fontSize: "11px", color: "#94a3b8" }}>โทร: {shopSettings.shop_phone}</p>}
                <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>เลขที่: {showReceipt.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <div style={{ borderTop: "1px dashed #e2e8f0", margin: "12px 0" }} />
              <div style={{ marginBottom: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", margin: "4px 0" }}>
                  <span style={{ color: "#64748b" }}>ลูกค้า</span>
                  <span style={{ fontWeight: 600 }}>{showReceipt.customers?.name || "-"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", margin: "4px 0" }}>
                  <span style={{ color: "#64748b" }}>วันที่</span>
                  <span>{formatFullDate(showReceipt.start_time)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", margin: "4px 0" }}>
                  <span style={{ color: "#64748b" }}>เวลา</span>
                  <span>{formatTime(showReceipt.start_time)} – {formatTime(showReceipt.end_time)}</span>
                </div>
              </div>
              <div style={{ borderTop: "1px dashed #e2e8f0", margin: "12px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", margin: "4px 0" }}>
                <span>{showReceipt.services?.name || "บริการ"}</span>
                <span style={{ fontWeight: 600 }}>฿{(showReceipt.total_price || showReceipt.services?.price || 0).toLocaleString()}</span>
              </div>
              {showReceipt.deposit > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", margin: "4px 0", color: "#059669" }}>
                  <span>มัดจำ</span>
                  <span>-฿{showReceipt.deposit.toLocaleString()}</span>
                </div>
              )}
              <div style={{ borderTop: "1px dashed #e2e8f0", margin: "12px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", margin: "4px 0" }}>
                <span style={{ fontWeight: 600 }}>ยอดรวม</span>
                <span style={{ fontSize: "18px", fontWeight: 700 }}>฿{(showReceipt.total_price || showReceipt.services?.price || 0).toLocaleString()}</span>
              </div>
              {showReceipt.deposit > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", margin: "4px 0" }}>
                  <span style={{ color: "#64748b" }}>ยอดชำระวันนี้</span>
                  <span style={{ fontWeight: 600, color: "#e11d48" }}>
                    ฿{((showReceipt.total_price || showReceipt.services?.price || 0) - showReceipt.deposit).toLocaleString()}
                  </span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", margin: "4px 0" }}>
                <span style={{ color: "#64748b" }}>วิธีชำระ</span>
                <span>{PAYMENT_LABELS[showReceipt.payment_method || "cash"] || showReceipt.payment_method}</span>
              </div>
              <div style={{ borderTop: "1px dashed #e2e8f0", margin: "16px 0" }} />
              <p style={{ textAlign: "center", fontSize: "11px", color: "#94a3b8" }}>ขอบคุณที่ใช้บริการค่ะ 💅✨</p>
            </div>

            <div className="px-6 pb-5 flex justify-center">
              <button onClick={printReceipt} className="btn-primary w-full justify-center"><Printer size={16} /> พิมพ์ใบเสร็จ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
