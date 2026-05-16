"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Booking, ShopSettings, settingsToMap, DEFAULT_SETTINGS } from "@/lib/types";
import { CheckCircle2, Scissors, Calendar, Clock, CreditCard, Sparkles, MapPin, Phone } from "lucide-react";

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
      .select("*, customers(name, phone), booking_services(service_name, unit_price, line_total, finger_count), promotions(title, price)")
      .eq("id", id)
      .single();

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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800">ไม่พบข้อมูลใบเสร็จ</h1>
          <p className="text-slate-500 mt-2">ขออภัยค่ะ ไม่พบข้อมูลการจองที่คุณค้นหา</p>
        </div>
      </div>
    );
  }

  const isCompleted = booking.status === "completed";
  const bsList = (booking as any).booking_services || [];
  const promo = (booking as any).promotions;

  // Calculate total based on the system:
  // If it's a buffet, the base price is promo.price
  let subtotal = 0;
  if (promo && promo.promotion_type === "buffet") {
    subtotal = promo.price;
    // Add all services (If unit_price > 0, they are add-ons)
    const addOnsTotal = bsList.reduce((sum: number, b: any) => sum + b.line_total, 0);
    subtotal += addOnsTotal;
  } else {
    subtotal = bsList.reduce((s: number, b: any) => s + b.line_total, 0) || booking.total_price || 0;
  }

  const discount = booking.discount_amount || 0;
  const totalPrice = Math.max(0, subtotal - discount);
  const deposit = booking.deposit || 0;
  const remaining = isCompleted ? 0 : totalPrice - deposit;

  return (
    <div className="min-h-screen bg-[#FDFBF9] py-12 px-4 font-sans text-slate-900">
      <div className="max-w-md mx-auto">
        {/* Luxury Header */}
        <div className="text-center mb-10">
          <div className="inline-block px-4 py-1.5 bg-rose-50 rounded-full mb-4">
            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-[0.2em]">Official Digital Receipt</span>
          </div>
          <h1 className="text-3xl font-serif text-slate-800 tracking-tight">
            {shopSettings.shop_name}
          </h1>
          <p className="text-slate-400 text-sm mt-2 font-medium">ขอบคุณที่วางใจให้เราดูแลความงามให้นะคะ ✨</p>
        </div>

        {/* Main Receipt Card */}
        <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(183,110,121,0.08)] overflow-hidden border border-rose-50/50 relative">
          {/* Decorative Top Bar */}
          <div className="h-3 bg-gradient-to-r from-[#B76E79] via-[#D4A5A5] to-[#B76E79]" />
          
          <div className="p-8 md:p-10">
            {/* Status & ID */}
            <div className="flex justify-between items-start mb-10">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Receipt Number</p>
                <p className="text-sm font-mono font-bold text-slate-700">#{booking.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${isCompleted ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-amber-50 text-amber-600 border border-amber-100"}`}>
                {isCompleted ? "Completed" : "Deposited"}
              </div>
            </div>

            {/* Service & Details Section */}
            <div className="space-y-8 mb-10">
              {/* Promotion (If any) */}
              {promo && (
                <div className="relative p-5 rounded-3xl bg-gradient-to-br from-rose-50/50 to-transparent border border-rose-100/50">
                  <div className="absolute -top-2.5 -right-2.5 bg-[#B76E79] text-white text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest">
                    Promotion
                  </div>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-rose-400 shrink-0">
                      <Sparkles size={24} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">โปรโมชั่นที่ใช้</p>
                      <p className="text-slate-800 font-bold leading-tight">{promo.title}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Main Services List */}
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">
                    <Scissors size={22} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">รายการบริการ</p>
                    <div className="space-y-2">
                      {bsList.length > 0 ? (
                        bsList.map((s: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-baseline group">
                            <span className="text-slate-700 font-semibold text-sm group-hover:text-rose-400 transition-colors">
                              {s.service_name}
                              {s.finger_count ? <span className="text-[10px] text-slate-400 ml-1.5 font-medium">({s.finger_count} {s.unit_name || "หน่วย"})</span> : ""}
                            </span>
                            <span className="text-slate-400 text-xs font-medium">฿{s.line_total.toLocaleString()}</span>
                          </div>
                        ))
                      ) : !promo ? (
                        <p className="text-slate-400 text-sm italic">ไม่ระบุบริการ</p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 pt-2">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">วันที่</p>
                      <p className="text-slate-800 font-bold text-sm tracking-tight">
                        {new Date(booking.start_time).toLocaleDateString("th-TH", { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">
                      <Clock size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">เวลา</p>
                      <p className="text-slate-800 font-bold text-sm tracking-tight">
                        {new Date(booking.start_time).toLocaleTimeString("th-TH", { hour: '2-digit', minute: '2-digit' })} น.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="bg-[#1A1A1A] rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-slate-900/20">
              {/* Decorative circle */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl" />
              
              <div className="space-y-4 relative z-10">
                <div className="flex justify-between text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">
                  <span>Description</span>
                  <span>Amount</span>
                </div>
                
                <div className="h-px bg-white/10" />

                {promo && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400 font-medium">Base Promotion</span>
                    <span className="font-bold">฿{promo.price.toLocaleString()}</span>
                  </div>
                )}

                {!promo && bsList.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400 font-medium">Services Subtotal</span>
                    <span className="font-bold">฿{bsList.reduce((s: number, b: any) => s + b.line_total, 0).toLocaleString()}</span>
                  </div>
                )}

                {promo && bsList.some((b: any) => b.line_total > 0) && (
                  <div className="flex justify-between text-sm border-t border-white/5 pt-3">
                    <span className="text-slate-400 font-medium">Additional Add-ons</span>
                    <span className="font-bold">฿{bsList.reduce((s: number, b: any) => s + b.line_total, 0).toLocaleString()}</span>
                  </div>
                )}

                {discount > 0 && (
                  <div className="flex justify-between text-sm text-rose-300 font-bold italic">
                    <span>Discount Applied</span>
                    <span>-฿{discount.toLocaleString()}</span>
                  </div>
                )}

                {deposit > 0 && (
                  <div className="flex justify-between text-sm text-slate-400 italic">
                    <span>Deposit Paid</span>
                    <span>-฿{deposit.toLocaleString()}</span>
                  </div>
                )}

                <div className="h-px bg-white/20 my-4" />
                
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-300 mb-1">
                      {isCompleted ? "Total Paid" : "Balance Due"}
                    </span>
                    <span className="text-xs text-slate-500">Net Amount (THB)</span>
                  </div>
                  <span className="text-4xl font-serif font-black tracking-tighter">
                    ฿{remaining.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Luxury Cut-out decoration */}
          <div className="absolute left-0 bottom-1/4 w-3 h-6 bg-[#FDFBF9] rounded-r-full" />
          <div className="absolute right-0 bottom-1/4 w-3 h-6 bg-[#FDFBF9] rounded-l-full" />
        </div>

        {/* Shop Contact Footer */}
        <div className="mt-12 text-center">
          <div className="flex items-center justify-center gap-10 mb-8">
            {shopSettings.shop_phone && (
              <a href={`tel:${shopSettings.shop_phone}`} className="group">
                <div className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 group-hover:border-rose-400 group-hover:text-rose-400 transition-all">
                  <Phone size={18} />
                </div>
                <p className="text-[9px] font-black uppercase tracking-widest mt-2 text-slate-300 group-hover:text-rose-400">Call</p>
              </a>
            )}
            <a href={shopSettings.shop_location_url || "#"} target="_blank" rel="noopener noreferrer" className="group">
              <div className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 group-hover:border-rose-400 group-hover:text-rose-400 transition-all">
                <MapPin size={18} />
              </div>
              <p className="text-[9px] font-black uppercase tracking-widest mt-2 text-slate-300 group-hover:text-rose-400">Map</p>
            </a>
            <a href={shopSettings.shop_review_url || "#"} target="_blank" rel="noopener noreferrer" className="group">
              <div className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 group-hover:border-rose-400 group-hover:text-rose-400 transition-all">
                <Sparkles size={18} />
              </div>
              <p className="text-[9px] font-black uppercase tracking-widest mt-2 text-slate-300 group-hover:text-rose-400">Review</p>
            </a>
          </div>
          
          <div className="flex items-center justify-center gap-3 text-slate-200">
            <div className="h-px w-8 bg-slate-100" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] whitespace-nowrap">
              {shopSettings.shop_name}
            </p>
            <div className="h-px w-8 bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
