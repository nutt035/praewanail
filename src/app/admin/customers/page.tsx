"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Customer, Booking } from "@/lib/types";
import { Users, Search, Phone, StickyNote, ChevronRight, X, Clock, Scissors, CalendarDays, Trophy, Plus, Minus, Save, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", {
    year: "numeric", month: "short", day: "numeric",
  });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  pending: { label: "รอยืนยัน", class: "badge-pending" },
  confirmed: { label: "ยืนยันแล้ว", class: "badge-confirmed" },
  completed: { label: "เสร็จแล้ว", class: "badge-completed" },
  cancelled: { label: "ยกเลิก", class: "badge-cancelled" },
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filtered, setFiltered] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [customerBookings, setCustomerBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [editingPoints, setEditingPoints] = useState(0);
  const [isSavingPoints, setIsSavingPoints] = useState(false);

  useEffect(() => { fetchCustomers(); }, []);
  useEffect(() => {
    const q = query.toLowerCase();
    setFiltered(customers.filter((c) =>
      c.name.toLowerCase().includes(q) || c.phone?.includes(q) || false
    ));
  }, [query, customers]);

  async function fetchCustomers() {
    setLoading(true);
    const { data } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });
    setCustomers((data as Customer[]) || []);
    setFiltered((data as Customer[]) || []);
    setLoading(false);
  }

  async function selectCustomer(customer: Customer) {
    setSelected(customer);
    setEditingPoints(customer.points || 0);
    setLoadingBookings(true);
    const { data } = await supabase
      .from("bookings")
      .select("*, services(name, price, duration)")
      .eq("customer_id", customer.id)
      .order("start_time", { ascending: false });
    setCustomerBookings((data as Booking[]) || []);
    setLoadingBookings(false);
  }

  async function saveManualPoints() {
    if (!selected) return;
    setIsSavingPoints(true);
    try {
      const { error } = await supabase
        .from("customers")
        .update({ points: editingPoints })
        .eq("id", selected.id);
      
      if (error) throw error;
      
      toast.success("อัพเดตแต้มเรียบร้อย");
      setSelected({ ...selected, points: editingPoints });
      // Update customers list too
      setCustomers(customers.map(c => c.id === selected.id ? { ...c, points: editingPoints } : c));
    } catch (err) {
      toast.error("ไม่สามารถอัพเดตแต้มได้");
    } finally {
      setIsSavingPoints(false);
    }
  }

  const totalSpent = customerBookings
    .filter((b) => b.status === "completed")
    .reduce((sum, b) => sum + (b.total_price || b.services?.price || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="page-title">ประวัติลูกค้า 👥</h2>
        <p className="page-subtitle">ดูประวัติการทำเล็บของลูกค้าแต่ละคน</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Customer List */}
        <div className="lg:col-span-2 card flex flex-col" style={{ maxHeight: "75vh" }}>
          {/* Search */}
          <div className="p-4 border-b border-pink-100">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อหรือเบอร์โทร..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="input-field pl-9 text-sm"
              />
              {query && (
                <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-pink-50">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-pink-100 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-pink-100 rounded w-24 animate-pulse" />
                    <div className="h-3 bg-pink-50 rounded w-16 animate-pulse" />
                  </div>
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Users size={28} className="mx-auto mb-2 text-pink-200" />
                <p className="text-sm">ไม่พบลูกค้า</p>
              </div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectCustomer(c)}
                  className={`w-full text-left p-4 flex items-center gap-3 hover:bg-pink-50/60 transition-colors ${selected?.id === c.id ? "bg-rose-50/70 border-l-2 border-rose-400" : ""}`}
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-100 to-pink-200 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-rose-500">{c.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-brand-dark truncate">{c.name}</p>
                    {c.phone && (
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <Phone size={10} /> {c.phone}
                      </p>
                    )}
                  </div>
                  <ChevronRight size={14} className="text-slate-300 shrink-0" />
                </button>
              ))
            )}
          </div>

          <div className="p-3 border-t border-pink-100 text-xs text-center text-slate-400">
            ลูกค้าทั้งหมด {customers.length} คน
          </div>
        </div>

        {/* Customer Detail */}
        <div className="lg:col-span-3">
          {!selected ? (
            <div className="card h-64 flex flex-col items-center justify-center gap-2 text-slate-300">
              <Users size={36} />
              <p className="text-sm">เลือกลูกค้าเพื่อดูประวัติ</p>
            </div>
          ) : (
            <div className="space-y-4 animate-slide-up">
              {/* Customer Profile Card */}
              <div className="card p-5">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-300 to-pink-400 flex items-center justify-center text-white text-xl font-bold shadow-sm">
                    {selected.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-brand-dark">{selected.name}</h3>
                    {selected.phone && (
                      <a href={`tel:${selected.phone}`} className="text-sm text-slate-500 flex items-center gap-1 hover:text-rose-400 transition-colors">
                        <Phone size={13} /> {selected.phone}
                      </a>
                    )}
                    {selected.line_id && (
                      <p className="text-xs text-slate-400 mt-0.5">Line: {selected.line_id}</p>
                    )}
                    {selected.notes && (
                      <div className="flex items-start gap-1.5 mt-2 text-xs text-slate-500">
                        <StickyNote size={12} className="text-rose-400 shrink-0 mt-0.5" />
                        {selected.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Manual Point Adjustment */}
                <div className="mt-6 pt-5 border-t border-pink-50">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Trophy size={12} className="text-yellow-500" /> 
                    จัดการแต้มสะสม
                  </p>
                  <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex-1">
                      <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase">แต้มปัจจุบัน</p>
                      <p className="text-2xl font-black text-brand-dark leading-none">{selected.points || 0}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setEditingPoints(prev => Math.max(0, prev - 1))}
                        className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-500 hover:border-red-100 flex items-center justify-center transition-all shadow-sm"
                      >
                        <Minus size={16} />
                      </button>
                      <input 
                        type="number"
                        className="w-16 text-center text-xl font-bold bg-white border border-slate-200 rounded-xl py-1 focus:outline-none focus:ring-2 focus:ring-rose-400"
                        value={editingPoints}
                        onChange={(e) => setEditingPoints(Number(e.target.value))}
                      />
                      <button 
                        onClick={() => setEditingPoints(prev => prev + 1)}
                        className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-emerald-50 hover:text-emerald-500 hover:border-emerald-100 flex items-center justify-center transition-all shadow-sm"
                      >
                        <Plus size={16} />
                      </button>
                      
                      {editingPoints !== (selected.points || 0) && (
                        <button 
                          onClick={saveManualPoints}
                          disabled={isSavingPoints}
                          className="ml-2 w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-200 animate-in fade-in zoom-in"
                        >
                          {isSavingPoints ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-pink-50">
                  <div className="text-center">
                    <p className="text-lg font-bold text-brand-dark">{customerBookings.length}</p>
                    <p className="text-xs text-slate-400">ครั้งทั้งหมด</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-emerald-600">
                      {customerBookings.filter((b) => b.status === "completed").length}
                    </p>
                    <p className="text-xs text-slate-400">เสร็จแล้ว</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-rose-500">฿{totalSpent.toLocaleString()}</p>
                    <p className="text-xs text-slate-400">ใช้จ่ายรวม</p>
                  </div>
                </div>
              </div>

              {/* Booking History */}
              <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-pink-100">
                  <h4 className="font-semibold text-brand-dark text-sm">ประวัติการทำเล็บ</h4>
                </div>
                <div className="divide-y divide-pink-50 max-h-80 overflow-y-auto">
                  {loadingBookings ? (
                    [...Array(3)].map((_, i) => (
                      <div key={i} className="p-4 flex items-center gap-3">
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-pink-100 rounded w-32 animate-pulse" />
                          <div className="h-3 bg-pink-50 rounded w-20 animate-pulse" />
                        </div>
                      </div>
                    ))
                  ) : customerBookings.length === 0 ? (
                    <div className="py-8 text-center text-slate-400">
                      <CalendarDays size={28} className="mx-auto mb-2 text-pink-200" />
                      <p className="text-sm">ยังไม่มีประวัติการจอง</p>
                    </div>
                  ) : (
                    customerBookings.map((b) => {
                      const cfg = STATUS_LABELS[b.status] || STATUS_LABELS.pending;
                      return (
                        <div key={b.id} className="p-4 flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-50 to-pink-100 flex items-center justify-center shrink-0 mt-0.5">
                            <Scissors size={14} className="text-rose-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold text-brand-dark">{b.services?.name || "ไม่ระบุบริการ"}</p>
                              <span className={`badge ${cfg.class} text-[10px] shrink-0`}>{cfg.label}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              <p className="text-xs text-slate-400 flex items-center gap-1">
                                <CalendarDays size={10} /> {formatDate(b.start_time)}
                              </p>
                              <p className="text-xs text-slate-400 flex items-center gap-1">
                                <Clock size={10} /> {formatTime(b.start_time)}
                              </p>
                            </div>
                            {b.total_price && (
                              <p className="text-xs text-rose-500 font-medium mt-0.5">฿{b.total_price.toLocaleString()}</p>
                            )}
                            {b.notes && <p className="text-xs text-slate-400 mt-1 line-clamp-1">{b.notes}</p>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
