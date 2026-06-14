"use client";

import { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase";
import { settingsToMap, DEFAULT_SETTINGS, ShopSettings } from "@/lib/types";
import { generatePromptPayPayload } from "@/lib/promptpay";
import {
  Sparkles, CheckCircle2, Clock, CalendarDays, Upload, Loader2,
  MessageCircle, Copy, Check, CreditCard, AlertCircle, Phone,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export default function BookingConfirmPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [booking, setBooking] = useState<any>(null);
  const [settings, setSettings] = useState<Record<string, string>>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [slipFile, setSlipFile] = useState<File | null>(null);

  useEffect(() => {
    fetchBooking();
    fetchSettings();
  }, []);

  async function fetchBooking() {
    setLoading(true);
    const res = await fetch(`/api/bookings?code=${code}`);
    const data = await res.json();
    if (data.booking) {
      setBooking(data.booking);
    } else {
      setError("ไม่พบรหัสการจอง");
    }
    setLoading(false);
  }

  async function fetchSettings() {
    const { data } = await supabase.from("shop_settings").select("*");
    if (data && data.length > 0) setSettings({ ...DEFAULT_SETTINGS, ...settingsToMap(data as ShopSettings[]) });
  }

  async function uploadSlip() {
    if (!slipFile) return;
    setUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append("slip", slipFile);
    formData.append("bookingCode", code);

    try {
      const res = await fetch("/api/payments/verify-slip", { method: "POST", body: formData });
      const data = await res.json();
      setUploadResult(data);
      if (data.verified) {
        // Refresh booking data
        setTimeout(fetchBooking, 1000);
      }
    } catch {
      setUploadResult({ success: false, message: "เกิดข้อผิดพลาด" });
    }
    setUploading(false);
  }

  function copyCode() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF2F8] flex items-center justify-center">
        <Loader2 className="animate-spin text-rose-400" size={32} />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-[#FDF2F8] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 text-center max-w-sm border border-pink-100">
          <AlertCircle size={48} className="text-rose-300 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-700 mb-2">ไม่พบการจอง</h2>
          <p className="text-sm text-slate-400">กรุณาตรวจสอบรหัสการจองอีกครั้ง</p>
          <a href="/book" className="mt-6 inline-block px-6 py-3 bg-rose-400 text-white font-bold rounded-xl">จองใหม่</a>
        </div>
      </div>
    );
  }

  const isPaid = booking.deposit_paid;
  const promptPayId = settings.promptpay_id;
  const hasPromptPay = promptPayId && promptPayId.trim() !== "";
  const promptPayPayload = hasPromptPay ? generatePromptPayPayload(promptPayId, booking.deposit_required || 0) : "";
  const lineId = settings.shop_line_id;
  const hasLine = lineId && lineId.trim() !== "";

  return (
    <div className="min-h-screen bg-[#FDF2F8]">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-pink-100 sticky top-0 z-50 isolate">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-sm">
            <Sparkles size={15} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-brand-dark">{settings.shop_name || "Praewa Nail"}</p>
            <p className="text-[10px] text-slate-400">ยืนยันการจอง</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6 space-y-5">
        {/* Success Banner */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white text-center shadow-lg">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 size={28} />
          </div>
          <h2 className="text-xl font-bold mb-1">{isPaid ? "ชำระมัดจำเรียบร้อย! 🎉" : "จองสำเร็จ! 🎉"}</h2>
          <p className="text-emerald-100 text-sm">{isPaid ? "ขั้นตอนต่อไป: ส่งรูปแบบเล็บผ่าน LINE" : "กรุณาชำระมัดจำเพื่อยืนยันการจอง"}</p>
        </div>

        {/* Booking Code */}
        <div className="bg-white rounded-2xl border border-pink-100 p-5 text-center">
          <p className="text-xs text-slate-400 mb-1">รหัสการจอง</p>
          <div className="flex items-center justify-center gap-2">
            <p className="text-3xl font-black tracking-widest text-brand-dark">{code}</p>
            <button onClick={copyCode} className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center text-rose-400 hover:bg-pink-100 transition-colors">
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">💡 เก็บรหัสนี้ไว้ใช้ยืนยันตัวตนผ่าน LINE</p>
        </div>

        {/* Booking Details */}
        <div className="bg-white rounded-2xl border border-pink-100 p-5 space-y-3 text-sm">
          <h4 className="font-semibold text-brand-dark">รายละเอียดการจอง</h4>
          <div className="flex items-center gap-2 text-slate-600"><CalendarDays size={14} className="text-rose-400" />{new Date(booking.start_time).toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" })}</div>
          <div className="flex items-center gap-2 text-slate-600"><Clock size={14} className="text-rose-400" />{new Date(booking.start_time).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.</div>
          {booking.promotions && (
            <div className="flex justify-between">
              <span className="text-slate-600 flex items-center gap-2">
                <Sparkles size={12} className="text-rose-400" /> โปรโมชั่น: {booking.promotions.title}
              </span>
            </div>
          )}
          {!booking.promotions && (
            <div className="flex justify-between">
              <span className="text-slate-600">จองคิวทำเล็บ (ประเมินราคาหน้าร้าน)</span>
            </div>
          )}
          <div className="h-px bg-pink-100" />
          {booking.promotions && (
            <div className="flex justify-between font-bold"><span>ราคาเริ่มต้น</span><span>฿{(booking.promotions.price || 0).toLocaleString()}</span></div>
          )}
          <div className="flex justify-between text-rose-500"><span>มัดจำ</span><span className="font-bold">฿{(booking.deposit_required || 0).toLocaleString()}</span></div>
          {isPaid && <div className="flex items-center gap-2 text-emerald-600 font-semibold"><CheckCircle2 size={14} /> ชำระมัดจำแล้ว ฿{booking.deposit?.toLocaleString()}</div>}
        </div>

        {/* Payment Section */}
        {!isPaid && (
          <div className="bg-white rounded-2xl border-2 border-rose-200 p-5 space-y-4">
            <h4 className="font-bold text-brand-dark flex items-center gap-2"><CreditCard size={16} className="text-rose-400" /> ชำระมัดจำ</h4>

            {hasPromptPay && (
              <div className="text-center">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 inline-block">
                  <QRCodeSVG value={promptPayPayload} size={200} level="M" />
                </div>
                <p className="text-sm font-semibold text-brand-dark mt-3">PromptPay: {promptPayId}</p>
                <p className="text-lg font-black text-rose-600 mt-1">฿{(booking.deposit_required || 0).toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-1">สแกน QR หรือโอนเข้าหมายเลขด้านบน</p>
              </div>
            )}

            <div className="border-t border-pink-100 pt-4">
              <p className="text-xs font-semibold text-slate-500 mb-2">อัพโหลดสลิป</p>
              <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-pink-200 rounded-xl cursor-pointer hover:bg-pink-50/50 transition-colors">
                <Upload size={24} className="text-rose-300" />
                <span className="text-sm text-slate-500">{slipFile ? slipFile.name : "เลือกรูปสลิป"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={e => setSlipFile(e.target.files?.[0] || null)} />
              </label>

              {slipFile && (
                <button onClick={uploadSlip} disabled={uploading}
                  className="w-full mt-3 py-3 bg-gradient-to-r from-rose-400 to-pink-500 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                  {uploading ? <><Loader2 size={16} className="animate-spin" /> กำลังตรวจสอบ...</> : <><Upload size={16} /> ส่งสลิป</>}
                </button>
              )}

              {uploadResult && (
                <div className={`mt-3 p-3 rounded-xl text-sm ${uploadResult.verified ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : uploadResult.success === false ? "bg-rose-50 text-rose-600 border border-rose-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                  {uploadResult.message}
                </div>
              )}
            </div>
          </div>
        )}

        {/* LINE Link */}
        {hasLine && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-5 text-white">
            <h4 className="font-bold flex items-center gap-2 mb-2"><MessageCircle size={16} /> {isPaid ? "ส่งรูปแบบเล็บผ่าน LINE" : "ยืนยันผ่าน LINE"}</h4>
            <p className="text-sm text-green-100 mb-4">
              {isPaid ? "แอดไลน์แล้วส่งรูปลายเล็บที่ต้องการมาได้เลย" : `แอดไลน์แล้วส่งรหัส ${code} เพื่อยืนยัน`}
            </p>
            <a href={`https://line.me/R/ti/p/~${lineId}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 bg-white text-green-600 font-bold rounded-xl shadow-sm hover:shadow-md transition-all">
              <MessageCircle size={18} /> เปิด LINE
            </a>
          </div>
        )}

        {/* Contact & Manage */}
        {settings.shop_phone && (
          <div className="text-center py-4 space-y-4">
            <div>
              <p className="text-xs text-slate-400 mb-2">มีปัญหา? ติดต่อร้านได้เลย</p>
              <a href={`tel:${settings.shop_phone}`} className="inline-flex items-center gap-2 text-sm text-rose-500 font-medium"><Phone size={14} /> {settings.shop_phone}</a>
            </div>
            
            <div className="pt-4 border-t border-pink-100 flex flex-col gap-2">
              <button 
                onClick={async () => {
                  if(confirm("คุณต้องการยกเลิกคิวใช่หรือไม่? (ขอสงวนสิทธิ์ไม่คืนมัดจำในทุกกรณี)")) {
                    try {
                      const res = await fetch("/api/bookings/manage", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "cancel", bookingCode: code })
                      });
                      const data = await res.json();
                      if(data.success) {
                        alert(data.message);
                        window.location.reload();
                      } else {
                        alert(data.error);
                      }
                    } catch {
                      alert("เกิดข้อผิดพลาด");
                    }
                  }
                }}
                className="w-full py-3 bg-white text-rose-500 font-bold rounded-xl border border-rose-200 hover:bg-rose-50 transition-colors text-sm"
              >
                ยกเลิกคิว
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-300 pb-8">© 2025 {settings.shop_name || "Praewa Nail Studio"}</p>
      </main>
    </div>
  );
}
