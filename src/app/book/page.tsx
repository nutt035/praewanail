"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Service, ShopSettings, settingsToMap, DEFAULT_SETTINGS } from "@/lib/types";
import {
  Sparkles, ChevronLeft, ChevronRight, Check, Scissors, Clock,
  CalendarDays, User, Phone, FileText, Loader2, Fingerprint, ArrowRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

const STEPS = ["เลือกบริการ", "เลือกวัน-เวลา", "กรอกข้อมูล", "ยืนยันการจอง"];
const THAI_MONTHS = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
const THAI_DAYS = ["อา","จ","อ","พ","พฤ","ศ","ส"];

interface SelectedService { id: string; name: string; price: number; duration: number; price_per_finger: number | null; unit_name: string | null; fingerCount: number; }

export default function BookingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>(DEFAULT_SETTINGS);
  const [selected, setSelected] = useState<SelectedService[]>([]);
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

  useEffect(() => {
    (async () => {
      const [{ data: svcData }, { data: setData }] = await Promise.all([
        supabase.from("services").select("*").order("category").order("price", { ascending: true }),
        supabase.from("shop_settings").select("*"),
      ]);
      setServices((svcData as Service[]) || []);
      if (setData && setData.length > 0) setSettings({ ...DEFAULT_SETTINGS, ...settingsToMap(setData as ShopSettings[]) });
      setLoading(false);
    })();
  }, []);

  // Fetch booking counts for calendar
  useEffect(() => {
    (async () => {
      const start = new Date(calYear, calMonth, 1).toISOString();
      const end = new Date(calYear, calMonth + 1, 0, 23, 59, 59).toISOString();
      const { data } = await supabase.from("bookings").select("start_time").gte("start_time", start).lte("start_time", end).neq("status", "cancelled");
      const counts: Record<number, number> = {};
      (data || []).forEach((b: any) => { const d = new Date(b.start_time).getDate(); counts[d] = (counts[d] || 0) + 1; });
      setDayBookingCounts(counts);
    })();
  }, [calMonth, calYear]);

  const maxPerDay = Number(settings.max_bookings_per_day || 8);

  function toggleService(svc: Service) {
    const exists = selected.find(s => s.id === svc.id);
    if (exists) {
      setSelected(selected.filter(s => s.id !== svc.id));
    } else {
      setSelected([...selected, {
        id: svc.id, name: svc.name, price: svc.price, duration: svc.duration,
        price_per_finger: svc.price_per_finger, unit_name: svc.unit_name,
        fingerCount: svc.price_per_finger != null ? 1 : 1,
      }]);
    }
  }

  const totalPrice = selected.reduce((sum, s) => sum + (s.price_per_finger != null ? s.price_per_finger * s.fingerCount : s.price), 0);
  const totalDuration = selected.reduce((sum, s) => sum + s.duration, 0);
  const depositRequired = totalPrice <= 200
    ? totalPrice  // ยอดน้อย จ่ายเต็ม
    : Math.min(totalPrice, Math.max(100, Math.ceil(totalPrice * 0.3 / 10) * 10));

  // Time slots
  const openH = parseInt(settings.open_time?.split(":")[0] || "9");
  const closeH = parseInt(settings.close_time?.split(":")[0] || "20");
  const timeSlots: string[] = [];
  for (let h = openH; h < closeH; h++) {
    timeSlots.push(`${String(h).padStart(2, "0")}:00`);
    timeSlots.push(`${String(h).padStart(2, "0")}:30`);
  }

  const canNext = step === 0 ? selected.length > 0 : step === 1 ? date && time : step === 2 ? name && phone : true;

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name, phone, services: selected.map(s => ({
            id: s.id, fingerCount: s.price_per_finger != null ? s.fingerCount : null,
          })),
          date, startTime: time, notes,
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
  const today = new Date();

  // Group services by category
  const grouped: Record<string, Service[]> = {};
  services.forEach(s => { const c = s.category || "อื่นๆ"; if (!grouped[c]) grouped[c] = []; grouped[c].push(s); });

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

        {/* Step 0: Select Services */}
        {step === 0 && (
          <div className="space-y-5">
            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat}>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{cat}</h3>
                <div className="space-y-2">
                  {items.map(svc => {
                    const isSelected = selected.some(s => s.id === svc.id);
                    return (
                      <button key={svc.id} onClick={() => toggleService(svc)}
                        className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${isSelected ? "border-rose-400 bg-rose-50 shadow-sm" : "border-pink-100 bg-white hover:border-rose-200"}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? "border-rose-400 bg-rose-400" : "border-slate-300"}`}>
                            {isSelected && <Check size={12} className="text-white" />}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-sm text-brand-dark">{svc.name}</p>
                            <p className="text-xs text-slate-400"><Clock size={10} className="inline" /> {svc.duration} นาที</p>
                          </div>
                          <p className="font-bold text-rose-500">
                            {svc.price_per_finger != null ? `฿${svc.price_per_finger}/${svc.unit_name || "นิ้ว"}` : `฿${svc.price.toLocaleString()}`}
                          </p>
                        </div>
                        {isSelected && svc.price_per_finger != null && (
                          <div className="mt-3 flex items-center gap-2 pl-8" onClick={e => e.stopPropagation()}>
                            <Fingerprint size={14} className="text-violet-400" />
                            <input type="number" min={1} max={20} className="w-16 text-center text-sm font-bold border border-violet-200 rounded-lg py-1 bg-white"
                              value={selected.find(s => s.id === svc.id)?.fingerCount || 1}
                              onChange={e => setSelected(selected.map(s => s.id === svc.id ? { ...s, fingerCount: Math.max(1, Number(e.target.value)) } : s))} />
                            <span className="text-xs text-slate-400">{svc.unit_name || "นิ้ว"}</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
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
                  const isPast = thisDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                  const isSel = date === dateStr;
                  const bookCount = dayBookingCounts[day] || 0;
                  const isFull = bookCount >= maxPerDay;
                  return (
                    <button key={day} disabled={isPast || isFull} onClick={() => setDate(dateStr)}
                      className={`py-2 rounded-xl text-sm font-medium transition-all ${isSel ? "bg-gradient-to-br from-rose-400 to-pink-500 text-white shadow-md" : isPast ? "text-slate-200" : isFull ? "text-slate-300 bg-slate-50" : "hover:bg-pink-50 text-slate-600"}`}>
                      {day}
                      {!isPast && !isFull && bookCount > 0 && <div className={`w-1 h-1 rounded-full mx-auto mt-0.5 ${isSel ? "bg-white/70" : "bg-rose-300"}`} />}
                      {isFull && <p className="text-[8px] text-slate-300">เต็ม</p>}
                    </button>
                  );
                })}
              </div>
            </div>
            {date && (
              <div className="bg-white rounded-2xl border border-pink-100 p-5">
                <h4 className="text-sm font-semibold text-brand-dark mb-3 flex items-center gap-2"><Clock size={14} className="text-rose-400" /> เลือกเวลา</h4>
                <div className="grid grid-cols-4 gap-2">
                  {timeSlots.map(t => (
                    <button key={t} onClick={() => setTime(t)}
                      className={`py-2 rounded-xl text-sm font-medium border transition-all ${time === t ? "bg-rose-400 text-white border-transparent shadow-sm" : "bg-white text-slate-600 border-pink-100 hover:border-rose-300"}`}>
                      {t}
                    </button>
                  ))}
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

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-pink-100 p-5 space-y-3">
              <h4 className="font-semibold text-brand-dark text-sm">สรุปการจอง</h4>
              {selected.map(s => (
                <div key={s.id} className="flex justify-between text-sm">
                  <span className="text-slate-600">{s.name} {s.price_per_finger != null ? `(${s.fingerCount} ${s.unit_name || "นิ้ว"})` : ""}</span>
                  <span className="font-semibold">฿{(s.price_per_finger != null ? s.price_per_finger * s.fingerCount : s.price).toLocaleString()}</span>
                </div>
              ))}
              <div className="h-px bg-pink-100" />
              <div className="flex justify-between text-sm font-bold"><span>ยอดรวม</span><span className="text-rose-600">฿{totalPrice.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm text-rose-500"><span>มัดจำ (30%)</span><span className="font-bold">฿{depositRequired.toLocaleString()}</span></div>
            </div>
            <div className="bg-white rounded-2xl border border-pink-100 p-5 space-y-2 text-sm">
              <div className="flex items-center gap-2"><CalendarDays size={14} className="text-rose-400" /><span>{new Date(date).toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span></div>
              <div className="flex items-center gap-2"><Clock size={14} className="text-rose-400" /><span>{time} น. (ประมาณ {totalDuration} นาที)</span></div>
              <div className="flex items-center gap-2"><User size={14} className="text-rose-400" /><span>{name}</span></div>
              <div className="flex items-center gap-2"><Phone size={14} className="text-rose-400" /><span>{phone}</span></div>
              {notes && <div className="flex items-center gap-2"><FileText size={14} className="text-rose-400" /><span>{notes}</span></div>}
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
            {selected.length > 0 && <p className="text-xs text-slate-400">ยอดรวม <span className="font-bold text-rose-500">฿{totalPrice.toLocaleString()}</span></p>}
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
