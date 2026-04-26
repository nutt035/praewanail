"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, User, Phone, Scissors, CalendarDays, Clock, CreditCard, FileText, ChevronDown, Banknote } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Service, Customer } from "@/lib/types";
import toast from "react-hot-toast";

const paymentMethods = [
  { value: "cash", label: "💵 เงินสด" },
  { value: "promptpay", label: "📱 พร้อมเพย์" },
  { value: "transfer", label: "🏦 โอนเงิน" },
];

export default function BookingPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [existingCustomer, setExistingCustomer] = useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneSearching, setPhoneSearching] = useState(false);

  const [formData, setFormData] = useState({
    customerName: "",
    phone: "",
    serviceId: "",
    date: new Date().toISOString().split("T")[0],
    startTime: "10:00",
    deposit: "",
    paymentMethod: "cash",
    notes: "",
  });

  // คำนวณเวลาและราคาอัตโนมัติจาก service ที่เลือก
  const selectedService = services.find((s) => s.id === formData.serviceId);
  const endTime = (() => {
    if (!formData.startTime || !selectedService) return "";
    const [h, m] = formData.startTime.split(":").map(Number);
    const totalMins = h * 60 + m + selectedService.duration;
    const eh = Math.floor(totalMins / 60) % 24;
    const em = totalMins % 60;
    return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
  })();

  const isFormValid =
    formData.customerName && formData.serviceId && formData.date && formData.startTime;

  useEffect(() => {
    fetchServices();
  }, []);

  async function fetchServices() {
    const { data } = await supabase
      .from("services")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true });
    setServices(data || []);
  }

  // ค้นหาลูกค้าจากเบอร์โทร (debounced)
  useEffect(() => {
    if (!formData.phone || formData.phone.length < 9) {
      setExistingCustomer(null);
      return;
    }
    const timer = setTimeout(async () => {
      setPhoneSearching(true);
      const { data } = await supabase
        .from("customers")
        .select("*")
        .eq("phone", formData.phone)
        .maybeSingle();
      if (data) {
        setExistingCustomer(data);
        setFormData((prev) => ({ ...prev, customerName: data.name }));
      } else {
        setExistingCustomer(null);
      }
      setPhoneSearching(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.phone]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

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
      const endDateTime = selectedService
        ? new Date(
            new Date(`${formData.date}T${formData.startTime}:00`).getTime() +
              selectedService.duration * 60 * 1000
          ).toISOString()
        : new Date(
            new Date(`${formData.date}T${formData.startTime}:00`).getTime() + 2 * 60 * 60 * 1000
          ).toISOString();

      // 3. บันทึก booking
      const { data: newBooking, error: bookingError } = await supabase
        .from("bookings")
        .insert([{
          customer_id: customerId,
          service_id: formData.serviceId || null,
          start_time: startDateTime,
          end_time: endDateTime,
          status: "confirmed",
          total_price: selectedService?.price || null,
          deposit: formData.deposit ? Number(formData.deposit) : 0,
          payment_method: formData.paymentMethod,
          notes: formData.notes || null,
        }])
        .select()
        .single();

      if (bookingError) throw bookingError;

      // 4. ถ้ามีมัดจำ → บันทึก transaction รายรับ
      if (formData.deposit && Number(formData.deposit) > 0 && newBooking) {
        await supabase.from("transactions").insert([{
          type: "income",
          amount: Number(formData.deposit),
          category: "มัดจำ",
          booking_id: newBooking.id,
        }]);
      }

      toast.success("บันทึกคิวเรียบร้อยแล้ว! 🎉", { id: toastId });

      // reset
      setFormData({
        customerName: "",
        phone: "",
        serviceId: "",
        date: new Date().toISOString().split("T")[0],
        startTime: "10:00",
        deposit: "",
        paymentMethod: "cash",
        notes: "",
      });
      setExistingCustomer(null);
    } catch (error) {
      console.error("Error:", error);
      toast.error("ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-7">
        <h2 className="page-title">ลงคิวใหม่ 💅</h2>
        <p className="page-subtitle">บันทึกข้อมูลการจองคิวของลูกค้า</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ข้อมูลลูกค้า */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-brand-dark mb-4 flex items-center gap-2">
            <User size={16} className="text-rose-400" />
            ข้อมูลลูกค้า
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* เบอร์โทร (ค้นหาก่อน) */}
            <div>
              <label className="form-label">
                เบอร์ติดต่อ
              </label>
              <div className="relative">
                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="08X-XXX-XXXX"
                  className="input-field pl-9"
                />
                {phoneSearching && (
                  <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-400 animate-spin" />
                )}
              </div>
              {existingCustomer && (
                <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                  ✓ พบลูกค้า: <strong>{existingCustomer.name}</strong>
                </p>
              )}
            </div>

            {/* ชื่อลูกค้า */}
            <div>
              <label className="form-label">
                ชื่อลูกค้า <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleChange}
                  placeholder="เช่น คุณพลอย"
                  required
                  className="input-field pl-9"
                />
              </div>
            </div>
          </div>
        </div>

        {/* บริการและเวลา */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-brand-dark mb-4 flex items-center gap-2">
            <Scissors size={16} className="text-rose-400" />
            บริการและเวลา
          </h3>
          <div className="space-y-4">
            {/* เลือกบริการ */}
            <div>
              <label className="form-label">
                บริการที่เลือก <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Scissors size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                <select
                  name="serviceId"
                  value={formData.serviceId}
                  onChange={handleChange}
                  required
                  className="input-field pl-9 pr-8 appearance-none"
                >
                  <option value="">-- เลือกบริการ --</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — ฿{s.price.toLocaleString()} ({s.duration} นาที)
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              {selectedService && (
                <p className="text-xs text-slate-500 mt-1">
                  ⏱ ใช้เวลาประมาณ {selectedService.duration} นาที · ราคา ฿{selectedService.price.toLocaleString()}
                </p>
              )}
            </div>

            {/* วันที่ + เวลา */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">
                  วันที่ทำเล็บ <span className="text-rose-400">*</span>
                </label>
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
                <label className="form-label">
                  เวลาเริ่ม <span className="text-rose-400">*</span>
                </label>
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

            {/* แสดง end time */}
            {endTime && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 rounded-xl border border-rose-100">
                <Clock size={14} className="text-rose-400" />
                <p className="text-sm text-rose-600">
                  เสร็จประมาณ <strong>{endTime} น.</strong>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* มัดจำ */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-brand-dark mb-4 flex items-center gap-2">
            <CreditCard size={16} className="text-rose-400" />
            มัดจำ (ถ้ามี)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">จำนวนมัดจำ (บาท)</label>
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

            {/* แสดงวิธีชำระเฉพาะเมื่อมีมัดจำ */}
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

          {/* แสดงยอดสุทธิ */}
          {selectedService && (
            <div className="mt-4 p-4 bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl border border-rose-100">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">ราคาบริการ</span>
                <span className="font-semibold">฿{selectedService.price.toLocaleString()}</span>
              </div>
              {formData.deposit && Number(formData.deposit) > 0 && (
                <>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-slate-500">มัดจำ</span>
                    <span className="text-emerald-600 font-medium">-฿{Number(formData.deposit).toLocaleString()}</span>
                  </div>
                  <div className="h-px bg-rose-100 my-2" />
                  <div className="flex justify-between text-sm font-bold">
                    <span>ยอดค้างชำระ (จ่ายตอนจบงาน)</span>
                    <span className="text-rose-600">฿{(selectedService.price - Number(formData.deposit)).toLocaleString()}</span>
                  </div>
                </>
              )}
              {(!formData.deposit || Number(formData.deposit) === 0) && (
                <p className="text-xs text-slate-400 mt-2">💡 ยอดทั้งหมดจะชำระตอนจบงาน</p>
              )}
            </div>
          )}
        </div>

        {/* หมายเหตุ */}
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
          <button
            type="button"
            onClick={() => {
              setFormData({
                customerName: "", phone: "", serviceId: "",
                date: new Date().toISOString().split("T")[0],
                startTime: "10:00", deposit: "", paymentMethod: "cash", notes: "",
              });
              setExistingCustomer(null);
            }}
            className="btn-ghost"
          >
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