"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Booking, ShopSettings, settingsToMap, DEFAULT_SETTINGS } from "@/lib/types";
import { ChevronLeft, ChevronRight, X, Clock, User, Scissors, CheckCircle2, XCircle, Receipt, Printer, CreditCard, Banknote } from "lucide-react";
import toast from "react-hot-toast";
import PromptPayQR from "@/components/PromptPayQR";

const STATUS_LABELS = {
  pending: { label: "รอยืนยัน", class: "badge-pending" },
  confirmed: { label: "ยืนยันแล้ว", class: "badge-confirmed" },
  completed: { label: "เสร็จแล้ว", class: "badge-completed" },
  cancelled: { label: "ยกเลิก", class: "badge-cancelled" },
};

const DAY_DOT_COLOR: Record<string, string> = {
  pending: "bg-amber-400",
  confirmed: "bg-blue-400",
  completed: "bg-emerald-400",
  cancelled: "bg-red-400",
};

const THAI_MONTHS = [
  "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
  "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม",
];
const THAI_DAYS_SHORT = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

const PAYMENT_OPTIONS = [
  { value: "cash", label: "💵 เงินสด", icon: "💵" },
  { value: "promptpay", label: "📱 พร้อมเพย์", icon: "📱" },
  { value: "transfer", label: "🏦 โอนเงิน", icon: "🏦" },
];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" });
}
function formatFullDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
}

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(today);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Complete flow states
  const [showCompleteDialog, setShowCompleteDialog] = useState<Booking | null>(null);
  const [completePaymentMethod, setCompletePaymentMethod] = useState("cash");
  const [completing, setCompleting] = useState(false);

  // Receipt
  const [showReceipt, setShowReceipt] = useState<Booking | null>(null);
  const [receiptPaymentMethod, setReceiptPaymentMethod] = useState("cash");
  const [shopSettings, setShopSettings] = useState<Record<string, string>>(DEFAULT_SETTINGS);
  const receiptRef = useRef<HTMLDivElement>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const start = new Date(year, month, 1).toISOString();
    const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    const { data } = await supabase
      .from("bookings")
      .select("*, customers(*), services(name, price, duration)")
      .gte("start_time", start)
      .lte("start_time", end)
      .order("start_time", { ascending: true });
    setBookings((data as Booking[]) || []);
    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    fetchBookings();
    (async () => {
      const { data } = await supabase.from("shop_settings").select("*");
      if (data && data.length > 0) {
        setShopSettings({ ...DEFAULT_SETTINGS, ...settingsToMap(data as ShopSettings[]) });
      }
    })();
  }, [fetchBookings]);

  // ... (keep the other parts unchanged until confirmComplete)

  // ยืนยันจบงาน
  async function confirmComplete() {
    if (!showCompleteDialog) return;
    setCompleting(true);
    const booking = showCompleteDialog;
    const toastId = toast.loading("กำลังบันทึก...");

    try {
      // 1. อัพเดตสถานะ + payment_method
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ status: "completed", payment_method: completePaymentMethod })
        .eq("id", booking.id);
      if (updateError) throw updateError;

      // 2. บันทึก transaction รายรับ (ยอดที่เหลือหลังหักมัดจำ)
      const totalPrice = booking.total_price || booking.services?.price || 0;
      const deposit = booking.deposit || 0;
      const remaining = totalPrice - deposit;

      if (remaining > 0) {
        await supabase.from("transactions").insert([{
          type: "income",
          amount: remaining,
          category: "รายได้ทำเล็บ",
          booking_id: booking.id,
        }]);
      }

      // 3. ระบบสะสมแต้ม
      let currentPoints = 0;
      let newPoints = 1;
      const pointsPerBooking = Number(shopSettings.points_per_booking || 1);

      if (booking.customer_id) {
        const { data: customer } = await supabase
          .from("customers")
          .select("points, name")
          .eq("id", booking.customer_id)
          .single();
        
        if (customer) {
          currentPoints = customer.points || 0;
          newPoints = currentPoints + pointsPerBooking;
          await supabase
            .from("customers")
            .update({ points: newPoints })
            .eq("id", booking.customer_id);
        }
      }

      const payLabel = PAYMENT_OPTIONS.find((p) => p.value === completePaymentMethod)?.label || completePaymentMethod;
      toast.success(`จบงานเรียบร้อย! ได้รับ ${pointsPerBooking} แต้ม (รวม ${newPoints} แต้ม)`, { id: toastId });

      // 4. ส่งการแจ้งเตือน LINE พร้อม Link ใบเสร็จ
      if (shopSettings.line_channel_token && shopSettings.admin_line_uid) {
        const receiptUrl = `${window.location.origin}/receipt/${booking.id}`;
        const message = `✅ จบงานแล้ว!\n👤 ลูกค้า: ${booking.customers?.name}\n💰 ยอดชำระ: ฿${totalPrice.toLocaleString()}\n💳 วิธีชำระ: ${payLabel}\n⭐️ ได้รับ ${pointsPerBooking} แต้ม! (ตอนนี้มีทั้งหมด ${newPoints} แต้ม)\n\nดูใบเสร็จออนไลน์ได้ที่:\n${receiptUrl}`;
        
        fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channelToken: shopSettings.line_channel_token,
            adminUid: shopSettings.admin_line_uid,
            message,
          }),
        }).catch(err => console.error("LINE Notify Error:", err));
      }

      // 5. แสดงใบเสร็จ
      setShowCompleteDialog(null);
      setCompleting(false);
      setReceiptPaymentMethod(completePaymentMethod);
      setShowReceipt({ ...booking, status: "completed", payment_method: completePaymentMethod });
      fetchBookings();
    } catch (err) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาด", { id: toastId });
      setCompleting(false);
    }
  }

  async function updateStatus(bookingId: string, status: string) {
    const { error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", bookingId);
    if (error) { toast.error("ไม่สามารถอัพเดตสถานะได้"); return; }
    toast.success("อัพเดตสถานะเรียบร้อย ✓");
    setSelectedBooking(null);
    fetchBookings();
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
          .center { text-align: center; }
          .divider { border-top: 1px dashed #e2e8f0; margin: 12px 0; }
          .row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 13px; }
          .bold { font-weight: 600; }
          .small { font-size: 11px; color: #94a3b8; }
          .total { font-size: 18px; font-weight: 700; }
          h2 { font-size: 16px; font-weight: 700; margin-bottom: 2px; }
          @media print { body { padding: 0; } }
        </style>
      </head><body>
        ${receiptRef.current.innerHTML}
        <script>window.onload=function(){window.print();}<\/script>
      </body></html>
    `);
    printWindow.document.close();
  }

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="page-title">ตารางคิว 📅</h2>
        <p className="page-subtitle">ดูคิวทั้งหมดในแต่ละเดือน คลิกวันเพื่อดูรายละเอียด</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} className="btn-ghost py-1.5 px-2.5"><ChevronLeft size={18} /></button>
            <h3 className="font-bold text-brand-dark text-base">{THAI_MONTHS[month]} {year + 543}</h3>
            <button onClick={nextMonth} className="btn-ghost py-1.5 px-2.5"><ChevronRight size={18} /></button>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {THAI_DAYS_SHORT.map((d, i) => (
              <div key={d} className={`text-center text-xs font-semibold py-1 ${i === 0 ? "text-rose-400" : "text-slate-400"}`}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {[...Array(firstDay)].map((_, i) => <div key={`e-${i}`} />)}
            {[...Array(daysInMonth)].map((_, i) => {
              const day = i + 1;
              const thisDate = new Date(year, month, day);
              const isToday = today.toDateString() === thisDate.toDateString();
              const isSelected = selectedDate?.toDateString() === thisDate.toDateString();
              const dayStatus = bookingsByDay[day] || [];
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(thisDate)}
                  className={`relative flex flex-col items-center py-2 rounded-xl transition-all text-sm font-medium
                    ${isSelected ? "bg-gradient-to-br from-rose-400 to-pink-500 text-white shadow-md scale-105" :
                      isToday ? "bg-rose-50 text-rose-500 ring-1 ring-rose-300" :
                      "hover:bg-pink-50 text-slate-600"}`}
                >
                  <span>{day}</span>
                  {dayStatus.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dayStatus.slice(0, 3).map((s, idx) => (
                        <span key={idx} className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white/70" : DAY_DOT_COLOR[s] || "bg-slate-300"}`} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-pink-50">
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className={`w-2 h-2 rounded-full ${DAY_DOT_COLOR[k]}`} />{v.label}
              </div>
            ))}
          </div>
        </div>

        {/* Day detail */}
        <div className="card p-5">
          <h3 className="font-semibold text-brand-dark text-sm mb-1">
            {selectedDate ? formatDate(selectedDate.toISOString()) : "เลือกวันที่"}
          </h3>
          <p className="text-xs text-slate-400 mb-4">{dayBookings.length} คิว</p>

          <div className="space-y-2 overflow-y-auto max-h-96">
            {loading ? (
              <div className="animate-pulse space-y-3">{[1, 2, 3].map((i) => (<div key={i} className="h-16 bg-pink-50 rounded-xl" />))}</div>
            ) : dayBookings.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Clock size={28} className="mx-auto mb-2 text-pink-200" />
                <p className="text-sm">ไม่มีคิววันนี้</p>
              </div>
            ) : (
              dayBookings.map((b) => {
                const cfg = STATUS_LABELS[b.status as keyof typeof STATUS_LABELS] || STATUS_LABELS.pending;
                return (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBooking(b)}
                    className="w-full text-left p-3 rounded-xl bg-pink-50/60 hover:bg-pink-100/70 border border-pink-100 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-brand-dark truncate">{b.customers?.name || "ลูกค้า"}</p>
                        <p className="text-xs text-slate-400 truncate">{b.services?.name || "-"}</p>
                        <p className="text-xs text-rose-400 mt-0.5">{formatTime(b.start_time)} – {formatTime(b.end_time)}</p>
                      </div>
                      <span className={`badge ${cfg.class} shrink-0 text-[10px]`}>{cfg.label}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ===== Booking Detail Modal ===== */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
            <div className="px-6 py-4 border-b border-pink-100 flex items-center justify-between">
              <h4 className="font-bold text-brand-dark">รายละเอียดคิว</h4>
              <button onClick={() => setSelectedBooking(null)} className="btn-ghost py-1 px-2"><X size={16} /></button>
            </div>

            <div className="p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-100 to-pink-200 flex items-center justify-center">
                  <User size={18} className="text-rose-500" />
                </div>
                <div>
                  <p className="font-semibold text-brand-dark">{selectedBooking.customers?.name}</p>
                  <p className="text-xs text-slate-400">{selectedBooking.customers?.phone || "ไม่มีเบอร์"}</p>
                </div>
              </div>

              <div className="bg-pink-50/60 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Scissors size={14} className="text-rose-400" />
                  <span className="text-slate-600">{selectedBooking.services?.name || "-"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-rose-400" />
                  <span className="text-slate-600">{formatTime(selectedBooking.start_time)} – {formatTime(selectedBooking.end_time)} น.</span>
                </div>
                {selectedBooking.total_price && (
                  <div className="flex items-center gap-2">
                    <Banknote size={14} className="text-rose-400" />
                    <span className="text-slate-600 font-semibold">฿{selectedBooking.total_price.toLocaleString()}</span>
                    {selectedBooking.deposit > 0 && (
                      <span className="text-xs text-slate-400">(มัดจำ ฿{selectedBooking.deposit.toLocaleString()})</span>
                    )}
                  </div>
                )}
                {selectedBooking.notes && (
                  <p className="text-slate-500 text-xs border-t border-pink-100 pt-2 mt-2">{selectedBooking.notes}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">สถานะ:</span>
                <span className={`badge ${STATUS_LABELS[selectedBooking.status as keyof typeof STATUS_LABELS]?.class || "badge-pending"}`}>
                  {STATUS_LABELS[selectedBooking.status as keyof typeof STATUS_LABELS]?.label || "รอยืนยัน"}
                </span>
              </div>
            </div>

            <div className="px-6 pb-5 flex flex-wrap gap-2">
              {selectedBooking.status !== "completed" && (
                <>
                  <button
                    onClick={() => openCompleteDialog(selectedBooking)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition-colors border border-emerald-200"
                  >
                    <CheckCircle2 size={15} /> จบงาน + ชำระเงิน
                  </button>
                  <Link
                    href={`/admin/booking?edit=${selectedBooking.id}`}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-50 text-slate-700 text-sm font-medium hover:bg-slate-100 transition-colors border border-slate-200"
                  >
                    <Scissors size={15} /> แก้ไขคิว
                  </Link>
                </>
              )}
              {selectedBooking.status === "completed" && (
                <button
                  onClick={() => { setReceiptPaymentMethod(selectedBooking.payment_method || "cash"); setSelectedBooking(null); setShowReceipt(selectedBooking); }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors border border-blue-200"
                >
                  <Receipt size={15} /> ดูใบเสร็จ
                </button>
              )}
              {selectedBooking.status !== "confirmed" && selectedBooking.status !== "completed" && (
                <button
                  onClick={() => updateStatus(selectedBooking.id, "confirmed")}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors border border-blue-200"
                >
                  <CheckCircle2 size={15} /> ยืนยัน
                </button>
              )}
              {selectedBooking.status !== "cancelled" && (
                <button
                  onClick={() => updateStatus(selectedBooking.id, "cancelled")}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors border border-red-200"
                >
                  <XCircle size={15} /> ยกเลิกคิว
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== Complete Booking Dialog (เลือกวิธีชำระ) ===== */}
      {showCompleteDialog && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up">
            <div className="px-6 py-4 border-b border-pink-100 flex items-center justify-between">
              <h4 className="font-bold text-brand-dark flex items-center gap-2">
                <CreditCard size={16} className="text-rose-400" /> จบงาน & ชำระเงิน
              </h4>
              <button onClick={() => setShowCompleteDialog(null)} className="btn-ghost py-1 px-2"><X size={16} /></button>
            </div>

            <div className="p-6 space-y-4">
              {/* สรุปยอด */}
              <div className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl p-4 border border-rose-100 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{showCompleteDialog.services?.name || "บริการ"}</span>
                  <span className="font-semibold">฿{(showCompleteDialog.total_price || showCompleteDialog.services?.price || 0).toLocaleString()}</span>
                </div>
                {showCompleteDialog.deposit > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-600">มัดจำแล้ว</span>
                    <span className="text-emerald-600">-฿{showCompleteDialog.deposit.toLocaleString()}</span>
                  </div>
                )}
                <div className="h-px bg-rose-200 my-2" />
                <div className="flex justify-between">
                  <span className="font-bold text-brand-dark">ยอดชำระวันนี้</span>
                  <span className="text-xl font-bold text-rose-600">
                    ฿{Math.max(0, (showCompleteDialog.total_price || showCompleteDialog.services?.price || 0) - (showCompleteDialog.deposit || 0)).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* เลือกวิธีชำระ */}
              <div>
                <label className="form-label">เลือกวิธีชำระเงิน</label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {PAYMENT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setCompletePaymentMethod(opt.value)}
                      className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all text-sm font-medium
                        ${completePaymentMethod === opt.value
                          ? "border-rose-400 bg-rose-50 text-rose-600 shadow-sm"
                          : "border-pink-100 bg-white text-slate-500 hover:border-rose-200"
                        }`}
                    >
                      <span className="text-lg">{opt.icon}</span>
                      <span className="text-xs">{opt.value === "cash" ? "เงินสด" : opt.value === "promptpay" ? "พร้อมเพย์" : "โอนเงิน"}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* PromptPay QR */}
              {completePaymentMethod === "promptpay" && shopSettings.promptpay_id && (
                <div className="animate-fade-in pt-2">
                  <PromptPayQR 
                    id={shopSettings.promptpay_id} 
                    amount={Math.max(0, (showCompleteDialog.total_price || showCompleteDialog.services?.price || 0) - (showCompleteDialog.deposit || 0))} 
                    label="สแกนเพื่อชำระเงิน"
                  />
                </div>
              )}
            </div>

            <div className="px-6 pb-5 flex gap-2">
              <button onClick={() => setShowCompleteDialog(null)} className="btn-ghost flex-1">ยกเลิก</button>
              <button onClick={confirmComplete} disabled={completing} className="btn-primary flex-1 justify-center">
                {completing ? "กำลังบันทึก..." : "✓ ยืนยันจบงาน"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Receipt Modal ===== */}
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
                <span>{receiptPaymentMethod === "cash" ? "💵 เงินสด" : receiptPaymentMethod === "promptpay" ? "📱 พร้อมเพย์" : "🏦 โอนเงิน"}</span>
              </div>
              <div style={{ borderTop: "1px dashed #e2e8f0", margin: "16px 0" }} />
              <p style={{ textAlign: "center", fontSize: "11px", color: "#94a3b8" }}>ขอบคุณที่ใช้บริการค่ะ 💅✨</p>
              <p style={{ textAlign: "center", fontSize: "10px", color: "#cbd5e1", marginTop: "4px" }}>{new Date().toLocaleString("th-TH")}</p>
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
