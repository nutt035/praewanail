"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Service } from "@/lib/types";
import {
  Plus, Pencil, Trash2, X, Scissors, Clock, Save, Loader2,
  Fingerprint, ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";

const CATEGORIES = ["ทำเล็บมือ", "ทำเล็บเท้า", "ต่อเล็บ", "สปา", "ถอดเล็บ", "อื่นๆ"];
const emptyForm = {
  name: "", price: 0, duration: 30, category: "ทำเล็บมือ",
  price_per_finger: null as number | null, unit_name: "นิ้ว",
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isPerUnit, setIsPerUnit] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchServices(); }, []);

  async function fetchServices() {
    setLoading(true);
    const { data } = await supabase.from("services").select("*")
      .order("category").order("price", { ascending: true });
    setServices((data as Service[]) || []);
    setLoading(false);
  }

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setIsPerUnit(false);
    setShowModal(true);
  }

  function openEdit(s: Service) {
    setEditing(s);
    setForm({
      name: s.name, price: s.price, duration: s.duration,
      category: s.category || "อื่นๆ",
      price_per_finger: s.price_per_finger,
      unit_name: s.unit_name || "นิ้ว",
    });
    setIsPerUnit(s.price_per_finger != null);
    setShowModal(true);
  }

  async function saveService() {
    if (!form.name.trim()) { toast.error("กรุณาใส่ชื่อบริการ"); return; }
    if (form.price <= 0 && !isPerUnit) { toast.error("กรุณาใส่ราคา"); return; }
    setSaving(true);

    const payload = {
      name: form.name, price: form.price, duration: form.duration,
      category: form.category,
      price_per_finger: isPerUnit ? (form.price_per_finger || 0) : null,
      unit_name: isPerUnit ? form.unit_name : null,
    };

    if (editing) {
      const { error } = await supabase.from("services").update(payload).eq("id", editing.id);
      if (error) { toast.error("แก้ไขไม่สำเร็จ"); setSaving(false); return; }
      toast.success("แก้ไขบริการเรียบร้อย ✓");
    } else {
      const { error } = await supabase.from("services").insert([payload]);
      if (error) { toast.error("เพิ่มไม่สำเร็จ"); setSaving(false); return; }
      toast.success("เพิ่มบริการใหม่เรียบร้อย 🎉");
    }
    setSaving(false);
    setShowModal(false);
    fetchServices();
  }

  async function deleteService(s: Service) {
    if (!confirm(`ลบบริการ "${s.name}"?`)) return;
    const { error } = await supabase.from("services").delete().eq("id", s.id);
    if (error) { toast.error("ลบไม่สำเร็จ"); return; }
    toast.success("ลบเรียบร้อย ✓");
    fetchServices();
  }

  // Group by category
  const grouped: Record<string, Service[]> = {};
  services.forEach(s => {
    const cat = s.category || "อื่นๆ";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(s);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">จัดการบริการ ✂️</h2>
          <p className="page-subtitle">เพิ่ม แก้ไข หรือลบรายการบริการของร้าน</p>
        </div>
        <button onClick={openAdd} className="btn-primary"><Plus size={16} /> เพิ่มบริการ</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="text-xs text-slate-400">บริการทั้งหมด</p>
          <p className="text-2xl font-bold text-brand-dark">{services.length} <span className="text-sm font-normal text-slate-400">รายการ</span></p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-slate-400">หมวดหมู่</p>
          <p className="text-2xl font-bold text-brand-dark">{Object.keys(grouped).length} <span className="text-sm font-normal text-slate-400">หมวด</span></p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-slate-400">คิดราคาต่อนิ้ว/ชิ้น</p>
          <p className="text-2xl font-bold text-violet-600">{services.filter(s => s.price_per_finger != null).length} <span className="text-sm font-normal text-slate-400">รายการ</span></p>
        </div>
      </div>

      {/* Service List */}
      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => (
          <div key={i} className="card p-5 animate-pulse"><div className="h-4 bg-pink-100 rounded w-1/2 mb-2" /><div className="h-3 bg-pink-50 rounded w-3/4" /></div>
        ))}</div>
      ) : services.length === 0 ? (
        <div className="card p-16 text-center text-slate-400">
          <Scissors size={36} className="mx-auto mb-3 text-pink-200" />
          <p className="text-sm font-medium">ยังไม่มีบริการ</p>
          <button onClick={openAdd} className="mt-4 text-rose-400 text-sm font-medium hover:underline">+ เพิ่มบริการแรก</button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{cat}</h3>
              <div className="space-y-2">
                {items.map(s => (
                  <div key={s.id} className="card p-4 flex items-center gap-4 hover:border-rose-200 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-100 to-pink-200 flex items-center justify-center shrink-0">
                      <Scissors size={16} className="text-rose-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-brand-dark">{s.name}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                        <span className="flex items-center gap-0.5"><Clock size={11} /> {s.duration} นาที</span>
                        {s.price_per_finger != null && (
                          <span className="flex items-center gap-0.5 text-violet-400"><Fingerprint size={11} /> ต่อ{s.unit_name || "นิ้ว"}</span>
                        )}
                      </div>
                    </div>
                    <p className="text-base font-bold text-rose-500 shrink-0">
                      {s.price_per_finger != null ? `฿${s.price_per_finger}/${s.unit_name || "นิ้ว"}` : `฿${s.price.toLocaleString()}`}
                    </p>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openEdit(s)} className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-100 flex items-center justify-center"><Pencil size={14} /></button>
                      <button onClick={() => deleteService(s)} className="w-8 h-8 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
            <div className="px-6 py-4 border-b border-pink-100 flex justify-between items-center">
              <h4 className="font-bold text-brand-dark">{editing ? "แก้ไขบริการ" : "เพิ่มบริการใหม่"}</h4>
              <button onClick={() => setShowModal(false)} className="btn-ghost py-1 px-2"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="form-label">ชื่อบริการ *</label>
                <input className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="เช่น ทาสีเจล" />
              </div>
              <div>
                <label className="form-label">หมวดหมู่</label>
                <div className="relative">
                  <select className="input-field appearance-none pr-8" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">ราคาเหมา (บาท) *</label>
                  <input type="number" className="input-field" value={form.price} min={0} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="form-label">ระยะเวลา (นาที)</label>
                  <input type="number" className="input-field" value={form.duration} min={5} onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))} />
                </div>
              </div>

              {/* Per-unit pricing */}
              <div className={`p-3 rounded-xl border transition-all ${isPerUnit ? "border-violet-200 bg-violet-50" : "border-pink-100 bg-slate-50"}`}>
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsPerUnit(!isPerUnit)}>
                  <div>
                    <p className="text-sm font-medium text-brand-dark">คิดราคาต่อนิ้ว/ชิ้น</p>
                    <p className="text-xs text-slate-400">เช่น งานเพ้นท์ คิดเป็นนิ้ว</p>
                  </div>
                  <div className={`w-10 h-5 rounded-full transition-all relative shrink-0 ${isPerUnit ? "bg-violet-500" : "bg-slate-200"}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${isPerUnit ? "left-5" : "left-0.5"}`} />
                  </div>
                </div>
                {isPerUnit && (
                  <div className="grid grid-cols-2 gap-3 mt-3" onClick={e => e.stopPropagation()}>
                    <div>
                      <label className="form-label text-violet-600">ราคาต่อหน่วย</label>
                      <input type="number" className="input-field" value={form.price_per_finger || 0} min={0} onChange={e => setForm(f => ({ ...f, price_per_finger: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <label className="form-label text-violet-600">ชื่อหน่วย</label>
                      <input className="input-field" value={form.unit_name} onChange={e => setForm(f => ({ ...f, unit_name: e.target.value }))} placeholder="นิ้ว / ชิ้น" />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="btn-ghost">ยกเลิก</button>
              <button onClick={saveService} disabled={saving} className="btn-primary">
                {saving ? <><Loader2 size={16} className="animate-spin" /> กำลังบันทึก...</> : <><Save size={16} /> บันทึก</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
