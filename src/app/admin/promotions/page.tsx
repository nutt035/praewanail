"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Promotion } from "@/lib/types";
import {
  Plus, Pencil, Trash2, X, Tag, Calendar, ToggleLeft, ToggleRight,
  Loader2, Save, Sparkles, Banknote, Megaphone, Percent,
} from "lucide-react";
import toast from "react-hot-toast";

type PromoType = "buffet" | "bundle" | "discount";

const emptyForm = {
  title: "",
  description: "",
  promotion_type: "buffet" as PromoType,
  price: 0,
  valid_from: "",
  valid_to: "",
  is_active: true,
};

function getPromoStatus(promo: Promotion): "active" | "upcoming" | "expired" | "inactive" {
  if (!promo.is_active) return "inactive";
  const today = new Date().toISOString().split("T")[0];
  if (promo.valid_to && promo.valid_to < today) return "expired";
  if (promo.valid_from && promo.valid_from > today) return "upcoming";
  return "active";
}

const STATUS_CONFIG = {
  active: { label: "ใช้งานอยู่", class: "bg-emerald-50 text-emerald-600 border-emerald-100" },
  upcoming: { label: "ยังไม่ถึงเวลา", class: "bg-amber-50 text-amber-600 border-amber-100" },
  expired: { label: "หมดอายุ", class: "bg-slate-50 text-slate-400 border-slate-100" },
  inactive: { label: "ปิดอยู่", class: "bg-rose-50 text-rose-400 border-rose-100" },
};

const TYPE_CONFIG: Record<PromoType, { label: string; icon: React.ReactNode; color: string }> = {
  buffet: { label: "บุฟเฟ่ต์", icon: <Sparkles size={13} />, color: "text-rose-600 bg-rose-50" },
  bundle: { label: "ชุดคอมโบ", icon: <Tag size={13} />, color: "text-violet-600 bg-violet-50" },
  discount: { label: "ลดราคา", icon: <Banknote size={13} />, color: "text-emerald-600 bg-emerald-50" },
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchPromotions(); }, []);

  async function fetchPromotions() {
    setLoading(true);
    const { data } = await supabase
      .from("promotions")
      .select("*")
      .order("created_at", { ascending: false });
    setPromotions((data as Promotion[]) || []);
    setLoading(false);
  }

  function openAdd() {
    setEditingPromo(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(promo: Promotion) {
    setEditingPromo(promo);
    setForm({
      title: promo.title,
      description: promo.description || "",
      promotion_type: promo.promotion_type,
      price: promo.price,
      valid_from: promo.valid_from || "",
      valid_to: promo.valid_to || "",
      is_active: promo.is_active,
    });
    setShowModal(true);
  }

  async function savePromo() {
    if (!form.title.trim()) { toast.error("กรุณาใส่ชื่อโปรโมชั่น"); return; }
    if (form.price <= 0) {
      toast.error("กรุณาใส่ราคาโปรโมชั่น"); return;
    }
    setSaving(true);

    const payload = {
      title: form.title,
      description: form.description || null,
      promotion_type: form.promotion_type,
      price: form.price,
      valid_from: form.valid_from || null,
      valid_to: form.valid_to || null,
      is_active: form.is_active,
    };

    if (editingPromo) {
      const { error } = await supabase.from("promotions").update(payload).eq("id", editingPromo.id);
      if (error) { toast.error("แก้ไขไม่สำเร็จ"); setSaving(false); return; }
      toast.success("แก้ไขโปรโมชั่นเรียบร้อย ✓");
    } else {
      const { error } = await supabase.from("promotions").insert([payload]);
      if (error) { toast.error("เพิ่มไม่สำเร็จ"); setSaving(false); return; }
      toast.success("เพิ่มโปรโมชั่นใหม่เรียบร้อย 🎉");
    }

    setSaving(false);
    setShowModal(false);
    fetchPromotions();
  }

  async function toggleActive(promo: Promotion) {
    const { error } = await supabase
      .from("promotions")
      .update({ is_active: !promo.is_active })
      .eq("id", promo.id);
    if (error) { toast.error("เกิดข้อผิดพลาด"); return; }
    toast.success(promo.is_active ? "ปิดโปรโมชั่นแล้ว" : "เปิดโปรโมชั่นแล้ว ✓");
    fetchPromotions();
  }

  async function deletePromo(promo: Promotion) {
    if (!confirm(`ลบโปร "${promo.title}"?`)) return;
    const { error } = await supabase.from("promotions").delete().eq("id", promo.id);
    if (error) { toast.error("ลบไม่สำเร็จ"); return; }
    toast.success("ลบโปรโมชั่นเรียบร้อย ✓");
    fetchPromotions();
  }

  const activeCount = promotions.filter((p) => getPromoStatus(p) === "active").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">โปรโมชั่น 🎉</h2>
          <p className="page-subtitle">จัดการโปรพิเศษที่แสดงในหน้าลูกค้า</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={16} /> เพิ่มโปรโมชั่น
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Tag size={18} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400">ใช้งานอยู่</p>
              <p className="text-xl font-bold text-brand-dark">{activeCount} โปร</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center">
              <Megaphone size={18} className="text-rose-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">ทั้งหมด</p>
              <p className="text-xl font-bold text-brand-dark">{promotions.length} โปร</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
              <Percent size={18} className="text-violet-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400">โปรลดราคา</p>
              <p className="text-xl font-bold text-brand-dark">
                {promotions.filter((p) => p.discount_type !== "announcement" && p.is_active).length} โปร
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Promotions List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-pink-100 rounded w-1/2 mb-2" />
              <div className="h-3 bg-pink-50 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : promotions.length === 0 ? (
        <div className="card p-16 text-center text-slate-400">
          <Tag size={36} className="mx-auto mb-3 text-pink-200" />
          <p className="text-sm font-medium">ยังไม่มีโปรโมชั่น</p>
          <p className="text-xs mt-1">กด "เพิ่มโปรโมชั่น" เพื่อสร้างโปรแรก</p>
          <button onClick={openAdd} className="mt-4 text-rose-400 text-sm font-medium hover:underline">
            + เพิ่มโปรโมชั่น
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {promotions.map((promo) => {
            const status = getPromoStatus(promo);
            const statusCfg = STATUS_CONFIG[status];
            const typeCfg = TYPE_CONFIG[promo.discount_type];
            return (
              <div
                key={promo.id}
                className={`card p-5 transition-all ${status === "active" ? "border-emerald-100 hover:border-emerald-200" : "opacity-70 hover:opacity-100"}`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${typeCfg.color}`}>
                    {typeCfg.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-brand-dark text-sm">{promo.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusCfg.class}`}>
                        {statusCfg.label}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeCfg.color}`}>
                        {typeCfg.label}
                        {promo.promotion_type === "buffet" || promo.promotion_type === "bundle" ? ` ฿${promo.price}` : ""}
                      </span>
                    </div>
                    {promo.description && (
                      <p className="text-xs text-slate-500 mb-2 line-clamp-2">{promo.description}</p>
                    )}
                    {(promo.valid_from || promo.valid_to) && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Calendar size={11} />
                        <span>
                          {promo.valid_from ? formatDate(promo.valid_from) : "ทันที"} → {promo.valid_to ? formatDate(promo.valid_to) : "ไม่มีกำหนด"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleActive(promo)}
                      className={`transition-colors ${promo.is_active ? "text-emerald-500 hover:text-emerald-600" : "text-slate-300 hover:text-slate-400"}`}
                      title={promo.is_active ? "คลิกเพื่อปิด" : "คลิกเพื่อเปิด"}
                    >
                      {promo.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                    </button>
                    <button
                      onClick={() => openEdit(promo)}
                      className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-100 flex items-center justify-center"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => deletePromo(promo)}
                      className="w-8 h-8 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
            <div className="px-6 py-4 border-b border-pink-100 flex justify-between items-center">
              <h4 className="font-bold text-brand-dark">
                {editingPromo ? "แก้ไขโปรโมชั่น" : "เพิ่มโปรโมชั่นใหม่"}
              </h4>
              <button onClick={() => setShowModal(false)} className="btn-ghost py-1 px-2">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* ชื่อ */}
              <div>
                <label className="form-label">ชื่อโปรโมชั่น *</label>
                <input
                  className="input-field"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="เช่น เปิดร้านใหม่ ลด 20%"
                />
              </div>

              {/* ประเภทโปรโมชั่น */}
              <div>
                <label className="form-label">ประเภทโปรโมชั่น</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {(["buffet", "bundle", "discount"] as PromoType[]).map((type) => {
                    const cfg = TYPE_CONFIG[type];
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, promotion_type: type }))}
                        className={`py-2 rounded-xl text-xs font-medium border transition-all flex flex-col items-center gap-1 ${form.promotion_type === type
                          ? "bg-rose-400 text-white border-transparent"
                          : "bg-white text-slate-500 border-pink-100 hover:border-rose-200"
                        }`}
                      >
                        {cfg.icon}
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
                {form.promotion_type === "buffet" && (
                  <p className="text-xs text-rose-400 mt-1.5">✨ โปรบุฟเฟ่ต์: เหมาจ่ายราคาเดียว ทำได้ไม่อั้น!</p>
                )}
              </div>

              {/* ราคาโปรโมชั่น */}
              <div>
                <label className="form-label">
                  {form.promotion_type === "discount" ? "มูลค่าส่วนลด (บาท)" : "ราคาโปรโมชั่น (บาท)"}
                </label>
                <input
                  type="number"
                  className="input-field"
                  value={form.price}
                  min={0}
                  onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                  placeholder={form.promotion_type === "discount" ? "เช่น 100" : "เช่น 129"}
                />
              </div>

              {/* รายละเอียด */}
              <div>
                <label className="form-label">รายละเอียด (ไม่บังคับ)</label>
                <textarea
                  className="input-field resize-none"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="เช่น เมื่อทำบริการครบ 2 อย่าง รับส่วนลดเพิ่ม 10%"
                />
              </div>

              {/* ช่วงเวลา */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">วันเริ่มต้น</label>
                  <input
                    type="date"
                    className="input-field"
                    value={form.valid_from}
                    onChange={(e) => setForm((f) => ({ ...f, valid_from: e.target.value }))}
                  />
                  <p className="text-xs text-slate-400 mt-1">ว่างไว้ = เริ่มทันที</p>
                </div>
                <div>
                  <label className="form-label">วันหมดอายุ</label>
                  <input
                    type="date"
                    className="input-field"
                    value={form.valid_to}
                    onChange={(e) => setForm((f) => ({ ...f, valid_to: e.target.value }))}
                  />
                  <p className="text-xs text-slate-400 mt-1">ว่างไว้ = ไม่มีกำหนด</p>
                </div>
              </div>

              {/* เปิด/ปิด */}
              <div
                className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer"
                onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
              >
                <div>
                  <p className="text-sm font-medium text-brand-dark">เปิดใช้งาน</p>
                  <p className="text-xs text-slate-400">แสดงในหน้าลูกค้าทันที</p>
                </div>
                <div className={`w-12 h-6 rounded-full transition-all relative ${form.is_active ? "bg-emerald-500" : "bg-slate-200"}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${form.is_active ? "left-7" : "left-1"}`} />
                </div>
              </div>
            </div>

            <div className="px-6 pb-5 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="btn-ghost">ยกเลิก</button>
              <button onClick={savePromo} disabled={saving} className="btn-primary">
                {saving ? <><Loader2 size={16} className="animate-spin" /> กำลังบันทึก...</> : <><Save size={16} /> บันทึก</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
