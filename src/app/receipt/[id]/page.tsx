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
      .select("*, customers(name, phone), booking_services(service_name, unit_price, line_total, finger_count)")
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
  const totalPrice = booking.total_price || bsList.reduce((s: number, b: any) => s + b.line_total, 0) || 0;
  const deposit = booking.deposit || 0;
  const remaining = isCompleted ? 0 : totalPrice - deposit;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-md mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-500 shadow-sm">
            <CheckCircle2 size={40} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{isCompleted ? "ชำระเงินเรียบร้อย" : "จองคิวสำเร็จแล้ว"}</h1>
          <p className="text-slate-500 mt-1">ขอบคุณที่ใช้บริการ {shopSettings.shop_name} นะคะ ✨</p>
        </div>

        {/* Main Receipt Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100 relative">
          {/* Decorative Top Bar */}
          <div className="h-2 bg-gradient-to-r from-rose-400 to-pink-500" />
          
          <div className="p-8">
            {/* Shop Info */}
            <div className="text-center border-b border-slate-100 pb-6 mb-6">
              <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wide">ใบสรุปรายการ</h2>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">ID: #{booking.id.slice(0, 8).toUpperCase()}</p>
            </div>

            {/* Service Details */}
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
                  <Scissors size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">บริการ</p>
                  <p className="text-brand-dark font-semibold">
                    {bsList.length > 0
                      ? bsList.map((s: any) => `${s.service_name}${s.finger_count ? ` (${s.finger_count} หน่วย)` : ""}`).join(", ")
                      : "ไม่ระบุบริการ"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">วันที่</p>
                    <p className="text-brand-dark font-semibold text-sm">
                      {new Date(booking.start_time).toLocaleDateString("th-TH", { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">เวลา</p>
                    <p className="text-brand-dark font-semibold text-sm">
                      {new Date(booking.start_time).toLocaleTimeString("th-TH", { hour: '2-digit', minute: '2-digit' })} น.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="bg-slate-50 rounded-2xl p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">ราคาบริการรวม</span>
                <span className="text-slate-800 font-bold">฿{totalPrice.toLocaleString()}</span>
              </div>
              {deposit > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-600 font-medium italic">หักมัดจำแล้ว</span>
                  <span className="text-emerald-600 font-bold">-฿{deposit.toLocaleString()}</span>
                </div>
              )}
              <div className="h-px bg-slate-200 my-1" />
              <div className="flex justify-between items-center">
                <span className="text-brand-dark font-bold">{isCompleted ? "ยอดชำระรวม" : "ยอดคงเหลือ"}</span>
                <span className="text-2xl font-black text-rose-500">฿{remaining.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Cut-out circles for receipt look */}
          <div className="absolute left-0 bottom-1/4 w-4 h-8 bg-slate-50 rounded-r-full -translate-x-1" />
          <div className="absolute right-0 bottom-1/4 w-4 h-8 bg-slate-50 rounded-l-full translate-x-1" />
        </div>

        {/* Shop Contact Footer */}
        <div className="mt-8 text-center space-y-4">
          <div className="flex items-center justify-center gap-6 text-slate-400">
            {shopSettings.shop_phone && (
              <a href={`tel:${shopSettings.shop_phone}`} className="flex flex-col items-center gap-1 hover:text-rose-500 transition-colors">
                <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center">
                  <Phone size={18} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest">โทร</span>
              </a>
            )}
            <a href={shopSettings.shop_location_url || "https://maps.app.goo.gl/your-link"} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 hover:text-rose-500 transition-colors">
              <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center">
                <MapPin size={18} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest">พิกัดร้าน</span>
            </a>
            <a href={shopSettings.shop_review_url || "https://facebook.com/your-reviews"} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 hover:text-rose-500 transition-colors">
              <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center">
                <Sparkles size={18} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest">รีวิว</span>
            </a>
          </div>
          
          <p className="text-[10px] text-slate-300 font-medium uppercase tracking-[0.2em]">
            {shopSettings.shop_name} · Professional Nail Art
          </p>
        </div>
      </div>
    </div>
  );
}
