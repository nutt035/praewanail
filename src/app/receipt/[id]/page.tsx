"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Booking, ShopSettings, settingsToMap, DEFAULT_SETTINGS } from "@/lib/types";
import { CheckCircle2, Scissors, Calendar, Clock, CreditCard, Sparkles, MapPin, Phone, User, Star, Gift, ChevronLeft, Printer, Trophy } from "lucide-react";
import Link from "next/link";

export default function PublicReceiptPage() {
  const params = useParams();
  const id = params.id as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [shopSettings, setShopSettings] = useState<Record<string, string>>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (id) {
      fetchBooking();
      fetchShopSettings();
    }
  }, [id]);

  async function fetchBooking() {
    const { data, error } = await supabase
      .from("bookings")
      .select("*, customers(*), booking_services(service_name, unit_price, line_total, finger_count), promotions(title, price, promotion_type)")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching booking:", error);
      setLoading(false);
      return;
    }

    if (data) setBooking(data as Booking);
    setLoading(false);
  }

  async function fetchShopSettings() {
    const { data } = await supabase.from("shop_settings").select("*");
    if (data && data.length > 0) {
      setShopSettings({ ...DEFAULT_SETTINGS, ...settingsToMap(data as ShopSettings[]) });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF2F8] flex items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-rose-100 border-t-rose-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-[#FDF2F8] flex items-center justify-center p-4 text-center">
        <div className="card p-8 max-w-sm w-full">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Scissors className="text-rose-300" size={32} />
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">ไม่พบข้อมูลใบเสร็จ</h1>
          <p className="text-slate-400 mt-2 text-sm">ขออภัยค่ะ ไม่พบข้อมูลการจองที่คุณค้นหา หรือการจองนี้อาจถูกยกเลิกไปแล้ว</p>
          <Link href="/" className="mt-6 btn-primary w-full justify-center">กลับหน้าหลัก</Link>
        </div>
      </div>
    );
  }

  const isCompleted = booking.status === "completed";
  const bsList = (booking as any).booking_services || [];
  const promo = (booking as any).promotions;

  // ใช้ค่าจาก Database โดยตรงเพื่อความแม่นยำ
  const totalPrice = Number(booking.total_price || 0);
  const discount = Number(booking.discount_amount || 0);
  const finalPaidPrice = Math.max(0, totalPrice - discount);
  const deposit = Number(booking.deposit || 0);
  const remaining = isCompleted ? 0 : Math.max(0, finalPaidPrice - deposit);

  // คำนวณแต้มที่ได้รับ (รวมระบบ Tier Multiplier)
  const pointsRate = Number(shopSettings.points_rate_amount || 500);
  const pointsPerBooking = Number(shopSettings.points_per_booking || 1);
  
  // ถ้ายอดรวมน้อยกว่าเรทที่ตั้งไว้ (เช่น จ่าย 248 แต่ตั้งไว้ 500) ให้ได้แต้มพื้นฐาน (pointsPerBooking)
  const baseEarned = (pointsRate > 0 && finalPaidPrice >= pointsRate) 
    ? Math.floor(finalPaidPrice / pointsRate) 
    : pointsPerBooking;

  let multiplier = 1;
  try {
    const tiers = JSON.parse(shopSettings.membership_tiers || "[]");
    const sortedTiers = [...tiers].sort((a: any, b: any) => b.min_points - a.min_points);
    // ใช้แต้มก่อนหน้าที่ลูกค้ามี (หรือแต้มปัจจุบันถ้าไม่มีข้อมูลแต้มก่อนหน้า)
    const customerPoints = booking.customers?.points || 0;
    const currentTier = sortedTiers.find((t: any) => customerPoints >= (t.min_points || 0));
    if (currentTier) multiplier = currentTier.multiplier || 1;
  } catch (e) { console.error("Tier calc error:", e); }

  const pointsEarned = Math.max(1, Math.floor(baseEarned * multiplier));

  return (
    <div className="min-h-screen bg-[#FDF2F8] py-8 px-5 font-sans">
      <div className="max-w-md mx-auto">
        {/* Luxury Top Branding */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/60 backdrop-blur-sm border border-rose-100 rounded-full mb-3">
            <Sparkles size={12} className="text-rose-400" />
            <span className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em]">Official E-Receipt</span>
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter italic">
            Antonette<span className="text-rose-400">Nail</span>
          </h1>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Nail Studio & Spa</p>
        </div>

        {/* The Main Receipt Card */}
        <div className="relative group animate-slide-up">
          {/* Decorative Back Elements */}
          <div className="absolute inset-0 bg-gradient-to-br from-rose-200/20 to-pink-300/20 rounded-[3rem] blur-2xl -z-10 transform group-hover:scale-105 transition-transform duration-500" />

          <div className="bg-white rounded-[2.5rem] shadow-[0_10px_40px_-10px_rgba(183,110,121,0.2)] overflow-hidden border border-white relative">
            {/* Header Pattern */}
            <div className="h-32 bg-gradient-to-br from-[#B76E79] to-[#E5B5B5] relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_2px_2px,_white_1px,_transparent_0)] bg-[length:24px_24px]" />
              <div className="absolute -bottom-1 left-0 right-0 h-8 bg-white rounded-t-[2.5rem]" />

              <div className="absolute top-8 left-8 right-8 flex justify-between items-start text-white">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Receipt ID</p>
                  <p className="text-xl font-black tracking-tighter">#{booking.id.slice(0, 8).toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Status</p>
                  <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase border border-white/20">
                    {isCompleted ? "PAID" : "DEPOSIT"}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-8 pb-10 pt-2">
              {/* Customer Greeting */}
              <div className="mb-8 text-center">
                <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-3 border-4 border-white shadow-sm">
                  <User size={32} className="text-rose-400" />
                </div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">คุณ {booking.customers?.name || "ลูกค้า"}</h2>
                <p className="text-xs text-slate-400 font-medium">ขอบคุณที่มาทำสวยกับเราในวันนี้นะคะ ✨</p>
              </div>

              {/* Service List */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-2 mb-2">
                  <Scissors size={14} className="text-rose-400" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Service Details</span>
                  <div className="flex-1 h-px bg-rose-50" />
                </div>

                <div className="space-y-3">
                  {promo && (
                    <div className="flex justify-between items-center p-3 bg-rose-50/50 rounded-2xl border border-rose-100/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-rose-400 shadow-sm">
                          <Sparkles size={16} />
                        </div>
                        <span className="text-sm font-bold text-slate-700">{promo.title}</span>
                      </div>
                      <span className="text-xs font-bold text-rose-500">฿{promo.price.toLocaleString()}</span>
                    </div>
                  )}

                  {bsList.map((s: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center px-2">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-700">
                          {s.service_name}
                        </span>
                        {s.finger_count && (
                          <span className="text-[10px] text-slate-400 font-medium">({s.finger_count} {s.unit_name || "หน่วย"})</span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-slate-500">฿{s.line_total.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Points Earned Card */}
              {isCompleted && (
                <div className="bg-gradient-to-br from-emerald-400/10 to-teal-500/10 rounded-3xl p-4 border border-emerald-100 mb-8 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-50">
                      <Star size={20} className="fill-emerald-500" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Points Earned</p>
                      <p className="text-xs font-bold text-slate-700">คุณได้รับแต้มสะสมเพิ่มค่ะ</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-emerald-600">+{pointsEarned}</span>
                    <span className="text-[10px] font-bold text-emerald-500 ml-1">pts</span>
                  </div>
                </div>
              )}

              {/* Pricing Breakdown */}
              <div className="bg-slate-900 rounded-[2rem] p-6 text-white relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-400/10 rounded-full blur-3xl" />

                <div className="space-y-3 relative z-10">
                  <div className="flex justify-between text-xs font-bold text-slate-500">
                    <span>Subtotal</span>
                    <span>฿{totalPrice.toLocaleString()}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-xs font-bold text-rose-400">
                      <span>Discount Applied</span>
                      <span>-฿{discount.toLocaleString()}</span>
                    </div>
                  )}
                  {deposit > 0 && (
                    <div className="flex justify-between text-xs font-bold text-slate-400 italic">
                      <span>Online Deposit Paid</span>
                      <span>-฿{deposit.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="h-px bg-white/10 my-2" />

                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black text-rose-300 uppercase tracking-widest mb-0.5">Total Amount</p>
                      <p className="text-[8px] text-slate-500 uppercase">Net (Thai Baht)</p>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-black tracking-tighter text-white">
                        ฿{totalPrice.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {!isCompleted && (
                    <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center">
                      <span className="text-xs font-bold text-rose-300">Balance Due</span>
                      <span className="text-lg font-black text-white">฿{remaining.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Receipt Footer Info */}
            <div className="px-8 py-6 bg-slate-50 flex flex-wrap justify-between gap-4">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-rose-400" />
                <span className="text-[10px] font-bold text-slate-500">{new Date(booking.start_time).toLocaleDateString("th-TH", { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-rose-400" />
                <span className="text-[10px] font-bold text-slate-500">{new Date(booking.start_time).toLocaleTimeString("th-TH", { hour: '2-digit', minute: '2-digit' })} น.</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard size={14} className="text-rose-400" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">{booking.payment_method || "Pending"}</span>
              </div>
            </div>
          </div>

          {/* Paper cut effect circles */}
          <div className="absolute left-0 bottom-[24%] w-4 h-8 bg-[#FDF2F8] rounded-r-full -translate-x-1" />
          <div className="absolute right-0 bottom-[24%] w-4 h-8 bg-[#FDF2F8] rounded-l-full translate-x-1" />
        </div>

        {/* Footer Navigation */}
        <div className="mt-12 space-y-8 animate-fade-in">
          <div className="flex justify-center gap-8">
            <Link href="/member" className="group flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-white border border-rose-100 flex items-center justify-center text-rose-400 group-hover:bg-rose-400 group-hover:text-white transition-all shadow-sm">
                <Trophy size={20} />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Points</span>
            </Link>
            <button onClick={() => window.print()} className="group flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-white border border-rose-100 flex items-center justify-center text-rose-400 group-hover:bg-rose-400 group-hover:text-white transition-all shadow-sm">
                <Printer size={20} />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Print</span>
            </button>
          </div>

          <div className="text-center space-y-4">
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.4em]">Antonette Nail Studio</p>
            <div className="flex items-center justify-center gap-2">
              <div className="h-px w-8 bg-rose-100" />
              <div className="w-2 h-2 rounded-full bg-rose-200" />
              <div className="h-px w-8 bg-rose-100" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
