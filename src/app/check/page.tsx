"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Search, Loader2, CalendarDays } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { supabase } from "@/lib/supabase";

export default function CheckBookingPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    try {
      // ค้นหาคิวจากรหัสการจอง
      const { data, error } = await supabase
        .from("bookings")
        .select("booking_code")
        .eq("booking_code", code.trim().toUpperCase())
        .single();

      if (error || !data) {
        // ลองค้นหาจากเบอร์โทร (ดึงคิวล่าสุด)
        const { data: phoneData, error: phoneError } = await supabase
          .from("customers")
          .select("id, bookings(booking_code, created_at)")
          .eq("phone", code.trim())
          .single();
          
        if (!phoneError && phoneData && phoneData.bookings && phoneData.bookings.length > 0) {
          // เรียงตามวันที่สร้างล่าสุด
          const latestBooking = (phoneData.bookings as any[]).sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0];
          router.push(`/book/${latestBooking.booking_code}`);
          return;
        }

        toast.error("ไม่พบข้อมูลคิว หรือรหัสไม่ถูกต้อง");
      } else {
        router.push(`/book/${data.booking_code}`);
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการค้นหา");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FDF2F8] p-5">
      <Toaster position="top-center" />
      
      <header className="max-w-md mx-auto flex items-center gap-3 mb-8 pt-4">
        <button onClick={() => router.push('/')} className="w-10 h-10 rounded-xl bg-white border border-pink-100 flex items-center justify-center text-rose-400 hover:bg-pink-50 transition-colors shadow-sm">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-brand-dark">ค้นหาคิวของคุณ</h1>
          <p className="text-xs text-slate-400">เช็คสถานะ จัดการคิว เลื่อน/ยกเลิก</p>
        </div>
      </header>

      <main className="max-w-md mx-auto">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-pink-100 text-center">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarDays size={28} className="text-rose-400" />
          </div>
          
          <h2 className="text-sm font-semibold text-slate-700 mb-6">
            กรอกรหัสการจอง 6 หลัก <br/> <span className="text-xs font-normal text-slate-400">หรือเบอร์โทรศัพท์ที่ใช้จอง</span>
          </h2>

          <form onSubmit={handleCheck} className="space-y-4">
            <div className="relative">
              <input 
                type="text" 
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="เช่น A1B2C3 หรือ 0812345678"
                className="w-full px-5 py-4 bg-pink-50/50 border border-pink-200 rounded-2xl text-center text-lg tracking-widest font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent uppercase transition-all"
                required
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading || !code.trim()}
              className="w-full py-4 bg-gradient-to-r from-rose-400 to-pink-500 text-white font-bold rounded-2xl shadow-lg shadow-rose-200/50 disabled:opacity-50 flex items-center justify-center gap-2 hover:shadow-xl transition-all"
            >
              {loading ? <><Loader2 size={20} className="animate-spin" /> กำลังค้นหา...</> : <><Search size={20} /> ค้นหาคิว</>}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
