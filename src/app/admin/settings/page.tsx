"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Service, ShopSettings, settingsToMap, DEFAULT_SETTINGS } from "@/lib/types";
import { Plus, Pencil, Trash2, X, Settings, Clock, Tag, Scissors, Store, Save, Loader2, Sparkles, Fingerprint, MessageCircle, CreditCard, Send, Trophy, CheckCircle2 } from "lucide-react";
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
  unit_name: "นิ้ว",
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
      unit_name: service.unit_name || "นิ้ว",
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
      unit_name: form.isPerFinger ? form.unit_name : null,
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
                    </div>
                    <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
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
                    <p className="text-lg font-bold gradient-text">
                      {service.price_per_finger != null 
                        ? `฿${service.price_per_finger.toLocaleString()} / ${service.unit_name || "นิ้ว"}` 
                        : `฿${service.price.toLocaleString()}`}
                    </p>
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

            {/* จ-ศ */}
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">วันจันทร์ – ศุกร์</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="form-label">เปิดร้าน</label>
                <input type="time" className="input-field"
                  value={shopSettings.weekday_open_time || "09:00"}
                  onChange={(e) => setShopSettings((s) => ({ ...s, weekday_open_time: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">ปิดร้าน</label>
                <input type="time" className="input-field"
                  value={shopSettings.weekday_close_time || "20:00"}
                  onChange={(e) => setShopSettings((s) => ({ ...s, weekday_close_time: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">รับคิวสูงสุด/วัน</label>
                <input type="number" min={1} className="input-field"
                  value={shopSettings.weekday_max_bookings || "8"}
                  onChange={(e) => setShopSettings((s) => ({ ...s, weekday_max_bookings: e.target.value }))} />
              </div>
            </div>

            {/* ส-อา */}
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">วันเสาร์ – อาทิตย์</p>
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="form-label">เปิดร้าน</label>
                <input type="time" className="input-field"
                  value={shopSettings.weekend_open_time || "10:00"}
                  onChange={(e) => setShopSettings((s) => ({ ...s, weekend_open_time: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">ปิดร้าน</label>
                <input type="time" className="input-field"
                  value={shopSettings.weekend_close_time || "18:00"}
                  onChange={(e) => setShopSettings((s) => ({ ...s, weekend_close_time: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">รับคิวสูงสุด/วัน</label>
                <input type="number" min={1} className="input-field"
                  value={shopSettings.weekend_max_bookings || "10"}
                  onChange={(e) => setShopSettings((s) => ({ ...s, weekend_max_bookings: e.target.value }))} />
              </div>
            </div>

            {/* วันหยุดประจำ */}
            <div className="border-t border-pink-100 pt-4 mb-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">วันปิดร้านประจำ</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "อา", dow: 0 }, { label: "จ", dow: 1 }, { label: "อ", dow: 2 },
                  { label: "พ", dow: 3 }, { label: "พฤ", dow: 4 }, { label: "ศ", dow: 5 }, { label: "ส", dow: 6 },
                ].map(({ label, dow }) => {
                  const closed = (shopSettings.closed_weekdays || "").split(",").filter(Boolean).map(Number);
                  const isOff = closed.includes(dow);
                  return (
                    <button key={dow} type="button"
                      onClick={() => {
                        const arr = (shopSettings.closed_weekdays || "").split(",").filter(Boolean).map(Number);
                        const next = isOff ? arr.filter(d => d !== dow) : [...arr, dow];
                        setShopSettings(s => ({ ...s, closed_weekdays: next.join(",") }));
                      }}
                      className={`w-12 h-12 rounded-xl text-sm font-bold border-2 transition-all ${
                        isOff
                          ? "bg-red-50 border-red-300 text-red-600"
                          : "bg-white border-pink-100 text-slate-600 hover:border-rose-300"
                      }`}>
                      {label}
                      {isOff && <p className="text-[8px] font-normal">ปิด</p>}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400 mt-2">กดเพื่อตั้งว่าร้านปิดวันนั้นเป็นประจำทุกสัปดาห์</p>
            </div>

            {/* วันหยุดพิเศษ */}
            <div className="border-t border-pink-100 pt-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">วันหยุดพิเศษ (ปีใหม่, สงกรานต์ ฯลฯ)</p>
              <div className="flex gap-2 mb-3">
                <input
                  type="date"
                  id="special-closed-date-picker"
                  className="input-field flex-1"
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const existing = (shopSettings.closed_dates || "").split(",").filter(Boolean);
                    if (!existing.includes(e.target.value)) {
                      setShopSettings(s => ({ ...s, closed_dates: [...existing, e.target.value].join(",") }));
                    }
                    e.target.value = "";
                  }}
                />
                <span className="text-xs text-slate-400 self-center whitespace-nowrap">เลือกวันแล้วเพิ่มอัตโนมัติ</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(shopSettings.closed_dates || "").split(",").filter(Boolean).sort().map(d => (
                  <div key={d} className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 text-xs font-medium px-3 py-1.5 rounded-lg">
                    <span>{new Date(d + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" })}</span>
                    <button type="button" onClick={() => {
                      const next = (shopSettings.closed_dates || "").split(",").filter(x => x !== d);
                      setShopSettings(s => ({ ...s, closed_dates: next.join(",") }));
                    }} className="text-red-400 hover:text-red-700">✕</button>
                  </div>
                ))}
                {!(shopSettings.closed_dates || "").split(",").filter(Boolean).length && (
                  <p className="text-xs text-slate-400 italic">ยังไม่มีวันหยุดพิเศษ</p>
                )}
              </div>
            </div>
          </div>




          {/* การชำระเงินและแจ้งเตือน */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-brand-dark mb-4 flex items-center gap-2">
              <CreditCard size={16} className="text-rose-400" />
              การชำระเงินและแจ้งเตือน (LINE & Telegram)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="form-label">เลขพร้อมเพย์ (สำหรับสร้าง QR มัดจำ)</label>
                <input
                  className="input-field"
                  value={shopSettings.promptpay_id || ""}
                  onChange={(e) => setShopSettings((s) => ({ ...s, promptpay_id: e.target.value }))}
                  placeholder="08XXXXXXXX หรือ เลขบัตรประชาชน"
                />
              </div>

              <div className="border-t border-pink-50 pt-4 md:col-span-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">LINE Messaging API (สำหรับส่งใบเสร็จ)</p>
                <div className="space-y-4">
                  <div>
                    <label className="form-label">LINE Channel Access Token</label>
                    <input
                      type="password"
                      className="input-field"
                      value={shopSettings.line_channel_token || ""}
                      onChange={(e) => setShopSettings((s) => ({ ...s, line_channel_token: e.target.value }))}
                      placeholder="eyJhbGci..."
                    />
                  </div>
                  <div>
                    <label className="form-label">Admin LINE User ID (รับแจ้งเตือนทาง LINE)</label>
                    <input
                      className="input-field"
                      value={shopSettings.admin_line_uid || ""}
                      onChange={(e) => setShopSettings((s) => ({ ...s, admin_line_uid: e.target.value }))}
                      placeholder="Uxxxxxxxxxxxxxxx"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-pink-50 pt-4 md:col-span-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Telegram Notification (Admin)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Bot Token</label>
                    <input
                      type="password"
                      className="input-field"
                      value={shopSettings.telegram_bot_token || ""}
                      onChange={(e) => setShopSettings((s) => ({ ...s, telegram_bot_token: e.target.value }))}
                      placeholder="0000000000:AAxxxxxxxx"
                    />
                  </div>
                  <div>
                    <label className="form-label">Chat ID</label>
                    <input
                      className="input-field"
                      value={shopSettings.telegram_chat_id || ""}
                      onChange={(e) => setShopSettings((s) => ({ ...s, telegram_chat_id: e.target.value }))}
                      placeholder="-100xxxxxxx"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ระบบสมาชิกและแต้มสะสม */}
          <div className="card p-6 border-amber-100 bg-amber-50/10">
            <h3 className="text-sm font-semibold text-amber-700 mb-4 flex items-center gap-2">
              <Trophy size={16} className="text-amber-500" />
              ระบบสมาชิกและแต้มสะสม (Loyalty System)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label text-amber-800">เรทการให้แต้ม (ใช้จ่าย X บาท = 1 แต้ม)</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold group-focus-within:text-amber-500 transition-colors">฿</div>
                  <input
                    type="number"
                    className="input-field pl-10 border-amber-200 focus:border-amber-400 focus:ring-amber-400 font-bold text-amber-700"
                    value={shopSettings.points_rate_amount || "500"}
                    onChange={(e) => setShopSettings((s) => ({ ...s, points_rate_amount: e.target.value }))}
                    placeholder="500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-2">เช่น ตั้งไว้ 500 บาท: ลูกค้าทำเล็บ 1,500 บาท จะได้ 3 แต้ม</p>
              </div>

              <div>
                <label className="form-label text-amber-800">แต้มพื้นฐานต่อการจอง (ถ้าไม่ใช้เรทราคา)</label>
                <input
                  type="number"
                  className="input-field border-amber-200 focus:border-amber-400 focus:ring-amber-400"
                  value={shopSettings.points_per_booking || "1"}
                  onChange={(e) => setShopSettings((s) => ({ ...s, points_per_booking: e.target.value }))}
                />
              </div>

              <div className="md:col-span-2 pt-4 border-t border-amber-100">
                <label className="form-label text-amber-800 mb-3 flex justify-between items-center">
                  <span>ระดับสมาชิกและตัวคูณแต้ม (Membership Tiers)</span>
                  <button 
                    type="button" 
                    onClick={() => {
                      const current = JSON.parse(shopSettings.membership_tiers || "[]");
                      const next = [...current, { name: "New Tier", min_points: 0, multiplier: 1 }];
                      setShopSettings(s => ({ ...s, membership_tiers: JSON.stringify(next) }));
                    }}
                    className="text-[10px] font-bold bg-amber-500 text-white px-3 py-1 rounded-full hover:bg-amber-600 transition-colors"
                  >
                    + เพิ่มระดับ
                  </button>
                </label>
                
                <div className="space-y-3">
                  {JSON.parse(shopSettings.membership_tiers || "[]").map((tier: any, idx: number) => (
                    <div key={idx} className="flex flex-wrap md:flex-nowrap gap-3 items-end bg-white p-4 rounded-2xl border border-amber-100 shadow-sm">
                      <div className="flex-1 min-w-[120px]">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">ชื่อระดับ</label>
                        <input
                          className="input-field text-sm font-bold"
                          value={tier.name}
                          onChange={(e) => {
                            const current = JSON.parse(shopSettings.membership_tiers || "[]");
                            current[idx].name = e.target.value;
                            setShopSettings(s => ({ ...s, membership_tiers: JSON.stringify(current) }));
                          }}
                        />
                      </div>
                      <div className="w-32">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">แต้มขั้นต่ำ</label>
                        <input
                          type="number"
                          className="input-field text-sm"
                          value={tier.min_points}
                          onChange={(e) => {
                            const current = JSON.parse(shopSettings.membership_tiers || "[]");
                            current[idx].min_points = Number(e.target.value);
                            setShopSettings(s => ({ ...s, membership_tiers: JSON.stringify(current) }));
                          }}
                        />
                      </div>
                      <div className="w-32">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">ตัวคูณแต้ม (x)</label>
                        <input
                          type="number"
                          step="0.1"
                          className="input-field text-sm text-amber-600 font-bold"
                          value={tier.multiplier}
                          onChange={(e) => {
                            const current = JSON.parse(shopSettings.membership_tiers || "[]");
                            current[idx].multiplier = Number(e.target.value);
                            setShopSettings(s => ({ ...s, membership_tiers: JSON.stringify(current) }));
                          }}
                        />
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          const current = JSON.parse(shopSettings.membership_tiers || "[]");
                          const next = current.filter((_: any, i: number) => i !== idx);
                          setShopSettings(s => ({ ...s, membership_tiers: JSON.stringify(next) }));
                        }}
                        className="w-10 h-10 rounded-xl bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-100 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SlipOK Settings */}
          <div className="card p-6 border-emerald-100 bg-emerald-50/20">
            <h3 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-2">
              <CreditCard size={16} className="text-emerald-500" />
              ตรวจสลิปอัตโนมัติ (SlipOK)
            </h3>
            <p className="text-[11px] text-slate-400 mb-4">ระบบจะตรวจสอบสลิปโอนเงินจากลูกค้าอัตโนมัติ · สมัครได้ที่ <a href="https://slipok.com" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline">slipok.com</a></p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label text-emerald-700">SlipOK Branch ID</label>
                <input
                  className="input-field border-emerald-200 focus:border-emerald-400 focus:ring-emerald-400"
                  value={shopSettings.slipok_branch_id || ""}
                  onChange={(e) => setShopSettings((s) => ({ ...s, slipok_branch_id: e.target.value }))}
                  placeholder="เช่น 66157"
                />
              </div>
              <div>
                <label className="form-label text-emerald-700">SlipOK API Key</label>
                <input
                  type="password"
                  className="input-field border-emerald-200 focus:border-emerald-400 focus:ring-emerald-400"
                  value={shopSettings.slipok_api_key || ""}
                  onChange={(e) => setShopSettings((s) => ({ ...s, slipok_api_key: e.target.value }))}
                  placeholder="SLIPOKXXXXX"
                />
              </div>
            </div>
            <p className="text-[10px] text-emerald-600 mt-3 italic">* ถ้าไม่ตั้งค่า SlipOK ระบบจะบันทึกสลิปและรอ admin ตรวจสอบเอง</p>
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
                <p className="text-[10px] text-slate-400">
                  เปิด จ-ศ {shopSettings.weekday_open_time || "09:00"}–{shopSettings.weekday_close_time || "20:00"} น. (รับ {shopSettings.weekday_max_bookings || 8} คิว)
                </p>
                <p className="text-[10px] text-slate-400">
                  ส-อา {shopSettings.weekend_open_time || "10:00"}–{shopSettings.weekend_close_time || "18:00"} น. (รับ {shopSettings.weekend_max_bookings || 10} คิว)
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
                    <Fingerprint size={14} /> คิดตามหน่วย
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {form.isPerFinger ? (
                  <div className="space-y-4 col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">ราคาต่อหน่วย (บาท) *</label>
                      <input
                        type="number"
                        className="input-field"
                        value={form.price_per_finger ?? ""}
                        min={0}
                        onChange={(e) => setForm((f) => ({ ...f, price_per_finger: Number(e.target.value) }))}
                        placeholder="เช่น 30"
                      />
                      <p className="text-xs text-slate-400 mt-1">ตัวอย่าง: ลาย 1 นิ้ว / อะไหล่ 1 ชิ้น = 30฿</p>
                    </div>
                    <div>
                      <label className="form-label">ชื่อหน่วย (นิ้ว/ชิ้น/ฯลฯ)</label>
                      <input
                        type="text"
                        className="input-field"
                        value={form.unit_name}
                        onChange={(e) => setForm((f) => ({ ...f, unit_name: e.target.value }))}
                        placeholder="นิ้ว"
                      />
                    </div>
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
