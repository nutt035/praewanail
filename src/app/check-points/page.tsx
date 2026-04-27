"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Trophy, Phone, User, Calendar, Star } from "lucide-react";
import { Customer } from "@/lib/types";
import toast from "react-hot-toast";

export default function CheckPointsPage() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!phone) return;

    setLoading(true);
    setHasSearched(false);
    
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("phone", phone)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          toast.error("ไม่พบข้อมูลลูกค้าจากเบอร์โทรนี้");
          setCustomer(null);
        } else {
          toast.error("เกิดข้อผิดพลาดในการค้นหา");
        }
      } else {
        setCustomer(data);
      }
    } catch (err) {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
      setHasSearched(true);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="text-pink-500 w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">ตรวจสอบแต้มสะสม</h1>
          <p className="text-slate-500 mt-2">กรอกเบอร์โทรศัพท์เพื่อดูคะแนนของคุณ</p>
        </div>

        <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                เบอร์โทรศัพท์
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="tel"
                  placeholder="08xxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-pink-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Search size={18} />
                  ค้นหาข้อมูล
                </>
              )}
            </button>
          </div>
        </form>

        {hasSearched && customer && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-50 text-yellow-500 mb-4">
              <Star fill="currentColor" size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-1">{customer.name}</h2>
            <p className="text-slate-500 text-sm mb-6">{customer.phone}</p>
            
            <div className="bg-slate-50 rounded-2xl p-6 mb-4">
              <p className="text-slate-500 text-sm mb-1 uppercase tracking-wider font-semibold">แต้มสะสมปัจจุบัน</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-5xl font-black text-slate-900">{customer.points || 0}</span>
                <span className="text-slate-400 text-lg font-medium">แต้ม</span>
              </div>
            </div>

            <div className="text-left space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-3 text-slate-600">
                <Calendar size={16} />
                <span className="text-sm">เป็นสมาชิกเมื่อ {new Date(customer.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              {customer.notes && (
                <div className="flex items-start gap-3 text-slate-600">
                  <User size={16} className="mt-0.5" />
                  <span className="text-sm">โน้ต: {customer.notes}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {hasSearched && !customer && !loading && (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Search size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">ไม่พบข้อมูล</h3>
            <p className="text-slate-500 mt-1">ลองตรวจสอบเบอร์โทรศัพท์อีกครั้งนะคะ</p>
          </div>
        )}
      </div>
    </div>
  );
}
