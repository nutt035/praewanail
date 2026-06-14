"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ShopSettings, Promotion, settingsToMap, DEFAULT_SETTINGS, getOpenClose, isClosedDay } from "@/lib/types";
import {
  Sparkles, ChevronLeft, ChevronRight, Check, Clock,
  CalendarDays, User, Phone, FileText, Loader2, ArrowRight, AlertCircle
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

const STEPS = ["โปรโมชั่น", "วัน-เวลา", "ข้อมูลติดต่อ", "ยืนยันการจอง"];
const THAI_MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const THAI_DAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

const DEPOSIT = 50; // มัดจำตายตัวทุกคน
const DEFAULT_DURATION = 120; // 120 นาที เป็นค่าเริ่มต้นในการบล็อคปฏิทิน

export default function BookingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [settings, setSettings] = useState<ShopSettings>(DEFAULT_SETTINGS);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [promotionId, setPromotionId] = useState<string | null>(null);
  const [activePromotion, setActivePromotion] = useState<Promotion | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [dayBookingCounts, setDayBookingCounts] = useState<Record<number, number>>({});
  const [blockedSlotsMap, setBlockedSlotsMap] = useState<Record<string, Set<string>>>({});

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const promoId = params.get("promo");
      const notesParam = params.get("notes");
      if (notesParam) setNotes(notesParam);

      const [{ data: setData }, { data: promoData }] = await Promise.all([
        supabase.from("shop_settings").select("*"),
        supabase.from("promotions").select("*").eq("is_active", true),
      ]);

      // กรองโปรโมชั่นที่หมดอายุออก
      const today = new Date().toISOString().split("T")[0];
      const activePromos = ((promoData as Promotion[]) || []).filter(p => {
        if (p.valid_from && p.valid_from > today) return false;
        if (p.valid_to && p.valid_to < today) return false;
        return true;
      });
      setPromotions(activePromos);

      if (setData && setData.length > 0) setSettings({ ...DEFAULT_SETTINGS, ...settingsToMap(setData as ShopSettings[]) });

      if (promoId) {
        const { data: promo } = await supabase.from("promotions").select("*").eq("id", promoId).single();
        if (promo) {
          const promoData = promo as Promotion;
          // ตรวจสอบว่าโปรโมชั่นยังไม่หมดอายุ
          const isExpired = (promoData.valid_from && promoData.valid_from > today) || 
                            (promoData.valid_to && promoData.valid_to < today);
          if (!isExpired && promoData.is_active) {
            setPromotionId(promoId);
            setActivePromotion(promoData);
          } else {
            toast.error("โปรโมชั่นนี้หมดอายุแล้วค่ะ");
          }
        }
      }

      setLoading(false);
    })();
  }, []);

  // Fetch booking counts and blocked slots for calendar (with +07:00 offset)
  useEffect(() => {
    (async () => {
      const pad = (n: number) => String(n).padStart(2, "0");
      const startStr = `${calYear}-${pad(calMonth + 1)}-01T00:00:00+07:00`;
      const lastDay = new Date(calYear, calMonth + 1, 0).getDate();
      const endStr = `${calYear}-${pad(calMonth + 1)}-${pad(lastDay)}T23:59:59+07:00`;
      const { data } = await supabase.from("bookings").select("start_time, end_time").gte("start_time", startStr).lte("start_time", endStr).neq("status", "cancelled");

      const counts: Record<number, number> = {};
      const blockedMap: Record<string, Set<string>> = {};

      (data || []).forEach((b: any) => {
        const startDate = new Date(b.start_time);
        const endDate = new Date(b.end_time);
        const d = startDate.getDate();
        counts[d] = (counts[d] || 0) + 1;

        // คำนวณ Slot ที่ถูกจองไปแล้ว
        const dateStr = `${calYear}-${pad(calMonth + 1)}-${pad(d)}`;
        if (!blockedMap[dateStr]) blockedMap[dateStr] = new Set();

        let curr = new Date(startDate.getTime());
        while (curr < endDate) {
          const hours = String(curr.getHours()).padStart(2, "0");
          const mins = String(curr.getMinutes()).padStart(2, "0");
          blockedMap[dateStr].add(`${hours}:${mins}`);
          curr = new Date(curr.getTime() + 30 * 60000); // +30 mins
        }
      });
      setDayBookingCounts(counts);
      setBlockedSlotsMap(blockedMap);
    })();
  }, [calMonth, calYear]);

  const getCapacityForDay = (dateObj: Date) => {
    const dow = dateObj.getDay();
    if (dow === 0 || dow === 6) {
      return Number(settings.weekend_max_bookings || settings.max_bookings_per_day || 10);
    }
    return Number(settings.weekday_max_bookings || settings.max_bookings_per_day || 8);
  };

  function selectPromotion(promo: Promotion) {
    if (promotionId === promo.id) {
      setPromotionId(null);
      setActivePromotion(null);
    } else {
      setPromotionId(promo.id);
      setActivePromotion(promo);
    }
  }

  // --- กรองช่วงเวลา ---
  const selectedDateObj = date ? new Date(date + "T00:00:00") : null;
  const { openTime: openH_str, closeTime: closeH_str } = selectedDateObj
    ? getOpenClose(selectedDateObj, settings)
    : { openTime: settings.weekday_open_time || settings.open_time || "09:00", closeTime: settings.weekday_close_time || settings.close_time || "20:00" };

  const [openH, openM] = openH_str.split(":").map(Number);
  const [closeH, closeM] = closeH_str.split(":").map(Number);
  const closeTotalMins = closeH * 60 + closeM;

  const timeSlots: string[] = [];
  const now = new Date();
  const isToday = date === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();

  // เวลาที่ใช้จองเสมอ คือ DEFAULT_DURATION
  const totalDuration = DEFAULT_DURATION;

  for (let h = openH; h <= closeH; h++) {
    const mins = ["00", "30"];
    for (const m_str of mins) {
      const m = parseInt(m_str);
      const startTotalMins = h * 60 + m;

      // 1. เช็คว่าอยู่ในช่วงเวลาเปิดร้าน
      if (startTotalMins < (openH * 60 + openM)) continue;
      if (startTotalMins >= closeTotalMins) continue;

      // 2. เวลาเริ่ม + เวลาทำ ต้องไม่เกินเวลาปิดร้าน
      if ((startTotalMins + totalDuration) > closeTotalMins) continue;

      // 3. เช็คเวลาที่ผ่านไปแล้ว (กรณีจองวันนี้ เผื่อเวลาเตรียมตัว 30 นาที)
      if (isToday && startTotalMins <= (currentHour * 60 + currentMin + 30)) continue;

      // 4. Smart Gap Closing (ตรวจสอบว่าช่วงเวลาทั้งหมดว่างหรือไม่)
      let isOverlap = false;
      for (let offset = 0; offset < totalDuration; offset += 30) {
        const checkTotalMins = startTotalMins + offset;
        const checkH = Math.floor(checkTotalMins / 60);
        const checkM = checkTotalMins % 60;
        const checkStr = `${String(checkH).padStart(2, "0")}:${String(checkM).padStart(2, "0")}`;
        
        if (blockedSlotsMap[date]?.has(checkStr)) {
          isOverlap = true;
          break; // ชนกับคิวอื่นในช่วย 120 นาทีนี้
        }
      }
      
      if (isOverlap) continue;

      timeSlots.push(`${String(h).padStart(2, "0")}:${m_str}`);
    }
  }

  // ข้ามหน้าโปรโมชั่นได้เลยแม้ไม่เลือกอะไร
  const canNext = step === 0 ? true : step === 1 ? date && time : step === 2 ? name && phone : true;

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name, phone,
          services: [], // ไม่มีให้เลือกล่วงหน้าแล้ว
          date, startTime: time, notes,
          promotionId: promotionId,
        }),
      });
      const data = await res.json();
      if (data.success && data.bookingCode) {
        router.push(`/book/${data.bookingCode}`);
      } else {
        toast.error(data.error || "เกิดข้อผิดพลาด กรุณาลองใหม่");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่");
    }
    finally { setSubmitting(false); }
  }

  // Calendar helpers
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const todayDate = new Date();

  if (loading) return <div className="min-h-screen bg-[#FDF2F8] flex items-center justify-center"><Loader2 className="animate-spin text-rose-400" size={32} /></div>;

  return (
    <div className="min-h-screen bg-[#FDF2F8]">
      <Toaster position="top-center" toastOptions={{ className: "text-sm font-medium" }} />
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-pink-100 sticky top-0 z-50 isolate">
        <div className="max-w-xl mx-auto px-5 py-4 flex items-center gap-3">
          <a href="/" className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center text-rose-400 hover:bg-pink-100 transition-colors">
            <ChevronLeft size={18} />
          </a>
          <div className="flex-1">
            <p className="text-sm font-bold text-brand-dark">{settings.shop_name || "Praewa Nail"}</p>
            <p className="text-[10px] text-slate-400">จองคิวออนไลน์</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-sm">
            <Sparkles size={15} className="text-white" />
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-5 py-6 pb-32">
        {/* Progress */}
        <div className="flex items-center gap-1 mb-6">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-1 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${i <= step ? "bg-gradient-to-br from-rose-400 to-pink-500 text-white shadow-sm" : "bg-pink-100 text-slate-400"}`}>
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 rounded ${i < step ? "bg-rose-300" : "bg-pink-100"}`} />}
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 text-center mb-6">{STEPS[step]}</p>

        {/* Step 0: Select Promotion */}
        {step === 0 && (
          <div className="space-y-6">
            
            {/* Banner แจ้งมัดจำ */}
            <div className="p-4 bg-gradient-to-r from-rose-100 to-pink-100 rounded-2xl border border-rose-200 flex items-start gap-3">
              <div className="mt-1"><AlertCircle size={18} className="text-rose-500" /></div>
              <div>
                <p className="text-sm font-bold text-brand-dark">แจ้งเรื่องการจองคิว</p>
                <p className="text-xs text-slate-600 mt-1">
                  การจองคิวออนไลน์มีค่ามัดจำ <span className="font-bold text-rose-500">50 บาท</span> เพื่อเป็นการล็อคคิวนะคะ (ใช้ลดเป็นค่าทำเล็บหน้างาน) <br/><br/>
                  ลูกค้าสามารถกดเลือกเวลาว่างที่ต้องการได้เลย หลังจากจองคิวแล้วให้ส่งรหัสจองและรูปลายเล็บที่ต้องการให้แอดมินทางไลน์ เพื่อประเมินราคาจริงค่ะ
                </p>
              </div>
            </div>

            {/* Promotion Selector */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">เลือกโปรโมชั่น (ถ้ามี)</h3>
              <div className="grid grid-cols-1 gap-3">
                {promotions.map(p => (
                  <button
                    key={p.id}
                    onClick={() => selectPromotion(p)}
                    className={`p-4 rounded-2xl border-2 transition-all text-left flex items-center justify-between ${promotionId === p.id ? "border-rose-400 bg-rose-50 shadow-sm" : "border-pink-100 bg-white hover:border-rose-200"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${promotionId === p.id ? "bg-rose-400 text-white" : "bg-pink-100 text-rose-400"}`}>
                        <Sparkles size={14} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-brand-dark">{p.title}</p>
                        <p className="text-[10px] text-slate-400">{p.description || "โปรโมชั่นพิเศษ"}</p>
                        {p.valid_to && <p className="text-[10px] text-amber-500">หมดเขต {new Date(p.valid_to).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}</p>}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-rose-500">฿{p.price}</span>
                  </button>
                ))}
                {promotions.length === 0 && <p className="text-xs text-slate-400 italic text-center py-2">ไม่มีโปรโมชั่นในขณะนี้</p>}
              </div>
            </div>

          </div>
        )}

        {/* Step 1: Date & Time */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-pink-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }} className="p-1 hover:bg-pink-50 rounded-lg"><ChevronLeft size={18} /></button>
                <h3 className="font-bold text-brand-dark text-sm">{THAI_MONTHS[calMonth]} {calYear + 543}</h3>
                <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }} className="p-1 hover:bg-pink-50 rounded-lg"><ChevronRight size={18} /></button>
              </div>
              <div className="grid grid-cols-7 mb-1">{THAI_DAYS.map((d, i) => <div key={d} className={`text-center text-xs font-semibold py-1 ${i === 0 ? "text-rose-400" : "text-slate-400"}`}>{d}</div>)}</div>
              <div className="grid grid-cols-7 gap-1">
                {[...Array(firstDay)].map((_, i) => <div key={`e${i}`} />)}
                {[...Array(daysInMonth)].map((_, i) => {
                  const day = i + 1;
                  const thisDate = new Date(calYear, calMonth, day);
                  const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const isPast = thisDate < new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());
                  const isClosed = isClosedDay(thisDate, settings);
                  const isSel = date === dateStr;
                  const bookCount = dayBookingCounts[day] || 0;
                  const maxPerDayForThisDate = getCapacityForDay(thisDate);
                  const isFull = bookCount >= maxPerDayForThisDate;
                  const isDisabled = isPast || isFull || isClosed;
                  return (
                    <button key={day} disabled={isDisabled} onClick={() => setDate(dateStr)}
                      className={`py-2 rounded-xl text-sm font-medium transition-all ${isSel ? "bg-gradient-to-br from-rose-400 to-pink-500 text-white shadow-md"
                          : isPast ? "text-slate-200"
                            : isClosed ? "text-slate-300 bg-slate-50 line-through"
                              : isFull ? "text-slate-300 bg-slate-50"
                                : "hover:bg-pink-50 text-slate-600"
                        }`}>
                      {day}
                      {isClosed && !isPast && <p className="text-[8px] text-slate-300">ปิด</p>}
                      {isFull && !isClosed && !isPast && <p className="text-[8px] text-slate-300">เต็ม</p>}
                      {!isDisabled && bookCount > 0 && <div className={`w-1 h-1 rounded-full mx-auto mt-0.5 ${isSel ? "bg-white/70" : "bg-rose-300"}`} />}
                    </button>
                  );
                })}
              </div>
            </div>
            {date && (
              <div className="bg-white rounded-2xl border border-pink-100 p-5">
                <h4 className="text-sm font-semibold text-brand-dark mb-3 flex items-center gap-2"><Clock size={14} className="text-rose-400" /> เลือกเวลา</h4>
                <div className="grid grid-cols-4 gap-2">
                  {timeSlots.map(t => {
                    return (
                      <button key={t} onClick={() => setTime(t)}
                        className={`py-2 rounded-xl text-sm font-medium border transition-all ${
                            time === t ? "bg-rose-400 text-white border-transparent shadow-sm"
                                : "bg-white text-slate-600 border-pink-100 hover:border-rose-300"
                          }`}>
                        {t}
                      </button>
                    );
                  })}
                  {timeSlots.length === 0 && (
                    <p className="col-span-4 text-center text-xs text-rose-400 py-4">
                      ขออภัยค่ะ ไม่มีช่วงเวลาว่างสำหรับคิวนี้ (หรือติดคิวอื่น)
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Contact Info */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-pink-100 p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">ชื่อ-นามสกุล *</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={name} onChange={e => setName(e.target.value)} placeholder="เช่น คุณพลอย" required className="w-full px-4 py-3 pl-9 rounded-xl border border-pink-200 bg-pink-50/30 text-sm focus:ring-2 focus:ring-rose-400 focus:border-transparent outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">เบอร์โทรศัพท์ *</label>
              <div className="relative">
                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="08X-XXX-XXXX" required className="w-full px-4 py-3 pl-9 rounded-xl border border-pink-200 bg-pink-50/30 text-sm focus:ring-2 focus:ring-rose-400 focus:border-transparent outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">หมายเหตุ</label>
              <div className="relative">
                <FileText size={15} className="absolute left-3 top-3 text-slate-400" />
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="ระบุรายละเอียดเพิ่มเติม..." className="w-full px-4 py-3 pl-9 rounded-xl border border-pink-200 bg-pink-50/30 text-sm focus:ring-2 focus:ring-rose-400 focus:border-transparent outline-none resize-none" />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Summary */}
        {step === 3 && (
          <div className="space-y-4">
            {/* สรุปบริการ */}
            <div className="bg-white rounded-2xl border border-pink-100 p-5 space-y-3">
              <h4 className="font-semibold text-brand-dark text-sm">สรุปการจอง</h4>
              {activePromotion ? (
                <div className="flex items-center gap-2 text-sm">
                  <Sparkles size={12} className="text-rose-400 shrink-0" />
                  <span className="text-slate-700">โปรโมชั่น: {activePromotion.title}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-700">จองคิวทำเล็บ (เลือกบริการและประเมินราคาที่หน้าร้าน)</span>
                </div>
              )}
              
              <div className="h-px bg-pink-100" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-rose-500 font-medium">มัดจำ
                  <span className="text-xs text-slate-400 font-normal ml-1">(ชำระก่อนจองคิว)</span>
                </span>
                <span className="text-lg font-black text-rose-500">฿{DEPOSIT}</span>
              </div>
            </div>
            {/* วัน-เวลา + ข้อมูลจอง */}
            <div className="bg-white rounded-2xl border border-pink-100 p-5 space-y-2 text-sm">
              <div className="flex items-center gap-2"><CalendarDays size={14} className="text-rose-400" /><span>{date ? new Date(date).toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : ""}</span></div>
              <div className="flex items-center gap-2"><Clock size={14} className="text-rose-400" /><span>{time} น.</span></div>
              <div className="flex items-center gap-2"><User size={14} className="text-rose-400" /><span>{name}</span></div>
              <div className="flex items-center gap-2"><Phone size={14} className="text-rose-400" /><span>{phone}</span></div>
              {notes && <div className="flex items-center gap-2"><FileText size={14} className="text-rose-400" /><span>{notes}</span></div>}
            </div>
            {/* ข้อความแจ้งเตือน */}
            <div className="bg-pink-50 rounded-xl p-3 border border-pink-100">
              <p className="text-xs text-center text-slate-600 font-medium">
                หลังจองคิวจะมีรหัสขึ้นให้คุณลูกค้าส่งมาทางไลน์เพื่อยืนยันการจองและส่งลายเล็บที่ต้องการทำ เพื่อประเมินราคาจริงค่ะ
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-pink-100 p-4 z-20">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} className="px-5 py-3 rounded-xl border border-pink-200 text-slate-600 text-sm font-medium hover:bg-pink-50 transition-all">
              <ChevronLeft size={16} className="inline" /> ย้อนกลับ
            </button>
          )}
          <div className="flex-1 text-right">
            {step === 3 && <p className="text-xs text-slate-400">มัดจำ <span className="font-bold text-rose-500">฿{DEPOSIT}</span></p>}
          </div>
          {step < 3 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!canNext}
              className="px-6 py-3 bg-gradient-to-r from-rose-400 to-pink-500 text-white font-bold rounded-xl shadow-lg shadow-rose-200/50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-all hover:shadow-xl">
              ถัดไป <ArrowRight size={16} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting}
              className="px-6 py-3 bg-gradient-to-r from-emerald-400 to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-200/50 disabled:opacity-50 flex items-center gap-2 transition-all hover:shadow-xl">
              {submitting ? <><Loader2 size={16} className="animate-spin" /> กำลังจอง...</> : <><Sparkles size={16} /> ยืนยันจองคิว</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}