"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Service, ShopSettings, settingsToMap, DEFAULT_SETTINGS } from "@/lib/types";
import { Plus, Pencil, Trash2, X, Settings, Clock, Tag, Scissors, Store, Save, Loader2, Sparkles, Fingerprint } from "lucide-react";
import toast from "react-hot-toast";

const CATEGORIES = ["ทำเล็บมือ", "ทำเล็บเท้า", "ต่อเล็บ", "สปา", "ถอดเล็บ", "อื่นๆ"];

const CATEGORY_COLORS: Record<string, string> = {
  "ทำเล็บมือ": "bg-rose-50 text-rose-600",
  "ทำเล็บเท้า": "bg-pink-50 text-pink-600",
  "ต่อเล็บ": "bg-purple-50 text-purple-600",
  "สปา": "bg-blue-50 text-blue-600",
  "ถอดเล็บ": "bg-amber-50 text-amber-600",
  "อื่นๆ": "bg-slate-50 text-slate-600",
};

const emptyForm = {
  name: "",
  price: 0,
  price_per_finger: null as number | null,
  duration: 60,
  category: "ทำเล็บมือ",
  isPerFinger: false,
};

type Tab = "services" | "shop";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("services");

  // === Services state ===
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("ทั้งหมด");

  // === Shop settings state ===
  const [shopSettings, setShopSettings] = useState<Record<string, string>>({ ...DEFAULT_SETTINGS });
  const [savingShop, setSavingShop] = useState(false);

  useEffect(() => {
    fetchServices();
    fetchShopSettings();
  }, []);

  // ──── Services CRUD ────
  async function fetchServices() {
    setLoading(true);
    const { data } = await supabase
      .from("services")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true });
    setServices((data as Service[]) || []);
    setLoading(false);
  }

  function openAdd() {
    setEditingService(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(service: Service) {
    setEditingService(service);
    const isPerFinger = service.price_per_finger != null;
    setForm({
      name: service.name,
      price: service.price,
      price_per_finger: service.price_per_finger ?? null,
      duration: service.duration,
      category: service.category || "อื่นๆ",
      isPerFinger,
    });
    setShowModal(true);
  }

  async function saveService() {
    if (!form.name.trim()) { toast.error("กรุณาใส่ชื่อบริการ"); return; }
    if (form.isPerFinger) {
      if (!form.price_per_finger || form.price_per_finger <= 0) { toast.error("กรุณาใส่ราคาต่อนิ้ว"); return; }
    } else {
      if (form.price <= 0) { toast.error("กรุณาใส่ราคา"); return; }
    }
    setSaving(true);

    const payload = {
      name: form.name,
      price: form.isPerFinger ? 0 : form.price,
      price_per_finger: form.isPerFinger ? form.price_per_finger : null,
      duration: form.duration,
      category: form.category,
    };

    if (editingService) {
      const { error } = await supabase.from("services").update(payload).eq("id", editingService.id);
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

  async function deleteService(service: Service) {
    if (!confirm(`ลบ "${service.name}" ออกจากรายการบริการ?`)) return;
    const { error } = await supabase.from("services").delete().eq("id", service.id);
    if (error) { toast.error("ไม่สามารถลบได้"); return; }
    toast.success("ลบบริการเรียบร้อย ✓");
    fetchServices();
  }

  // ──── Shop settings ────
  async function fetchShopSettings() {
    const { data } = await supabase.from("shop_settings").select("*");
    if (data && data.length > 0) {
      setShopSettings({ ...DEFAULT_SETTINGS, ...settingsToMap(data as ShopSettings[]) });
    }
  }

  async function saveShopSettings() {
    setSavingShop(true);
    const entries = Object.entries(shopSettings);
    for (const [key, value] of entries) {
      await supabase.from("shop_settings").upsert({ key, value }, { onConflict: "key" });
    }
    toast.success("บันทึกการตั้งค่าร้านเรียบร้อย ✓");
    setSavingShop(false);
  }

  const allCategories = ["ทั้งหมด", ...Array.from(new Set(services.map((s) => s.category || "อื่นๆ")))];
  const displayedServices = activeCategory === "ทั้งหมด"
    ? services
    : services.filter((s) => (s.category || "อื่นๆ") === activeCategory);

  // ────────────── Helper แสดงราคา ──────────────
  function displayPrice(service: Service) {
    if (service.price_per_finger != null) return `฿${service.price_per_finger}/นิ้ว`;
    return `฿${service.price.toLocaleString()}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">ตั้งค่าร้าน ⚙️</h2>
          <p className="page-subtitle">จัดการเมนู ราคา และเวลาเปิดปิด</p>
        </div>
        {tab === "services" && (
          <button onClick={openAdd} className="btn-primary">
            <Plus size={16} /> เพิ่มบริการใหม่
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl p-1 border border-pink-100 w-fit">
        <button
          onClick={() => setTab("services")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "services"
              ? "bg-gradient-to-r from-rose-400 to-pink-500 text-white shadow-sm"
              : "text-slate-500 hover:text-brand-dark hover:bg-pink-50"
          }`}
        >
          <Scissors size={15} /> รายการบริการ
        </button>
        <button
          onClick={() => setTab("shop")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "shop"
              ? "bg-gradient-to-r from-rose-400 to-pink-500 text-white shadow-sm"
              : "text-slate-500 hover:text-brand-dark hover:bg-pink-50"
          }`}
        >
          <Store size={15} /> ตั้งค่าร้าน
        </button>
      </div>

      {/* ========== TAB: Services ========== */}
      {tab === "services" && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center">
                  <Scissors size={18} className="text-rose-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">บริการทั้งหมด</p>
                  <p className="text-xl font-bold text-brand-dark">{services.length} รายการ</p>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
                  <Fingerprint size={18} className="text-purple-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">คิดราคาต่อนิ้ว</p>
                  <p className="text-xl font-bold text-brand-dark">
                    {services.filter((s) => s.price_per_finger != null).length} รายการ
                  </p>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Clock size={18} className="text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">เวลาเฉลี่ย</p>
                  <p className="text-xl font-bold text-brand-dark">
                    {services.length ? Math.round(services.reduce((s, v) => s + v.duration, 0) / services.length) : 0} นาที
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${activeCategory === cat
                  ? "bg-gradient-to-r from-rose-400 to-pink-500 text-white border-transparent shadow-sm"
                  : "bg-white text-slate-500 border-pink-100 hover:border-rose-300 hover:text-rose-500"
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="card p-5 animate-pulse">
                  <div className="h-4 bg-pink-100 rounded w-3/4 mb-3" />
                  <div className="h-3 bg-pink-50 rounded w-1/2" />
                </div>
              ))
            ) : displayedServices.length === 0 ? (
              <div className="col-span-3 card p-12 text-center text-slate-400">
                <Settings size={32} className="mx-auto mb-2 text-pink-200" />
                <p className="text-sm">ยังไม่มีบริการในหมวดนี้</p>
                <button onClick={openAdd} className="mt-3 text-rose-400 text-sm font-medium hover:underline">
                  + เพิ่มบริการใหม่
                </button>
              </div>
            ) : (
              displayedServices.map((service) => (
                <div key={service.id} className="card p-5 group hover:border-rose-200 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${CATEGORY_COLORS[service.category || "อื่นๆ"] || CATEGORY_COLORS["อื่นๆ"]}`}>
                        {service.category || "อื่นๆ"}
                      </span>
                      {service.price_per_finger != null && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 flex items-center gap-1">
                          <Fingerprint size={10} /> ต่อนิ้ว
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(service)} className="w-7 h-7 rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-100 flex items-center justify-center">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => deleteService(service)} className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-semibold text-brand-dark text-sm mb-3 leading-snug">{service.name}</h3>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Clock size={13} />
                      <span className="text-xs">{service.duration} นาที</span>
                    </div>
                    <p className="text-lg font-bold gradient-text">{displayPrice(service)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ========== TAB: Shop Settings ========== */}
      {tab === "shop" && (
        <div className="space-y-5 animate-fade-in">
          {/* ข้อมูลร้าน */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-brand-dark mb-4 flex items-center gap-2">
              <Store size={16} className="text-rose-400" />
              ข้อมูลร้าน
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">ชื่อร้าน</label>
                <input
                  className="input-field"
                  value={shopSettings.shop_name}
                  onChange={(e) => setShopSettings((s) => ({ ...s, shop_name: e.target.value }))}
                  placeholder="Praewa Nail Studio"
                />
              </div>
              <div>
                <label className="form-label">Line ID</label>
                <input
                  className="input-field"
                  value={shopSettings.shop_line_id}
                  onChange={(e) => setShopSettings((s) => ({ ...s, shop_line_id: e.target.value }))}
                  placeholder="@praewanail"
                />
              </div>
              <div className="md:col-span-2">
                <label className="form-label">เบอร์โทร</label>
                <input
                  className="input-field"
                  value={shopSettings.shop_phone}
                  onChange={(e) => setShopSettings((s) => ({ ...s, shop_phone: e.target.value }))}
                  placeholder="08X-XXX-XXXX"
                />
              </div>
              <div>
                <label className="form-label">Instagram</label>
                <input
                  className="input-field"
                  value={shopSettings.shop_ig}
                  onChange={(e) => setShopSettings((s) => ({ ...s, shop_ig: e.target.value }))}
                  placeholder="praewanail"
                />
              </div>
              <div>
                <label className="form-label">Facebook (Messenger Link หรือชื่อเพจ)</label>
                <input
                  className="input-field"
                  value={shopSettings.shop_fb}
                  onChange={(e) => setShopSettings((s) => ({ ...s, shop_fb: e.target.value }))}
                  placeholder="m.me/praewanail"
                />
              </div>
            </div>
          </div>

          {/* เวลาเปิดปิด */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-brand-dark mb-4 flex items-center gap-2">
              <Clock size={16} className="text-rose-400" />
              เวลาเปิด-ปิดร้าน
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label">เวลาเปิดร้าน</label>
                <input
                  type="time"
                  className="input-field"
                  value={shopSettings.open_time}
                  onChange={(e) => setShopSettings((s) => ({ ...s, open_time: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label">เวลาปิดร้าน</label>
                <input
                  type="time"
                  className="input-field"
                  value={shopSettings.close_time}
                  onChange={(e) => setShopSettings((s) => ({ ...s, close_time: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label">รับได้สูงสุดต่อวัน (คิว)</label>
                <input
                  type="number"
                  className="input-field"
                  value={shopSettings.max_bookings_per_day}
                  min={1}
                  onChange={(e) => setShopSettings((s) => ({ ...s, max_bookings_per_day: e.target.value }))}
                />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3">
              ⏰ เวลาเปิดปิดจะแสดงในหน้าลูกค้า · จำนวนคิวต่อวันใช้แสดงสถานะว่าง/เต็มในปฏิทิน
            </p>
          </div>

          {/* Preview */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-brand-dark mb-3">ตัวอย่างที่ลูกค้าจะเห็น</h3>
            <div className="flex items-center gap-3 p-4 bg-pink-50 rounded-xl border border-pink-100">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-sm">
                <Sparkles size={16} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-brand-dark">{shopSettings.shop_name || "ชื่อร้าน"}</p>
                <p className="text-xs text-slate-400">
                  เปิด {shopSettings.open_time || "09:00"} – {shopSettings.close_time || "20:00"} น. · รับ {shopSettings.max_bookings_per_day || 8} คิว/วัน
                </p>
              </div>
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <button onClick={saveShopSettings} disabled={savingShop} className="btn-primary">
              {savingShop ? <><Loader2 size={16} className="animate-spin" /> กำลังบันทึก...</> : <><Save size={16} /> บันทึกการตั้งค่า</>}
            </button>
          </div>
        </div>
      )}

      {/* Service Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
            <div className="px-6 py-4 border-b border-pink-100 flex justify-between items-center">
              <h4 className="font-bold text-brand-dark">
                {editingService ? "แก้ไขบริการ" : "เพิ่มบริการใหม่"}
              </h4>
              <button onClick={() => setShowModal(false)} className="btn-ghost py-1 px-2"><X size={16} /></button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="form-label">ชื่อบริการ *</label>
                <input
                  className="input-field"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="เช่น ทาสีเจลมือ + ลายเล็บ"
                />
              </div>

              {/* Toggle: ราคาเหมา vs ต่อนิ้ว */}
              <div>
                <label className="form-label">รูปแบบราคา</label>
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, isPerFinger: false }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${!form.isPerFinger
                      ? "bg-rose-400 text-white border-transparent"
                      : "bg-white text-slate-500 border-pink-100 hover:border-rose-300"
                    }`}
                  >
                    💸 ราคาเหมา
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, isPerFinger: true }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all flex items-center justify-center gap-1.5 ${form.isPerFinger
                      ? "bg-violet-500 text-white border-transparent"
                      : "bg-white text-slate-500 border-pink-100 hover:border-violet-300"
                    }`}
                  >
                    <Fingerprint size={14} /> ต่อนิ้ว
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {form.isPerFinger ? (
                  <div>
                    <label className="form-label">ราคาต่อนิ้ว (บาท) *</label>
                    <input
                      type="number"
                      className="input-field"
                      value={form.price_per_finger ?? ""}
                      min={0}
                      onChange={(e) => setForm((f) => ({ ...f, price_per_finger: Number(e.target.value) }))}
                      placeholder="เช่น 30"
                    />
                    <p className="text-xs text-slate-400 mt-1">เช่น ลาย 1 นิ้ว = 30฿</p>
                  </div>
                ) : (
                  <div>
                    <label className="form-label">ราคา (บาท) *</label>
                    <input
                      type="number"
                      className="input-field"
                      value={form.price}
                      min={0}
                      onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                      placeholder="0"
                    />
                  </div>
                )}
                <div>
                  <label className="form-label">ระยะเวลา (นาที) *</label>
                  <input
                    type="number"
                    className="input-field"
                    value={form.duration}
                    min={15}
                    step={15}
                    onChange={(e) => setForm((f) => ({ ...f, duration: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">หมวดหมู่</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, category: cat }))}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${form.category === cat
                        ? "bg-rose-400 text-white border-transparent"
                        : "bg-white text-slate-500 border-pink-100 hover:border-rose-300"
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 pb-5 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="btn-ghost">ยกเลิก</button>
              <button onClick={saveService} disabled={saving} className="btn-primary">
                {saving ? "กำลังบันทึก..." : editingService ? "บันทึกการแก้ไข" : "เพิ่มบริการ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
