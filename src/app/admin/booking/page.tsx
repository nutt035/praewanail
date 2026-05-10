"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Save, Loader2, User, Phone, Scissors, CalendarDays, Clock, CreditCard,
  FileText, ChevronDown, Banknote, Plus, Trash2, Fingerprint, Tag, Heart, X, CheckCircle2, Trophy, Star,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Service, Customer, Promotion, calcLineTotal, calcDiscountBaht, ShopSettings, settingsToMap, DEFAULT_SETTINGS, Booking } from "@/lib/types";
import toast from "react-hot-toast";

const paymentMethods = [
  { value: "cash", label: "💵 เงินสด" },
  { value: "promptpay", label: "📱 พร้อมเพย์" },
  { value: "transfer", label: "🏦 โอนเงิน" },
];

interface ServiceItem {
  tempId: string;
  service: Service;
  fingerCount: number | null;
  lineTotal: number;
}

// Helper: แปลง UTC ISO เป็น local date (YYYY-MM-DD)
function getLocalDate(iso: string) {
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Helper: แปลง UTC ISO เป็น local time (HH:mm)
function getLocalTime(iso: string) {
  const d = new Date(iso);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function BookingFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get("edit");

  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  
  const [existingCustomer, setExistingCustomer] = useState<Customer | null>(null);
  const [activeSearchField, setActiveSearchField] = useState<"phone" | "name" | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shopSettings, setShopSettings] = useState<Record<string, string>>(DEFAULT_SETTINGS);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastBooking, setLastBooking] = useState<{ id: string, name: string, total: number, deposit: number } | null>(null);

  const [selectedItems, setSelectedItems] = useState<ServiceItem[]>([]);
  const [addServiceId, setAddServiceId] = useState("");

  const [hasDiscount, setHasDiscount] = useState(false);
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState<"amount" | "percent">("amount");
  const [selectedPromotionId, setSelectedPromotionId] = useState("custom");

  const [isRedeemingPoints, setIsRedeemingPoints] = useState(false);
  const [redeemAmount, setRedeemAmount] = useState(0);

  const [isPracticeModel, setIsPracticeModel] = useState(false);
  const [materialCost, setMaterialCost] = useState(50);

  const [formData, setFormData] = useState({
    customerName: "",
    phone: "",
    lineId: "",
    date: new Date().toISOString().split("T")[0],
    startTime: "10:00",
    deposit: "",
    paymentMethod: "cash",
    notes: "",
  });

  const servicesSubtotal = selectedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const subtotal = isPracticeModel ? materialCost : servicesSubtotal;
  const discountBaht = isPracticeModel ? 0 : calcDiscountBaht(subtotal, discountValue, discountType);
  const pointsDiscount = isRedeemingPoints ? redeemAmount : 0;
  const totalPrice = Math.max(0, subtotal - discountBaht - pointsDiscount);
  const remaining = Math.max(0, totalPrice - Number(formData.deposit || 0));

  const totalDuration = selectedItems.reduce((sum, item) => sum + item.service.duration, 0);
  const endTime = (() => {
    if (!formData.startTime || totalDuration === 0) return "";
    const [h, m] = formData.startTime.split(":").map(Number);
    const totalMins = h * 60 + m + totalDuration;
    const eh = Math.floor(totalMins / 60) % 24;
    const em = totalMins % 60;
    return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
  })();

  const isFormValid = formData.customerName && formData.date && formData.startTime && (isPracticeModel || selectedItems.length > 0);

  useEffect(() => { 
    fetchServices(); 
    fetchCustomers();
    fetchPromotions();
    fetchShopSettings();
  }, []);

  useEffect(() => {
    if (editId && services.length > 0) {
      loadEditData(editId);
    }
  }, [editId, services]);

  async function loadEditData(id: string) {
    const { data: booking, error } = await supabase.from("bookings").select("*, customers(*), booking_services(*)").eq("id", id).single();
    if (error || !booking) {
      toast.error("ไม่พบข้อมูลคิวที่ต้องการแก้ไข");
      return;
    }
    const b = booking as any;
    setFormData({
      customerName: b.customers?.name || "",
      phone: b.customers?.phone || "",
      lineId: b.customers?.line_id || "",
      date: getLocalDate(b.start_time),
      startTime: getLocalTime(b.start_time),
      deposit: b.deposit?.toString() || "",
      paymentMethod: b.payment_method || "cash",
      notes: b.notes || "",
    });
    if (b.customers) setExistingCustomer(b.customers);
    setIsPracticeModel(b.is_practice_model);
    setMaterialCost(b.material_cost || 0);
    if (b.discount_amount > 0) {
      setHasDiscount(true);
      setDiscountValue(b.discount_amount);
      setDiscountType(b.discount_type);
    }
    if (b.booking_services && b.booking_services.length > 0) {
      const items: ServiceItem[] = b.booking_services.map((bs: any) => {
        const s = services.find(sv => sv.id === bs.service_id);
        return {
          tempId: bs.id,
          service: s || { id: bs.service_id, name: bs.service_name, price: bs.unit_price, duration: 30 },
          fingerCount: bs.finger_count,
          lineTotal: bs.line_total,
        };
      });
      setSelectedItems(items);
    }
  }

  async function fetchShopSettings() {
    const { data } = await supabase.from("shop_settings").select("*");
    if (data && data.length > 0) setShopSettings({ ...DEFAULT_SETTINGS, ...settingsToMap(data as ShopSettings[]) });
  }

  async function fetchServices() {
    const { data } = await supabase.from("services").select("*").order("category", { ascending: true }).order("name", { ascending: true });
    setServices(data || []);
  }

  async function fetchCustomers() {
    const { data, error } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
    if (error) console.error("Error fetching customers:", error);
    setCustomers((data as Customer[]) || []);
  }

  async function fetchPromotions() {
    const { data } = await supabase.from("promotions").select("*").eq("is_active", true).order("created_at", { ascending: false });
    setPromotions((data as Promotion[]) || []);
  }

  const filteredCustomers = customers.filter(c => {
    if (!activeSearchField) return false;
    const search = activeSearchField === "name" ? formData.customerName.toLowerCase() : (formData.phone || "").toLowerCase();
    if (!search || search.length < 2) return false;
    if (activeSearchField === "name") return c.name.toLowerCase().includes(search) || (c.phone && c.phone.includes(search));
    return (c.phone && c.phone.includes(search)) || c.name.toLowerCase().includes(search);
  }).slice(0, 5);

  function selectCustomer(cust: Customer) {
    setExistingCustomer(cust);
    setFormData(prev => ({ ...prev, customerName: cust.name, phone: cust.phone || "", lineId: cust.line_id || "" }));
    setActiveSearchField(null);
  }

  useEffect(() => {
    if (editId) return;
    const timer = setTimeout(() => {
      const currentName = formData.customerName.trim();
      const currentPhone = formData.phone.trim();
      if (currentPhone.length >= 9 && currentName === "") {
        const phoneMatch = customers.find(c => c.phone === currentPhone);
        if (phoneMatch) {
          setExistingCustomer(phoneMatch);
          setFormData(prev => ({ ...prev, customerName: phoneMatch.name }));
          return;
        }
      }
      if (currentName !== "") {
        const exactMatch = customers.find(c => c.name.trim().toLowerCase() === currentName.toLowerCase() && (c.phone || "").trim() === currentPhone);
        if (exactMatch) setExistingCustomer(exactMatch);
        else setExistingCustomer(null);
      } else setExistingCustomer(null);
    }, 300);
    return () => clearTimeout(timer);
  }, [formData.phone, formData.customerName, customers, editId]);

  function addServiceItem() {
    const service = services.find((s) => s.id === addServiceId);
    if (!service) return;
    const fingerCount = service.price_per_finger != null ? 1 : null;
    const lineTotal = calcLineTotal(service, fingerCount);
    setSelectedItems((prev) => [...prev, { tempId: crypto.randomUUID(), service, fingerCount, lineTotal }]);
    setAddServiceId("");
  }

  function updateFingerCount(tempId: string, count: number) {
    setSelectedItems((prev) => prev.map((item) => {
      if (item.tempId !== tempId) return item;
      const fingerCount = Math.min(20, Math.max(1, count));
      return { ...item, fingerCount, lineTotal: calcLineTotal(item.service, fingerCount) };
    }));
  }

  function removeServiceItem(tempId: string) {
    setSelectedItems((prev) => prev.filter((item) => item.tempId !== tempId));
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  function resetForm() {
    setFormData({ customerName: "", phone: "", lineId: "", date: getLocalDate(new Date().toISOString()), startTime: "10:00", deposit: "", paymentMethod: "cash", notes: "" });
    setSelectedItems([]);
    setAddServiceId("");
    setHasDiscount(false);
    setDiscountValue(0);
    setDiscountType("amount");
    setSelectedPromotionId("custom");
    setIsPracticeModel(false);
    setMaterialCost(50);
    setExistingCustomer(null);
    setIsRedeemingPoints(false);
    setRedeemAmount(0);
    if (editId) router.push("/admin/booking");
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setIsSubmitting(true);
    const toastId = toast.loading(editId ? "กำลังอัพเดตข้อมูล..." : "กำลังบันทึกข้อมูล...");

    try {
      let customerId: string | null = null;
      const manualMatch = customers.find(c => c.name.trim().toLowerCase() === formData.customerName.trim().toLowerCase() && (c.phone || "").trim() === (formData.phone || "").trim());
      const finalCustomer = existingCustomer || manualMatch;

      if (finalCustomer) {
        customerId = finalCustomer.id;
        if (isRedeemingPoints && redeemAmount > 0) {
          const pointsToDeduct = redeemAmount === 50 ? 5 : 10;
          await supabase.from("customers").update({ points: Math.max(0, (finalCustomer.points || 0) - pointsToDeduct) }).eq("id", customerId);
        }
      } else {
        // upsert: ถ้ามีเบอร์ซ้ำในระบบแล้วจะไม่สร้างใหม่
        const phone = formData.phone?.trim() || null;
        if (phone) {
          // ค้นหาก่อน (phone อาจมีอยู่แล้ว)
          const { data: found } = await supabase
            .from("customers")
            .select("id")
            .eq("phone", phone)
            .limit(1);
          if (found && found.length > 0) {
            customerId = found[0].id;
          } else {
            const { data: newCustomer, error } = await supabase
              .from("customers")
              .insert([{ name: formData.customerName, phone, line_id: formData.lineId || null }])
              .select().single();
            if (error) throw error;
            if (newCustomer) customerId = newCustomer.id;
          }
        } else {
          const { data: newCustomer, error } = await supabase
            .from("customers")
            .insert([{ name: formData.customerName, phone: null, line_id: formData.lineId || null }])
            .select().single();
          if (error) throw error;
          if (newCustomer) customerId = newCustomer.id;
        }
      }

      // สร้าง Date object จากปี-เดือน-วัน และ เวลา ท้องถิ่น
      const [year, month, day] = formData.date.split("-").map(Number);
      const [hour, min] = formData.startTime.split(":").map(Number);
      const startObj = new Date(year, month - 1, day, hour, min);
      
      const startDateTime = startObj.toISOString();
      const durationMs = (totalDuration || 60) * 60 * 1000;
      const endDateTime = new Date(startObj.getTime() + durationMs).toISOString();

      const bookingPayload = {
        customer_id: customerId,
        start_time: startDateTime,
        end_time: endDateTime,
        total_price: totalPrice,
        deposit: formData.deposit ? Number(formData.deposit) : 0,
        payment_method: formData.paymentMethod,
        notes: isPracticeModel ? `[หุ่นลอง] ${formData.notes || ""}`.trim() : formData.notes || null,
        discount_amount: (hasDiscount ? discountValue : 0) + (isRedeemingPoints ? redeemAmount : 0),
        discount_type: "amount",
        is_practice_model: isPracticeModel,
        material_cost: isPracticeModel ? materialCost : 0,
      };

      let bookingId = editId;
      if (editId) {
        const { error: updateError } = await supabase.from("bookings").update(bookingPayload).eq("id", editId);
        if (updateError) throw updateError;
      } else {
        const { data: newBooking, error: bookingError } = await supabase.from("bookings").insert([{ ...bookingPayload, status: "confirmed" }]).select().single();
        if (bookingError) throw bookingError;
        bookingId = newBooking.id;
      }

      if (editId) await supabase.from("booking_services").delete().eq("booking_id", editId);
      if (!isPracticeModel && selectedItems.length > 0 && bookingId) {
        const bsRows = selectedItems.map((item) => ({ booking_id: bookingId, service_id: item.service.id, service_name: item.service.name, finger_count: item.fingerCount, unit_price: item.service.price_per_finger ?? item.service.price, line_total: item.lineTotal }));
        await supabase.from("booking_services").insert(bsRows);
      }

      if (!editId && formData.deposit && Number(formData.deposit) > 0 && bookingId) {
        await supabase.from("transactions").insert([{ type: "income", amount: Number(formData.deposit), category: isPracticeModel ? "หุ่นลอง (ค่าอุปกรณ์)" : "มัดจำ", booking_id: bookingId }]);
      }

      if (!editId && shopSettings.line_channel_token && shopSettings.admin_line_uid) {
        const message = `💅 มีคิวจองใหม่!\n👤 ลูกค้า: ${formData.customerName}\n📅 วันที่: ${new Date(formData.date).toLocaleDateString("th-TH")}\n⏰ เวลา: ${formData.startTime} น.\n💰 ยอดรวม: ฿${totalPrice.toLocaleString()}\n💸 มัดจำ: ฿${Number(formData.deposit || 0).toLocaleString()}\n📝 หมายเหตุ: ${formData.notes || "-"}`;
        fetch("/api/notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channelToken: shopSettings.line_channel_token, adminUid: shopSettings.admin_line_uid, message }) }).catch(err => console.error("LINE Notify Error:", err));
      }

      toast.success(editId ? "อัพเดตคิวเรียบร้อยแล้ว!" : "บันทึกคิวเรียบร้อยแล้ว! 🎉", { id: toastId });
      if (!editId) {
        setLastBooking({ id: bookingId!, name: formData.customerName, total: totalPrice, deposit: Number(formData.deposit || 0) });
        setShowSuccessModal(true);
      } else router.push("/admin/calendar");
      resetForm();
      fetchCustomers();
    } catch (error: any) {
      console.error("Error:", error);
      const msg = error?.message || error?.details || JSON.stringify(error) || "ไม่ทราบสาเหตุ";
      toast.error(`บันทึกไม่สำเร็จ: ${msg}`, { id: toastId, duration: 8000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addableServices = services.filter((s) => !selectedItems.some((item) => item.service.id === s.id));

  function toggleRedeem(amount: number) {
    if (isRedeemingPoints && redeemAmount === amount) {
      setIsRedeemingPoints(false);
      setRedeemAmount(0);
    } else {
      setIsRedeemingPoints(true);
      setRedeemAmount(amount);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h2 className="page-title">{editId ? "แก้ไขคิวงาน ✏️" : "ลงคิวใหม่ 💅"}</h2>
          <p className="page-subtitle">{editId ? "ปรับเปลี่ยนรายละเอียดการจอง" : "บันทึกข้อมูลการจองคิวของลูกค้า"}</p>
        </div>
        {editId && (
          <button onClick={() => router.push("/admin/calendar")} className="btn-ghost text-rose-400 flex items-center gap-1">
            <X size={18} /> ยกเลิกการแก้ไข
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className={`card p-4 cursor-pointer transition-all border-2 ${isPracticeModel ? "border-violet-300 bg-violet-50" : "border-pink-100 hover:border-violet-200"}`} onClick={() => setIsPracticeModel(!isPracticeModel)}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isPracticeModel ? "bg-violet-500" : "bg-slate-100"}`}>
              <Heart size={18} className={isPracticeModel ? "text-white" : "text-slate-400"} />
            </div>
            <div className="flex-1">
              <p className={`font-semibold text-sm ${isPracticeModel ? "text-violet-700" : "text-brand-dark"}`}>💝 โหมดหุ่นลอง (ฝึกมือ)</p>
              <p className="text-xs text-slate-400">คิดเฉพาะค่าอุปกรณ์ · ไม่คิดค่าบริการ</p>
            </div>
            <div className={`w-12 h-6 rounded-full transition-all relative ${isPracticeModel ? "bg-violet-500" : "bg-slate-200"}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${isPracticeModel ? "left-7" : "left-1"}`} /></div>
          </div>
          {isPracticeModel && (
            <div className="mt-4 pt-4 border-t border-violet-200" onClick={(e) => e.stopPropagation()}>
              <label className="form-label text-violet-700">ค่าอุปกรณ์ที่ใช้ (บาท)</label>
              <input type="number" className="input-field mt-1" value={materialCost} min={0} onChange={(e) => setMaterialCost(Number(e.target.value))} placeholder="50" />
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-sm font-semibold text-brand-dark flex items-center gap-2"><User size={16} className="text-rose-400" /> ข้อมูลลูกค้า</h3>
            {existingCustomer && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-50 text-yellow-600 rounded-full border border-yellow-100">
                <Trophy size={12} /><span className="text-[10px] font-bold uppercase tracking-wider">สะสม {existingCustomer.points || 0} แต้ม</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <label className="form-label">เบอร์ติดต่อ / ค้นหาลูกค้าเก่า</label>
              <div className="relative">
                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" name="phone" value={formData.phone} onChange={handleChange} onFocus={() => setActiveSearchField("phone")} onBlur={() => setTimeout(() => setActiveSearchField(null), 200)} placeholder="08X-XXX-XXXX หรือพิมพ์ชื่อ" className="input-field pl-9" autoComplete="off" />
              </div>
              {activeSearchField === "phone" && formData.phone.length > 1 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-pink-100 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {filteredCustomers.map(cust => (
                    <button key={cust.id} type="button" className="w-full text-left px-4 py-2.5 hover:bg-pink-50 border-b border-pink-50 last:border-0 flex justify-between items-center" onClick={() => selectCustomer(cust)}>
                      <span className="font-medium text-sm text-brand-dark">{cust.name}</span>
                      <div className="text-right"><p className="text-xs text-slate-400">{cust.phone || "ไม่มีเบอร์"}</p><p className="text-[10px] text-yellow-500 font-bold">{cust.points || 0} แต้ม</p></div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <label className="form-label">ชื่อลูกค้า <span className="text-rose-400">*</span></label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" name="customerName" value={formData.customerName} onChange={handleChange} onFocus={() => setActiveSearchField("name")} onBlur={() => setTimeout(() => setActiveSearchField(null), 200)} placeholder="เช่น คุณพลอย" required autoComplete="off" className="input-field pl-9" />
              </div>
              {activeSearchField === "name" && formData.customerName.length > 1 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-pink-100 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {filteredCustomers.map(cust => (
                    <button key={cust.id} type="button" className="w-full text-left px-4 py-2.5 hover:bg-pink-50 border-b border-pink-50 last:border-0 flex justify-between items-center" onClick={() => selectCustomer(cust)}>
                      <span className="font-medium text-sm text-brand-dark">{cust.name}</span>
                      <div className="text-right"><p className="text-xs text-slate-400">{cust.phone || "ไม่มีเบอร์"}</p><p className="text-[10px] text-yellow-500 font-bold">{cust.points || 0} แต้ม</p></div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* ═══ ส่วนใช้แต้มแลกรางวัล ═══ */}
            {existingCustomer && (existingCustomer.points || 0) >= 5 && !isPracticeModel && (
              <div className="md:col-span-2 pt-4 mt-2 border-t border-yellow-100">
                <p className="text-xs font-bold text-yellow-600 mb-2 flex items-center gap-1.5">
                  <Star size={12} fill="currentColor" /> ใช้แต้มแลกส่วนลด
                </p>
                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => toggleRedeem(Number(shopSettings.redeem_5_points_value || 50))} 
                    disabled={(existingCustomer.points || 0) < 5} 
                    className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all ${isRedeemingPoints && redeemAmount === Number(shopSettings.redeem_5_points_value || 50) ? "bg-yellow-50 border-yellow-400 text-yellow-700" : "bg-white border-yellow-100 text-slate-500"}`}
                  >
                    <span className="text-sm font-bold">แลก 5 แต้ม</span>
                    <span className="text-[10px]">ลด ฿{shopSettings.redeem_5_points_value || 50}</span>
                  </button>
                  <button 
                    type="button" 
                    onClick={() => toggleRedeem(Number(shopSettings.redeem_10_points_value || 100))} 
                    disabled={(existingCustomer.points || 0) < 10} 
                    className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all ${isRedeemingPoints && redeemAmount === Number(shopSettings.redeem_10_points_value || 100) ? "bg-yellow-50 border-yellow-400 text-yellow-700" : "bg-white border-yellow-100 text-slate-500"}`}
                  >
                    <span className="text-sm font-bold">แลก 10 แต้ม</span>
                    <span className="text-[10px]">ลด ฿{shopSettings.redeem_10_points_value || 100}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {!isPracticeModel && (
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-brand-dark mb-4 flex items-center gap-2"><Scissors size={16} className="text-rose-400" /> บริการที่ต้องการ <span className="text-rose-400">*</span></h3>
            <div className="space-y-2 mb-4">
              {selectedItems.map((item) => (
                <div key={item.tempId} className="flex items-center gap-3 p-3 bg-pink-50 rounded-xl border border-pink-100">
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium text-brand-dark truncate">{item.service.name}</p><p className="text-xs text-slate-400">{item.service.duration} นาที</p></div>
                  {item.service.price_per_finger != null && (
                    <div className="flex items-center gap-1.5 shrink-0"><Fingerprint size={13} className="text-violet-400" /><input type="number" className="w-14 text-center text-sm font-semibold border border-violet-200 rounded-lg py-1 bg-white" value={item.fingerCount ?? 1} min={1} onChange={(e) => updateFingerCount(item.tempId, Number(e.target.value))} /><span className="text-xs text-slate-400">{item.service.unit_name || "นิ้ว"}</span></div>
                  )}
                  <p className="text-sm font-bold text-rose-500 shrink-0 w-20 text-right">฿{item.lineTotal.toLocaleString()}</p>
                  <button type="button" onClick={() => removeServiceItem(item.tempId)} className="w-7 h-7 rounded-lg bg-red-50 text-red-400 flex items-center justify-center"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Scissors size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                <select value={addServiceId} onChange={(e) => setAddServiceId(e.target.value)} className="input-field pl-9 pr-8 appearance-none">
                  <option value="">-- เลือกบริการ --</option>
                  {addableServices.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} {s.price_per_finger != null ? `— ฿${s.price_per_finger}/นิ้ว` : `— ฿${s.price.toLocaleString()}`}</option>
                  ))}
                </select>
                <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              <button type="button" onClick={addServiceItem} disabled={!addServiceId} className="btn-primary shrink-0"><Plus size={16} /> เพิ่ม</button>
            </div>
          </div>
        )}

        <div className="card p-6">
          <h3 className="text-sm font-semibold text-brand-dark mb-4 flex items-center gap-2"><CalendarDays size={16} className="text-rose-400" /> วันที่และเวลา</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="form-label">วันที่ทำเล็บ <span className="text-rose-400">*</span></label><input type="date" name="date" value={formData.date} onChange={handleChange} required className="input-field" /></div>
            <div><label className="form-label">เวลาเริ่ม <span className="text-rose-400">*</span></label><input type="time" name="startTime" value={formData.startTime} onChange={handleChange} required className="input-field" /></div>
          </div>
        </div>

        {!isPracticeModel && (
          <div className="card p-6">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => { setHasDiscount(!hasDiscount); if (!hasDiscount) setDiscountValue(0); }}>
              <h3 className="text-sm font-semibold text-brand-dark flex items-center gap-2"><Tag size={16} className="text-rose-400" /> ส่วนลด (ถ้ามี)</h3>
              <div className={`w-12 h-6 rounded-full transition-all relative ${hasDiscount ? "bg-emerald-500" : "bg-slate-200"}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${hasDiscount ? "left-7" : "left-1"}`} /></div>
            </div>
            {hasDiscount && (
              <div className="mt-4 pt-4 border-t border-pink-100">
                <div className="flex gap-2 mb-3">
                  <button type="button" onClick={() => setDiscountType("amount")} className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${discountType === "amount" ? "bg-emerald-500 text-white" : "bg-white text-slate-500"}`}>฿ บาท</button>
                  <button type="button" onClick={() => setDiscountType("percent")} className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${discountType === "percent" ? "bg-emerald-500 text-white" : "bg-white text-slate-500"}`}>% เปอร์เซ็นต์</button>
                </div>
                <input type="number" className="input-field" value={discountValue} min={0} onChange={(e) => setDiscountValue(Number(e.target.value))} placeholder="จำนวนส่วนลด" />
              </div>
            )}
          </div>
        )}

        <div className="card p-6">
          <h3 className="text-sm font-semibold text-brand-dark mb-4 flex items-center gap-2"><CreditCard size={16} className="text-rose-400" /> สรุปยอดและมัดจำ</h3>
          <div className="mb-4 p-4 bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl border border-rose-100 space-y-1.5">
            <div className="flex justify-between text-sm"><span>ยอดรวมบริการ</span><span className="font-semibold">฿{subtotal.toLocaleString()}</span></div>
            {discountBaht > 0 && <div className="flex justify-between text-sm text-emerald-600"><span>ส่วนลด</span><span>-฿{discountBaht.toLocaleString()}</span></div>}
            {pointsDiscount > 0 && <div className="flex justify-between text-sm text-yellow-600"><span>แลกแต้มสะสม</span><span>-฿{pointsDiscount.toLocaleString()}</span></div>}
            <div className="h-px bg-rose-100 my-1" />
            <div className="flex justify-between text-sm font-bold"><span>ยอดสุทธิ</span><span className="text-rose-600">฿{totalPrice.toLocaleString()}</span></div>
            {formData.deposit && <div className="flex justify-between text-sm text-emerald-600"><span>มัดจำแล้ว</span><span>-฿{Number(formData.deposit).toLocaleString()}</span></div>}
            {formData.deposit && <div className="flex justify-between text-sm font-bold pt-1 border-t border-rose-100"><span>ยอดค้างชำระ</span><span className="text-rose-600">฿{remaining.toLocaleString()}</span></div>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="form-label">มัดจำ (บาท)</label><input type="number" name="deposit" value={formData.deposit} onChange={handleChange} placeholder="0" className="input-field" /></div>
            {Number(formData.deposit) > 0 && (
              <div><label className="form-label">ชำระผ่าน</label><select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="input-field">
                {paymentMethods.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select></div>
            )}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-sm font-semibold text-brand-dark mb-4 flex items-center gap-2"><FileText size={16} className="text-rose-400" /> หมายเหตุ</h3>
          <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} placeholder="ระบุรายละเอียดเพิ่มเติม..." className="input-field resize-none" />
        </div>

        <div className="flex justify-end gap-3 pb-8">
          <button type="button" onClick={resetForm} className="btn-ghost">{editId ? "ยกเลิก" : "ล้างฟอร์ม"}</button>
          <button type="submit" disabled={!isFormValid || isSubmitting} className="btn-primary">{isSubmitting ? <><Loader2 size={16} className="animate-spin" /> กำลังบันทึก...</> : <><Save size={16} /> {editId ? "อัพเดตคิว" : "บันทึกคิว"}</>}</button>
        </div>
      </form>

      {showSuccessModal && lastBooking && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up">
            <div className="p-6 text-center bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 size={32} /></div>
              <h3 className="text-xl font-bold">บันทึกคิวสำเร็จ! 🎉</h3>
              <p className="text-emerald-50 text-sm mt-1">คิวของคุณ {lastBooking.name} ถูกลงระบบแล้ว</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4"><div className="p-3 bg-slate-50 rounded-2xl border border-slate-100"><p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">ยอดรวม</p><p className="text-lg font-bold text-brand-dark">฿{lastBooking.total.toLocaleString()}</p></div><div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100"><p className="text-[10px] text-emerald-500 uppercase font-bold tracking-wider mb-1">มัดจำ</p><p className="text-lg font-bold text-emerald-600">฿{lastBooking.deposit.toLocaleString()}</p></div></div>
               <button onClick={() => setShowSuccessModal(false)} className="w-full py-4 bg-slate-800 text-white font-bold rounded-2xl">ปิดหน้าต่างนี้</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin text-rose-400" /></div>}>
      <BookingFormContent />
    </Suspense>
  );
}
