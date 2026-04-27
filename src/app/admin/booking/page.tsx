"use client";

import { useState, useEffect } from "react";
import {
  Save, Loader2, User, Phone, Scissors, CalendarDays, Clock, CreditCard,
  FileText, ChevronDown, Banknote, Plus, Trash2, Fingerprint, Tag, Heart,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Service, Customer, Promotion, calcLineTotal, calcDiscountBaht } from "@/lib/types";
import toast from "react-hot-toast";

const paymentMethods = [
  { value: "cash", label: "💵 เงินสด" },
  { value: "promptpay", label: "📱 พร้อมเพย์" },
  { value: "transfer", label: "🏦 โอนเงิน" },
];

// ──── รายการบริการที่เลือกใน form ────
interface ServiceItem {
  tempId: string;           // id ชั่วคราวสำหรับ key
  service: Service;
  fingerCount: number | null; // null = ราคาเหมา
  lineTotal: number;
}

export default function BookingPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  
  const [existingCustomer, setExistingCustomer] = useState<Customer | null>(null);
  const [activeSearchField, setActiveSearchField] = useState<"phone" | "name" | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneSearching, setPhoneSearching] = useState(false);

  // ── บริการที่เลือก ──
  const [selectedItems, setSelectedItems] = useState<ServiceItem[]>([]);
  const [addServiceId, setAddServiceId] = useState("");

  // ── ส่วนลด ──
  const [hasDiscount, setHasDiscount] = useState(false);
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState<"amount" | "percent">("amount");
  const [selectedPromotionId, setSelectedPromotionId] = useState("custom");

  // ── หุ่นลอง ──
  const [isPracticeModel, setIsPracticeModel] = useState(false);
  const [materialCost, setMaterialCost] = useState(50);

  const [formData, setFormData] = useState({
    customerName: "",
    phone: "",
    date: new Date().toISOString().split("T")[0],
    startTime: "10:00",
    deposit: "",
    paymentMethod: "cash",
    notes: "",
  });

  // ──── คำนวณยอดรวม ────
  const servicesSubtotal = selectedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const subtotal = isPracticeModel ? materialCost : servicesSubtotal;
  const discountBaht = isPracticeModel ? 0 : calcDiscountBaht(subtotal, discountValue, discountType);
  const totalPrice = Math.max(0, subtotal - discountBaht);
  const remaining = Math.max(0, totalPrice - Number(formData.deposit || 0));

  // ──── ระยะเวลารวม ────
  const totalDuration = selectedItems.reduce((sum, item) => sum + item.service.duration, 0);
  const endTime = (() => {
    if (!formData.startTime || totalDuration === 0) return "";
    const [h, m] = formData.startTime.split(":").map(Number);
    const totalMins = h * 60 + m + totalDuration;
    const eh = Math.floor(totalMins / 60) % 24;
    const em = totalMins % 60;
    return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
  })();

  const isFormValid = formData.customerName && formData.date && formData.startTime &&
    (isPracticeModel || selectedItems.length > 0);

  useEffect(() => { 
    fetchServices(); 
    fetchCustomers();
    fetchPromotions();
  }, []);

  async function fetchServices() {
    const { data } = await supabase
      .from("services")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true });
    setServices(data || []);
  }

  async function fetchCustomers() {
    const { data } = await supabase
      .from("customers")
      .select("*")
      .order("last_visit_date", { ascending: false, nullsFirst: false });
    setCustomers((data as Customer[]) || []);
  }

  async function fetchPromotions() {
    const { data } = await supabase
      .from("promotions")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    setPromotions((data as Promotion[]) || []);
  }

  // สร้างรายชื่อที่ตรงกับการค้นหา (โทร หรือ ชื่อ)
  const filteredCustomers = customers.filter(c => {
    if (!activeSearchField) return false;
    
    const search = activeSearchField === "name" 
      ? formData.customerName.toLowerCase() 
      : (formData.phone || "").toLowerCase();
      
    if (!search || search.length < 2) return false;
    
    if (activeSearchField === "name") {
      return c.name.toLowerCase().includes(search) || (c.phone && c.phone.includes(search));
    } else {
      return (c.phone && c.phone.includes(search)) || c.name.toLowerCase().includes(search);
    }
  }).slice(0, 5); // เอาแค่ 5 คนแรก

  function selectCustomer(cust: Customer) {
    setExistingCustomer(cust);
    setFormData(prev => ({ ...prev, customerName: cust.name, phone: cust.phone || "" }));
    setActiveSearchField(null);
  }

  // ค้นหาลูกค้าเดิมเมื่อปล่อยพิมพ์ (fallback ถ้าไม่กดเลือกจาก dropdown)
  useEffect(() => {
    if (!formData.phone || formData.phone.length < 9) {
      if (existingCustomer && formData.phone !== existingCustomer.phone) {
        setExistingCustomer(null);
      }
      return;
    }
    const timer = setTimeout(() => {
      const match = customers.find(c => c.phone === formData.phone);
      if (match) {
        setExistingCustomer(match);
        if (!formData.customerName) {
           setFormData(prev => ({ ...prev, customerName: match.name }));
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [formData.phone, customers, formData.customerName]);

  // ──── เพิ่มบริการเข้า list ────
  function addServiceItem() {
    const service = services.find((s) => s.id === addServiceId);
    if (!service) return;
    const fingerCount = service.price_per_finger != null ? 1 : null; // default 1 หน่วย
    const lineTotal = calcLineTotal(service, fingerCount);
    setSelectedItems((prev) => [
      ...prev,
      { tempId: crypto.randomUUID(), service, fingerCount, lineTotal },
    ]);
    setAddServiceId("");
  }

  // อัพเดทจำนวนนิ้ว
  function updateFingerCount(tempId: string, count: number) {
    setSelectedItems((prev) =>
      prev.map((item) => {
        if (item.tempId !== tempId) return item;
        const fingerCount = Math.min(20, Math.max(1, count));
        return { ...item, fingerCount, lineTotal: calcLineTotal(item.service, fingerCount) };
      })
    );
  }

  // ลบบริการออกจาก list
  function removeServiceItem(tempId: string) {
    setSelectedItems((prev) => prev.filter((item) => item.tempId !== tempId));
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  function resetForm() {
    setFormData({
      customerName: "", phone: "",
      date: new Date().toISOString().split("T")[0],
      startTime: "10:00", deposit: "", paymentMethod: "cash", notes: "",
    });
    setSelectedItems([]);
    setAddServiceId("");
    setHasDiscount(false);
    setDiscountValue(0);
    setDiscountType("amount");
    setSelectedPromotionId("custom");
    setIsPracticeModel(false);
    setMaterialCost(50);
    setExistingCustomer(null);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setIsSubmitting(true);
    const toastId = toast.loading("กำลังบันทึกข้อมูล...");

    try {
      // 1. หา/สร้าง customer
      let customerId: string | null = null;
      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const { data: newCustomer, error } = await supabase
          .from("customers")
          .insert([{ name: formData.customerName, phone: formData.phone || null }])
          .select()
          .single();
        if (error) throw error;
        if (newCustomer) customerId = newCustomer.id;
      }

      // 2. คำนวณเวลา
      const startDateTime = new Date(`${formData.date}T${formData.startTime}:00`).toISOString();
      const durationMs = (totalDuration || 60) * 60 * 1000;
      const endDateTime = new Date(new Date(`${formData.date}T${formData.startTime}:00`).getTime() + durationMs).toISOString();

      // 3. บันทึก booking
      const bookingNotes = isPracticeModel
        ? `[หุ่นลอง] ${formData.notes || ""}`.trim()
        : formData.notes || null;

      const { data: newBooking, error: bookingError } = await supabase
        .from("bookings")
        .insert([{
          customer_id: customerId,
          service_id: selectedItems[0]?.service.id || null, // backward compat
          start_time: startDateTime,
          end_time: endDateTime,
          status: "confirmed",
          total_price: totalPrice,
          deposit: formData.deposit ? Number(formData.deposit) : 0,
          payment_method: formData.paymentMethod,
          notes: bookingNotes,
          discount_amount: hasDiscount ? discountValue : 0,
          discount_type: discountType,
          is_practice_model: isPracticeModel,
          material_cost: isPracticeModel ? materialCost : 0,
        }])
        .select()
        .single();

      if (bookingError) throw bookingError;

      // 4. บันทึก booking_services (ถ้าไม่ใช่หุ่นลอง)
      if (!isPracticeModel && selectedItems.length > 0 && newBooking) {
        const bsRows = selectedItems.map((item) => ({
          booking_id: newBooking.id,
          service_id: item.service.id,
          service_name: item.service.name,
          finger_count: item.fingerCount,
          unit_price: item.service.price_per_finger ?? item.service.price,
          line_total: item.lineTotal,
        }));
        await supabase.from("booking_services").insert(bsRows);
      }

      // 5. บันทึก transaction มัดจำ (ถ้ามี)
      if (formData.deposit && Number(formData.deposit) > 0 && newBooking) {
        await supabase.from("transactions").insert([{
          type: "income",
          amount: Number(formData.deposit),
          category: isPracticeModel ? "หุ่นลอง (ค่าอุปกรณ์)" : "มัดจำ",
          booking_id: newBooking.id,
        }]);
      }

      toast.success("บันทึกคิวเรียบร้อยแล้ว! 🎉", { id: toastId });
      resetForm();
    } catch (error) {
      console.error("Error:", error);
      toast.error("ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ──── Services ที่ยังเพิ่มได้ (กรอง duplicate ออก) ────
  const addableServices = services.filter(
    (s) => !selectedItems.some((item) => item.service.id === s.id)
  );

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-7">
        <h2 className="page-title">ลงคิวใหม่ 💅</h2>
        <p className="page-subtitle">บันทึกข้อมูลการจองคิวของลูกค้า</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ══════ โหมดหุ่นลอง ══════ */}
        <div
          className={`card p-4 cursor-pointer transition-all border-2 ${isPracticeModel
            ? "border-violet-300 bg-violet-50"
            : "border-pink-100 hover:border-violet-200"
          }`}
          onClick={() => setIsPracticeModel(!isPracticeModel)}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isPracticeModel ? "bg-violet-500" : "bg-slate-100"}`}>
              <Heart size={18} className={isPracticeModel ? "text-white" : "text-slate-400"} />
            </div>
            <div className="flex-1">
              <p className={`font-semibold text-sm ${isPracticeModel ? "text-violet-700" : "text-brand-dark"}`}>
                💝 โหมดหุ่นลอง (ฝึกมือ)
              </p>
              <p className="text-xs text-slate-400">คิดเฉพาะค่าอุปกรณ์ · ไม่คิดค่าบริการ</p>
            </div>
            <div className={`w-12 h-6 rounded-full transition-all relative ${isPracticeModel ? "bg-violet-500" : "bg-slate-200"}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${isPracticeModel ? "left-7" : "left-1"}`} />
            </div>
          </div>

          {isPracticeModel && (
            <div className="mt-4 pt-4 border-t border-violet-200" onClick={(e) => e.stopPropagation()}>
              <label className="form-label text-violet-700">ค่าอุปกรณ์ที่ใช้ (บาท)</label>
              <input
                type="number"
                className="input-field mt-1"
                value={materialCost}
                min={0}
                onChange={(e) => setMaterialCost(Number(e.target.value))}
                placeholder="50"
              />
              <p className="text-xs text-violet-500 mt-1">💡 ค่าอุปกรณ์เริ่มต้น 50 บาท หรือมากกว่า</p>
            </div>
          )}
        </div>

        {/* ══════ ข้อมูลลูกค้า ══════ */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-brand-dark mb-4 flex items-center gap-2">
            <User size={16} className="text-rose-400" />
            ข้อมูลลูกค้า
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <label className="form-label">เบอร์ติดต่อ / ค้นหาลูกค้าเก่า</label>
              <div className="relative">
                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  onFocus={() => setActiveSearchField("phone")}
                  onBlur={() => setTimeout(() => setActiveSearchField(null), 200)}
                  placeholder="08X-XXX-XXXX หรือพิมพ์ชื่อ"
                  className="input-field pl-9"
                  autoComplete="off"
                />
              </div>
              {existingCustomer && (
                <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                  ✓ เลือกลูกค้าอ้างอิง: <strong>{existingCustomer.name}</strong>
                </p>
              )}
              
              {/* Dropdown ลูกค้าเก่า (ค้นหาจากเบอร์) */}
              {activeSearchField === "phone" && (formData.phone.length > 1) && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-pink-100 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map(cust => (
                      <button
                        key={cust.id}
                        type="button"
                        className="w-full text-left px-4 py-2.5 hover:bg-pink-50 transition-colors border-b border-pink-50 last:border-0 flex justify-between items-center"
                        onClick={() => selectCustomer(cust)}
                      >
                        <span className="font-medium text-sm text-brand-dark">{cust.name}</span>
                        <span className="text-xs text-slate-400">{cust.phone || "ไม่มีเบอร์"}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-slate-400 text-center">ไม่พบลูกค้าเก่า (เพิ่มชื่อใหม่ได้เลย)</div>
                  )}
                </div>
              )}
            </div>
            <div className="relative">
              <label className="form-label">ชื่อลูกค้า <span className="text-rose-400">*</span></label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleChange}
                  onFocus={() => setActiveSearchField("name")}
                  onBlur={() => setTimeout(() => setActiveSearchField(null), 200)}
                  placeholder="เช่น คุณพลอย"
                  required
                  autoComplete="off"
                  className="input-field pl-9"
                />
              </div>
              
              {/* Dropdown ลูกค้าเก่า (ค้นหาจากชื่อ) */}
              {activeSearchField === "name" && (formData.customerName.length > 1) && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-pink-100 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map(cust => (
                      <button
                        key={cust.id}
                        type="button"
                        className="w-full text-left px-4 py-2.5 hover:bg-pink-50 transition-colors border-b border-pink-50 last:border-0 flex justify-between items-center"
                        onClick={() => selectCustomer(cust)}
                      >
                        <span className="font-medium text-sm text-brand-dark">{cust.name}</span>
                        <span className="text-xs text-slate-400">{cust.phone || "ไม่มีเบอร์"}</span>
                      </button>
                    ))
                  ) : (
                     <div className="px-4 py-3 text-sm text-emerald-600 text-center">เป็นลูกค้าใหม่ใช่ไหม? ยินดีต้อนรับครับ 😊</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══════ บริการที่เลือก ══════ */}
        {!isPracticeModel && (
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-brand-dark mb-4 flex items-center gap-2">
              <Scissors size={16} className="text-rose-400" />
              บริการที่ต้องการ <span className="text-rose-400">*</span>
            </h3>

            {/* รายการที่เลือกแล้ว */}
            {selectedItems.length > 0 && (
              <div className="space-y-2 mb-4">
                {selectedItems.map((item) => (
                  <div key={item.tempId} className="flex items-center gap-3 p-3 bg-pink-50 rounded-xl border border-pink-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-brand-dark truncate">{item.service.name}</p>
                      <p className="text-xs text-slate-400">{item.service.duration} นาที</p>
                    </div>

                    {/* จำนวน (ถ้าเป็น per-finger / per-unit) */}
                    {item.service.price_per_finger != null && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Fingerprint size={13} className="text-violet-400" />
                        <input
                          type="number"
                          className="w-14 text-center text-sm font-semibold border border-violet-200 rounded-lg py-1 bg-white"
                          value={item.fingerCount ?? 1}
                          min={1}
                          onChange={(e) => updateFingerCount(item.tempId, Number(e.target.value))}
                        />
                        <span className="text-xs text-slate-400">{item.service.unit_name || "หน่วย"}</span>
                      </div>
                    )}

                    <p className="text-sm font-bold text-rose-500 shrink-0 w-20 text-right">
                      ฿{item.lineTotal.toLocaleString()}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeServiceItem(item.tempId)}
                      className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* เพิ่มบริการ */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Scissors size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                <select
                  value={addServiceId}
                  onChange={(e) => setAddServiceId(e.target.value)}
                  className="input-field pl-9 pr-8 appearance-none"
                >
                  <option value="">-- เลือกบริการ --</option>
                  {addableServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.price_per_finger != null
                        ? ` — ฿${s.price_per_finger} / ${s.unit_name || "หน่วย"}`
                        : ` — ฿${s.price.toLocaleString()}`}
                      {" "}({s.duration} นาที)
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              <button
                type="button"
                onClick={addServiceItem}
                disabled={!addServiceId}
                className="btn-primary shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus size={16} /> เพิ่ม
              </button>
            </div>
          </div>
        )}

        {/* ══════ วันที่ & เวลา ══════ */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-brand-dark mb-4 flex items-center gap-2">
            <CalendarDays size={16} className="text-rose-400" />
            วันที่และเวลา
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">วันที่ทำเล็บ <span className="text-rose-400">*</span></label>
              <div className="relative">
                <CalendarDays size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  className="input-field pl-9"
                />
              </div>
            </div>
            <div>
              <label className="form-label">เวลาเริ่ม <span className="text-rose-400">*</span></label>
              <div className="relative">
                <Clock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="time"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  required
                  className="input-field pl-9"
                />
              </div>
            </div>
          </div>

          {endTime && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 rounded-xl border border-rose-100 mt-4">
              <Clock size={14} className="text-rose-400" />
              <p className="text-sm text-rose-600">
                เสร็จประมาณ <strong>{endTime} น.</strong>
                {totalDuration > 0 && <span className="text-slate-400 ml-2">(รวม {totalDuration} นาที)</span>}
              </p>
            </div>
          )}
        </div>

        {/* ══════ ส่วนลด ══════ */}
        {!isPracticeModel && (
          <div className="card p-6">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => { setHasDiscount(!hasDiscount); if (!hasDiscount) { setDiscountValue(0); } }}
            >
              <h3 className="text-sm font-semibold text-brand-dark flex items-center gap-2">
                <Tag size={16} className="text-rose-400" />
                ส่วนลด (ถ้ามี)
              </h3>
              <div className={`w-12 h-6 rounded-full transition-all relative ${hasDiscount ? "bg-emerald-500" : "bg-slate-200"}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${hasDiscount ? "left-7" : "left-1"}`} />
              </div>
            </div>

            {hasDiscount && (
              <div className="mt-4 pt-4 border-t border-pink-100 animate-fade-in">
                
                {promotions.length > 0 && (
                  <div className="mb-4">
                    <label className="form-label text-sm text-brand-dark mb-1">เลือกจากโปรโมชั่น</label>
                    <select
                      className="input-field bg-emerald-50 border-emerald-200 text-emerald-900"
                      value={selectedPromotionId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedPromotionId(val);
                        if (val !== "custom") {
                          const promo = promotions.find(p => p.id === val);
                          if (promo && promo.discount_type !== "announcement") {
                            setDiscountType(promo.discount_type === "amount" ? "amount" : "percent");
                            setDiscountValue(promo.discount_value);
                          }
                        }
                      }}
                    >
                      <option value="custom">-- พิมพ์ส่วนลดเอง (Custom) --</option>
                      {promotions.filter(p => p.discount_type !== 'announcement').map(p => (
                        <option key={p.id} value={p.id}>
                          {p.title} (ลด {p.discount_type === 'percent' ? p.discount_value + '%' : p.discount_value + ' บ.'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedPromotionId === "custom" ? (
                  <>
                    <div className="flex gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => setDiscountType("amount")}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${discountType === "amount"
                          ? "bg-emerald-500 text-white border-transparent"
                          : "bg-white text-slate-500 border-pink-100 hover:border-emerald-300"
                        }`}
                      >
                        ฿ ลดเป็นบาท
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountType("percent")}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${discountType === "percent"
                          ? "bg-emerald-500 text-white border-transparent"
                          : "bg-white text-slate-500 border-pink-100 hover:border-emerald-300"
                        }`}
                      >
                        % ลดเป็นเปอร์เซ็นต์
                      </button>
                    </div>
                    <input
                      type="number"
                      className="input-field border-emerald-200 focus:border-emerald-400 focus:ring-emerald-400"
                      value={discountValue}
                      min={0}
                      max={discountType === "percent" ? 100 : undefined}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                      placeholder={discountType === "percent" ? "เช่น 10 (= 10%)" : "เช่น 50 (= 50 บาท)"}
                    />
                  </>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
                    <Tag size={16} />
                    <span className="font-medium text-sm">
                      ใช้งานโปรโมชั่น: ลด {discountType === 'percent' ? `${discountValue}%` : `${discountValue} บาท`}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══════ สรุปราคา + มัดจำ ══════ */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-brand-dark mb-4 flex items-center gap-2">
            <CreditCard size={16} className="text-rose-400" />
            สรุปยอดและมัดจำ
          </h3>

          {/* Price breakdown */}
          {(selectedItems.length > 0 || isPracticeModel) && (
            <div className="mb-4 p-4 bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl border border-rose-100 space-y-1.5">
              {isPracticeModel ? (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">ค่าอุปกรณ์ (หุ่นลอง)</span>
                  <span className="font-semibold">฿{materialCost.toLocaleString()}</span>
                </div>
              ) : (
                <>
                  {selectedItems.map((item) => (
                    <div key={item.tempId} className="flex justify-between text-sm">
                      <span className="text-slate-500 truncate max-w-[200px]">
                        {item.service.name}
                        {item.fingerCount != null && ` × ${item.fingerCount} นิ้ว`}
                      </span>
                      <span className="font-semibold shrink-0 ml-2">฿{item.lineTotal.toLocaleString()}</span>
                    </div>
                  ))}
                  {selectedItems.length > 1 && (
                    <>
                      <div className="h-px bg-rose-100 my-1" />
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">รวมบริการ</span>
                        <span className="font-semibold">฿{servicesSubtotal.toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </>
              )}

              {hasDiscount && !isPracticeModel && discountBaht > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-600">
                    ส่วนลด {discountType === "percent" ? `(${discountValue}%)` : ""}
                  </span>
                  <span className="text-emerald-600 font-medium">-฿{discountBaht.toLocaleString()}</span>
                </div>
              )}

              <div className="h-px bg-rose-100 my-1" />
              <div className="flex justify-between text-sm font-bold">
                <span>ยอดสุทธิ</span>
                <span className="text-rose-600">฿{totalPrice.toLocaleString()}</span>
              </div>

              {formData.deposit && Number(formData.deposit) > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">มัดจำ</span>
                    <span className="text-emerald-600 font-medium">-฿{Number(formData.deposit).toLocaleString()}</span>
                  </div>
                  <div className="h-px bg-rose-100 my-1" />
                  <div className="flex justify-between text-sm font-bold">
                    <span>ยอดค้างชำระ</span>
                    <span className="text-rose-600">฿{remaining.toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">มัดจำ (บาท)</label>
              <div className="relative">
                <Banknote size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  name="deposit"
                  value={formData.deposit}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  className="input-field pl-9"
                />
              </div>
            </div>
            {formData.deposit && Number(formData.deposit) > 0 && (
              <div>
                <label className="form-label">ชำระมัดจำผ่าน</label>
                <div className="relative">
                  <CreditCard size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                  <select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleChange}
                    className="input-field pl-9 pr-8 appearance-none"
                  >
                    {paymentMethods.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            )}
          </div>
          {(!formData.deposit || Number(formData.deposit) === 0) && (
            <p className="text-xs text-slate-400 mt-3">💡 ยอดทั้งหมดจะชำระตอนจบงาน</p>
          )}
        </div>

        {/* ══════ หมายเหตุ ══════ */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-brand-dark mb-4 flex items-center gap-2">
            <FileText size={16} className="text-rose-400" />
            หมายเหตุ
          </h3>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            placeholder="เช่น ลูกค้าอยากได้ลายแบบมินิมอลสีลูกแก้ว, แพ้สีเจลยี่ห้อ X..."
            className="input-field resize-none"
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pb-4">
          <button type="button" onClick={resetForm} className="btn-ghost">
            ล้างฟอร์ม
          </button>
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="btn-primary"
          >
            {isSubmitting ? (
              <><Loader2 size={16} className="animate-spin" /> กำลังบันทึก...</>
            ) : (
              <><Save size={16} /> บันทึกคิว</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}