"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Booking, ShopSettings, Promotion, settingsToMap, DEFAULT_SETTINGS } from "@/lib/types";
import { ChevronLeft, ChevronRight, X, Clock, User, Scissors, CheckCircle2, XCircle, Receipt, Printer, CreditCard, Banknote, Bell, Gift, Tag, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

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
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(today);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Complete flow states
  const [showCompleteDialog, setShowCompleteDialog] = useState<Booking | null>(null);
  const [completePaymentMethod, setCompletePaymentMethod] = useState("cash");
  const [completeFinalPrice, setCompleteFinalPrice] = useState<number>(0);
  const [completing, setCompleting] = useState(false);
  const [customerCoupons, setCustomerCoupons] = useState<any[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<any | null>(null);

  // Confirm dialog (ยืนยันคิว + ใส่ราคา)
  const [showConfirmDialog, setShowConfirmDialog] = useState<Booking | null>(null);
  const [confirmPrice, setConfirmPrice] = useState<number>(0);
  const [selectedPromoId, setSelectedPromoId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Receipt
  const [showReceipt, setShowReceipt] = useState<Booking | null>(null);
  const [receiptPaymentMethod, setReceiptPaymentMethod] = useState("cash");
  const [shopSettings, setShopSettings] = useState<Record<string, string>>(DEFAULT_SETTINGS);
  const receiptRef = useRef<HTMLDivElement>(null);

  async function toggleBlockDate() {
    if (!selectedDate) return;
    const pad = (n: number) => String(n).padStart(2, "0");
    const dateStr = `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth() + 1)}-${pad(selectedDate.getDate())}`;
    
    const existingDates = (shopSettings.closed_dates || "").split(",").filter(Boolean);
    const isClosed = existingDates.includes(dateStr);
    
    let nextDates: string[];
    if (isClosed) {
      nextDates = existingDates.filter(d => d !== dateStr);
    } else {
      nextDates = [...existingDates, dateStr];
    }
    
    const nextValue = nextDates.join(",");
    const { error } = await supabase.from("shop_settings").upsert({ key: "closed_dates", value: nextValue }, { onConflict: "key" });
    
    if (error) {
      toast.error("ไม่สามารถบันทึกได้");
    } else {
      setShopSettings(prev => ({ ...prev, closed_dates: nextValue }));
      toast.success(isClosed ? "เปิดรับคิวปกติแล้ว ✓" : "ปิดรับคิววันนี้เรียบร้อย ✓");
    }
  }

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    // ใช้ offset +07:00 เพื่อให้ได้ช่วงเวลาไทยที่ถูกต้อง
    const pad = (n: number) => String(n).padStart(2, "0");
    const startStr = `${year}-${pad(month + 1)}-01T00:00:00+07:00`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endStr = `${year}-${pad(month + 1)}-${pad(lastDay)}T23:59:59+07:00`;
    const { data } = await supabase
      .from("bookings")
      .select("*, customers(*), booking_services(service_name, unit_price, line_total, finger_count)")
      .gte("start_time", startStr)
      .lte("start_time", endStr)
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
      const { data: promoData } = await supabase.from("promotions").select("*").eq("is_active", true);
      if (promoData) setPromotions(promoData as Promotion[]);
    })();
  }, [fetchBookings]);

  // ส่งการแจ้งเตือน (ส่งหาแอดมินทาง Telegram)
  async function sendReminder(booking: Booking) {
    if (!shopSettings.telegram_bot_token || !shopSettings.telegram_chat_id) {
      toast.error("กรุณาตั้งค่า Telegram Notification ในหน้าตั้งค่าก่อนครับ");
      return;
    }
    
    const toastId = toast.loading("กำลังส่งแจ้งเตือน...");
    const customerName = booking.customers?.name || "ลูกค้า";
    const startTime = new Date(booking.start_time).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
    const message = `🔔 <b>แจ้งเตือนคิวงาน!</b>\n\n⏰ มีคิวคุณ ${customerName} เวลา ${startTime} น.\n<i>อย่าลืมเตรียมตัวนะคะ ✨</i>`;

    try {
      const url = `https://api.telegram.org/bot${shopSettings.telegram_bot_token}/sendMessage`;
      const chatIds = String(shopSettings.telegram_chat_id).split(",").map(id => id.trim()).filter(Boolean);
      
      await Promise.all(chatIds.map(id => 
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: id, text: message, parse_mode: "HTML" })
        })
      ));
      
      toast.success("ส่งแจ้งเตือนเข้า Telegram เรียบร้อย!", { id: toastId });
    } catch (err) {
      toast.error("ส่งแจ้งเตือนไม่สำเร็จ", { id: toastId });
    }
  }

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dayBookings = selectedDate
    ? bookings.filter((b) => {
        const d = new Date(b.start_time);
        return d.getFullYear() === selectedDate.getFullYear() &&
          d.getMonth() === selectedDate.getMonth() &&
          d.getDate() === selectedDate.getDate();
      })
    : [];

  const bookingsByDay: Record<number, string[]> = {};
  bookings.forEach((b) => {
    const d = new Date(b.start_time).getDate();
    if (!bookingsByDay[d]) bookingsByDay[d] = [];
    bookingsByDay[d].push(b.status);
  });

  // เปิด complete dialog (เลือกวิธีชำระก่อน)
  async function openCompleteDialog(booking: Booking) {
    setSelectedBooking(null);
    setShowCompleteDialog(booking);
    setCompletePaymentMethod("cash");
    setCompleteFinalPrice(booking.total_price || 0);
    setSelectedCoupon(null);
    setCustomerCoupons([]);

    // ดึงข้อมูลลูกค้าล่าสุด (เพื่อเอา line_id และแต้มล่าสุด)
    if (booking.customer_id) {
      try {
        const { data: latestCustomer } = await supabase
          .from("customers")
          .select("*")
          .eq("id", booking.customer_id)
          .single();

        if (latestCustomer) {
          // อัพเดตข้อมูลลูกค้าใน booking object (ใน Dialog เท่านั้น)
          setShowCompleteDialog({ ...booking, customers: latestCustomer });
        }

        const { data: coupons } = await supabase
          .from("customer_coupons")
          .select("*, rewards(*)")
          .eq("customer_id", booking.customer_id)
          .eq("status", "active");
        if (coupons) setCustomerCoupons(coupons);
      } catch (e) {
        console.error("Error fetching latest customer data:", e);
      }
    }
  }
  function openConfirmDialog(booking: Booking) {
    setSelectedBooking(null);
    setShowConfirmDialog(booking);
    setConfirmPrice(booking.total_price || 0);
    setSelectedPromoId(booking.promotion_id);
  }

  async function confirmBooking() {
    if (!showConfirmDialog) return;
    setConfirming(true);
    const booking = showConfirmDialog;
    const toastId = toast.loading("กำลังยืนยัน...");
    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          status: "confirmed",
          total_price: confirmPrice,
          promotion_id: selectedPromoId
        })
        .eq("id", booking.id);
      if (error) throw error;

      // แจ้งเตือนแอดมิน (Telegram)
      const svcNames = ((booking as any).booking_services || []).map((s: any) => s.service_name).join(", ") || "บริการ";
      const dateStr = new Date(booking.start_time).toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short" });
      const timeStr = new Date(booking.start_time).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
      
      const msgTelegram = `✅ <b>ยืนยันคิวแล้ว</b>\n\nสำหรับ ${booking.customers?.name || "ลูกค้า"}\n\u2702️ ${svcNames}\n📅 ${dateStr} ${timeStr} น.\n💰 ราคา: ฿${confirmPrice.toLocaleString()}\n\n<i>รอเจอลูกค้าได้เลยค่ะ ✨</i>`;

      if (shopSettings.telegram_bot_token && shopSettings.telegram_chat_id) {
        const url = `https://api.telegram.org/bot${shopSettings.telegram_bot_token}/sendMessage`;
        const chatIds = String(shopSettings.telegram_chat_id).split(",").map(id => id.trim()).filter(Boolean);
        chatIds.forEach(id => fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: id, text: msgTelegram, parse_mode: "HTML" })
        }).catch(() => {}));
      }

      toast.success("ยืนยันคิวเรียบร้อย! ✓", { id: toastId });
      setShowConfirmDialog(null);
      fetchBookings();
    } catch (err) {
      toast.error("ไม่สามารถยืนยันคิวได้", { id: toastId });
    } finally { setConfirming(false); }
  }

  // ยืนยันจบงาน
  async function confirmComplete() {
    if (!showCompleteDialog) return;
    setCompleting(true);
    const booking = showCompleteDialog;
    const toastId = toast.loading("กำลังบันทึก...");

    try {
      // 1. อัพเดตสถานะ + ราคาจริง + payment_method
      const { error: updateError } = await supabase
        .from("bookings")
        .update({
          status: "completed",
          payment_method: completePaymentMethod,
          total_price: completeFinalPrice,  // บันทึกราคาจริง
        })
        .eq("id", booking.id);
      if (updateError) throw updateError;

      // 2. บันทึก transaction รายรับ (ยอดที่เหลือหลังหักมัดจำ)
      let finalPrice = completeFinalPrice;
      if (selectedCoupon && selectedCoupon.rewards) {
        const reward = selectedCoupon.rewards;
        if (reward.reward_type === "amount") {
          finalPrice = Math.max(0, finalPrice - (Number(reward.value) || 0));
        } else if (reward.reward_type === "percent") {
          finalPrice = Math.max(0, finalPrice - Math.round(completeFinalPrice * ((Number(reward.value) || 0) / 100)));
        }
      }
      const deposit = booking.deposit || 0;
      const remaining = Math.max(0, finalPrice - deposit);

      if (remaining > 0) {
        await supabase.from("transactions").insert([{
          type: "income",
          amount: remaining,
          category: "รายได้ทำเล็บ",
          booking_id: booking.id,
        }]);
      }

      // 2.5 ใช้คูปอง (ถ้ามีการเลือก)
      if (selectedCoupon) {
        await supabase
          .from("customer_coupons")
          .update({ status: "used", used_at: new Date().toISOString() })
          .eq("id", selectedCoupon.id);
      }

      // 3. ระบบสะสมแต้ม
      let currentPoints = 0;
      let newPoints = 1;
      
      const pointsPerBooking = Number(shopSettings.points_per_booking || 1);
      const pointsRate = Number(shopSettings.points_rate_amount || 0);

      if (booking.customer_id) {
        const { data: customer } = await supabase
          .from("customers")
          .select("points, name")
          .eq("id", booking.customer_id)
          .single();
        
        if (customer) {
          currentPoints = customer.points || 0;
          
          // คำนวณแต้มพื้นฐาน
          const baseEarned = pointsRate > 0 ? Math.floor(finalPrice / pointsRate) : pointsPerBooking;
          
          // คำนวณ Multiplier ตาม Tier
          let multiplier = 1;
          try {
            const tiers = JSON.parse(shopSettings.membership_tiers || "[]");
            // เรียงลำดับจากแต้มมากไปน้อยเพื่อหาขั้นสูงสุดที่ลูกค้าถึง
            const sortedTiers = [...tiers].sort((a: any, b: any) => b.min_points - a.min_points);
            const currentTier = sortedTiers.find((t: any) => currentPoints >= (t.min_points || 0));
            if (currentTier) multiplier = currentTier.multiplier || 1;
          } catch (e) { console.error("Tier calc error:", e); }

          const pointsEarned = Math.max(1, Math.floor(baseEarned * multiplier));
          newPoints = currentPoints + pointsEarned;
          
          await supabase
            .from("customers")
            .update({ points: newPoints })
            .eq("id", booking.customer_id);
          
          toast.success(`จบงานเรียบร้อย! ได้รับ ${pointsEarned} แต้ม (รวม ${newPoints} แต้ม)`, { id: toastId });
        }
      } else {
        toast.success(`จบงานเรียบร้อย!`, { id: toastId });
      }

      const payLabel = PAYMENT_OPTIONS.find((p) => p.value === completePaymentMethod)?.label || completePaymentMethod;

      // 4. ส่งการแจ้งเตือน
      // ตรวจสอบว่า origin เป็น https หรือไม่ (LINE ต้องการ https สำหรับ Link)
      const origin = window.location.origin.replace("http://", "https://");
      const receiptUrl = `${origin}/receipt/${booking.id}`;

      // 4.1 หาแอดมิน (Telegram)
      if (shopSettings.telegram_bot_token && shopSettings.telegram_chat_id) {
        let adminMsg = `✨ <b>จบงานเรียบร้อย!</b>\n\n👤 ลูกค้า: ${booking.customers?.name}\n💰 ยอดชำระ: ฿${finalPrice.toLocaleString()}\n💳 วิธีชำระ: ${payLabel}`;
        if (selectedCoupon) {
          const reward = selectedCoupon.rewards;
          const val = Number(reward.value) || 0;
          const disc = reward.reward_type === "amount" ? val : (reward.reward_type === "percent" ? Math.round(completeFinalPrice * (val / 100)) : 0);
          adminMsg += `\n🎟️ ใช้คูปอง: ${reward.title} (-฿${disc.toLocaleString()})`;
        }
        adminMsg += `\n\n📄 ดูใบเสร็จ: ${receiptUrl}`;

        const url = `https://api.telegram.org/bot${shopSettings.telegram_bot_token}/sendMessage`;
        const chatIds = String(shopSettings.telegram_chat_id).split(",").map(id => id.trim()).filter(Boolean);
        await Promise.all(chatIds.map(id => 
          fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: id, text: adminMsg, parse_mode: "HTML" })
          }).catch(() => {})
        ));
      }


      // 4.2 หาลูกค้า (LINE) ถ้าลูกค้ามี line_id
      const customerLineId = booking.customers?.line_id;
      if (shopSettings.line_channel_token && customerLineId) {
        const pointsEarned = newPoints - currentPoints;
        
        // ส่งเป็นข้อความธรรมดาก่อนเพื่อความชัวร์ (เนื่องจาก Flex Message อาจมีปัญหาเรื่องรูปแบบ)
        const textMessage = `✨ จบงานเรียบร้อย!\n\nขอบคุณคุณ ${booking.customers?.name} ที่มาใช้บริการนะคะ\n💰 ยอดชำระ: ฿${finalPrice.toLocaleString()}\n⭐️ ได้รับแต้มสะสม: +${pointsEarned} แต้ม\n\n📄 ดูใบเสร็จของคุณได้ที่:\n${receiptUrl}\n\nแล้วพบกันใหม่นะคะ! 💅✨`;

        // เรียกใช้ API หลังบ้าน
        const response = await fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: customerLineId,
            message: textMessage
          })
        });
        
        const notifyResult = await response.json();
        console.log("Notification Result:", notifyResult);
        
        if (!response.ok || (notifyResult.results && notifyResult.results.some((r: any) => !r.ok))) {
          const firstError = notifyResult.results?.[0]?.error;
          const errorMessage = firstError?.message || JSON.stringify(firstError) || "Unknown error";
          console.error("LINE Notification failed:", notifyResult);
          toast.error(`ส่ง LINE ไม่สำเร็จ: ${errorMessage}`, { id: toastId });
        } else {
          toast.success("จบงานและส่งใบเสร็จเข้า LINE เรียบร้อย! ✨", { id: toastId });
        }
      } else if (!customerLineId) {
        toast.error("ลูกค้ายังไม่ได้ผูก LINE ระบบจึงไม่สามารถส่งใบเสร็จให้ได้ค่ะ", { icon: "⚠️", id: toastId });
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
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-brand-dark text-sm">
                {selectedDate ? formatDate(selectedDate.toISOString()) : "เลือกวันที่"}
              </h3>
              <p className="text-xs text-slate-400">{dayBookings.length} คิว</p>
            </div>
            {selectedDate && (
              <button 
                onClick={toggleBlockDate}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all ${
                  (shopSettings.closed_dates || "").split(",").filter(Boolean).includes(`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`)
                  ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                  : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {(shopSettings.closed_dates || "").split(",").filter(Boolean).includes(`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`)
                  ? "✕ ปิดรับคิวอยู่" : "🚫 หยุดรับคิววันนี้"}
              </button>
            )}
          </div>

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
                    onClick={() => sendReminder(selectedBooking)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-50 text-rose-700 text-sm font-medium hover:bg-rose-100 transition-colors border border-rose-200"
                  >
                    <Bell size={15} /> แจ้งเตือน
                  </button>
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
                  onClick={() => openConfirmDialog(selectedBooking)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors border border-blue-200"
                >
                  <CheckCircle2 size={15} /> ยืนยัน + ใส่ราคา
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

      {/* ===== Confirm Booking Dialog (ยืนยัน + ใส่ราคา) ===== */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up">
            <div className="px-6 py-4 border-b border-pink-100 flex items-center justify-between">
              <h4 className="font-bold text-brand-dark flex items-center gap-2">
                <CheckCircle2 size={16} className="text-blue-400" /> ยืนยันคิว
              </h4>
              <button onClick={() => setShowConfirmDialog(null)} className="btn-ghost py-1 px-2"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* ข้อมูลคิว */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 space-y-1 text-sm">
                <p className="font-semibold text-brand-dark">{showConfirmDialog.customers?.name || "ลูกค้า"}</p>
                <p className="text-slate-500">{((showConfirmDialog as any).booking_services || []).map((s: any) => s.service_name).join(", ") || "บริการ"}</p>
                <p className="text-slate-400 flex items-center gap-1">
                  <Clock size={12} /> {formatDate(showConfirmDialog.start_time)} · {formatTime(showConfirmDialog.start_time)}
                </p>
              </div>

              {/* เลือกโปรโมชั่น */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">โปรโมชั่น / บุฟเฟ่ต์</label>
                <select
                  className="w-full px-4 py-2 rounded-xl border border-blue-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  value={selectedPromoId || ""}
                  onChange={e => {
                    const promoId = e.target.value;
                    setSelectedPromoId(promoId || null);
                    const promo = promotions.find(p => p.id === promoId);
                    if (promo) setConfirmPrice(promo.price);
                  }}
                >
                  <option value="">-- ไม่มีโปรโมชั่น (ราคาปกติ) --</option>
                  {promotions.map(p => (
                    <option key={p.id} value={p.id}>{p.title} (฿{p.price})</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400">เลือกโปรบุฟเฟ่ต์เพื่อตั้งราคาเหมาทันที</p>
              </div>

              {/* ใส่ราคา */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">ราคาทำเล็บ (฿) *</label>
                <input
                  type="number" min={0} autoFocus
                  value={confirmPrice}
                  onChange={e => setConfirmPrice(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-blue-200 bg-white text-xl font-bold text-brand-dark focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none text-right"
                  placeholder="0"
                />
                <p className="text-xs text-slate-400 mt-1">แอดมินจะโอนไว้ก่อนเพื่อไม่ให้ลืม สามารถแก้ไขได้ที่หน้าแก้ไขคิว</p>
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-2">
              <button onClick={() => setShowConfirmDialog(null)} className="btn-ghost flex-1">ยกเลิก</button>
              <button onClick={confirmBooking} disabled={confirming} className="btn-primary flex-1 justify-center">
                {confirming ? "กำลังบันทึก..." : "✓ ยืนยันคิว"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Complete Booking Dialog (เลือกวิธีชำระ) ===== */}
      {showCompleteDialog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
            <div className="px-8 py-6 border-b border-rose-50 flex items-center justify-between bg-gradient-to-r from-rose-50/30 to-transparent">
              <div>
                <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <CreditCard size={20} className="text-rose-400" /> สรุปยอดและชำระเงิน
                </h4>
                <p className="text-xs text-slate-400 font-medium">ยืนยันการจบงานสำหรับคุณ {showCompleteDialog.customers?.name}</p>
              </div>
              <button onClick={() => setShowCompleteDialog(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={20} /></button>
            </div>

            <div className="p-8 space-y-6">
              {/* รายการบริการสรุป */}
              <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Service Summary</p>
                <p className="text-sm font-bold text-slate-700 leading-relaxed">
                  {((showCompleteDialog as any).booking_services || []).map((s: any) => s.service_name).join(", ") || "บริการทำเล็บ"}
                </p>
              </div>

              {/* ช่องใส่ราคาจริง */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">ราคาค่าบริการจริง (฿) *</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-xl group-focus-within:text-rose-400 transition-colors">฿</div>
                  <input
                    type="number"
                    min={0}
                    value={completeFinalPrice}
                    onChange={e => {
                      setCompleteFinalPrice(Number(e.target.value));
                      setSelectedCoupon(null);
                    }}
                    className="w-full pl-10 pr-6 py-4 rounded-2xl border-2 border-slate-100 bg-white text-2xl font-black text-slate-800 focus:border-rose-200 focus:ring-4 focus:ring-rose-50 transition-all outline-none text-right"
                    placeholder="0"
                    autoFocus
                  />
                </div>
              </div>

              {/* สรุปส่วนลดและมัดจำ */}
              <div className="space-y-3 px-2">
                {customerCoupons.length > 0 && (
                  <div className="pt-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-3 flex items-center gap-2">
                      <Tag size={12} /> คูปองส่วนลดที่ใช้ได้
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {customerCoupons.map(coupon => {
                        const isSelected = selectedCoupon?.id === coupon.id;
                        return (
                          <button
                            key={coupon.id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedCoupon(null);
                                const discVal = Number(coupon.rewards?.value) || 0;
                                if (coupon.rewards?.reward_type === "percent") {
                                  setCompleteFinalPrice(showCompleteDialog.total_price || 0);
                                } else {
                                  setCompleteFinalPrice(completeFinalPrice + discVal);
                                }
                              } else {
                                const discVal = Number(coupon.rewards?.value) || 0;
                                let newPrice = showCompleteDialog.total_price || 0;
                                if (coupon.rewards?.reward_type === "amount") {
                                  newPrice = Math.max(0, newPrice - discVal);
                                } else if (coupon.rewards?.reward_type === "percent") {
                                  newPrice = Math.max(0, newPrice - Math.round(newPrice * (discVal / 100)));
                                }
                                setCompleteFinalPrice(newPrice);
                                setSelectedCoupon(coupon);
                              }
                            }}
                            className={`w-full text-left p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${isSelected ? "bg-rose-50 border-rose-200 shadow-sm" : "bg-white border-slate-50 hover:border-rose-100"}`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? "bg-rose-500 text-white" : "bg-rose-50 text-rose-400"}`}>
                              <Gift size={16} />
                            </div>
                            <div className="flex-1">
                              <p className={`text-xs font-bold ${isSelected ? "text-rose-600" : "text-slate-600"}`}>{coupon.rewards?.title}</p>
                              <p className="text-[10px] text-slate-400">
                                {coupon.rewards?.reward_type === "amount" ? `ลดทันที ฿${coupon.rewards.value}` : `ลด ${coupon.rewards.value}%`}
                              </p>
                            </div>
                            {isSelected && <CheckCircle2 size={16} className="text-rose-500" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="pt-4 space-y-2 border-t border-slate-50">
                  {showCompleteDialog.deposit > 0 && (
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-slate-400">หักมัดจำออนไลน์</span>
                      <span className="text-emerald-500">-฿{showCompleteDialog.deposit.toLocaleString()}</span>
                    </div>
                  )}
                  {selectedCoupon && (
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-slate-400">ส่วนลดคูปอง</span>
                      <span className="text-rose-400">
                        {selectedCoupon.rewards?.reward_type === "amount" 
                          ? `-฿${Number(selectedCoupon.rewards.value).toLocaleString()}` 
                          : `-฿${Math.round((showCompleteDialog.total_price || 0) * (Number(selectedCoupon.rewards.value) / 100)).toLocaleString()}`}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-bold text-slate-700">ยอดที่ต้องชำระเพิ่ม</span>
                    <span className="text-3xl font-black text-rose-500 tracking-tighter">
                      ฿{Math.max(0, completeFinalPrice - (showCompleteDialog.deposit || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* เลือกวิธีชำระ */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">วิธีชำระเงิน</label>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setCompletePaymentMethod(opt.value)}
                      className={`py-3 px-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border-2 transition-all ${
                        completePaymentMethod === opt.value
                          ? "bg-slate-800 border-slate-800 text-white shadow-lg"
                          : "bg-white border-slate-100 text-slate-400 hover:border-rose-100"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={confirmComplete}
                disabled={completing || completeFinalPrice <= 0}
                className="w-full py-4 bg-gradient-to-r from-rose-400 to-pink-500 text-white font-black rounded-2xl shadow-xl shadow-rose-200/50 hover:shadow-rose-300/60 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {completing ? <Loader2 size={20} className="animate-spin" /> : <><CheckCircle2 size={20} /> ยืนยันจบงาน & รับเงิน</>}
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
