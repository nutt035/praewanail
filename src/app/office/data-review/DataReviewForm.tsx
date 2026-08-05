"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileCheck2,
  Info,
  Loader2,
  Save,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { DataReviewData, DataReviewValues } from "@/lib/server/data-review";

type Props = { initialReview: DataReviewData };

function price(service: DataReviewData["services"][number]) {
  if (service.price_per_finger != null) {
    return `฿${service.price_per_finger.toLocaleString("th-TH")}/${service.unit_name || "หน่วย"}`;
  }
  return `฿${service.price.toLocaleString("th-TH")}`;
}

function reviewedAt(value: string | null) {
  if (!value) return "ยังไม่เคยยืนยัน";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
}

export default function DataReviewForm({ initialReview }: Props) {
  const [review, setReview] = useState(initialReview);
  const [values, setValues] = useState<DataReviewValues>(initialReview.values);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  function set<K extends keyof DataReviewValues>(key: K, value: DataReviewValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setMessage(null);
  }

  const policiesComplete = [
    values.bookingPolicy,
    values.cancellationPolicy,
    values.walkInPolicy,
    values.repairPolicy,
  ].every((value) => value.trim().length >= 10);

  async function confirmReview() {
    if (!policiesComplete) {
      setMessage({ kind: "error", text: "กรุณากำหนดนโยบายทั้ง 4 ข้อให้ครบก่อนยืนยัน" });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/office/data-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "ยืนยันข้อมูลไม่สำเร็จ");
      setReview(payload.review);
      setValues(payload.review.values);
      setMessage({ kind: "success", text: "ยืนยันข้อมูลกลางของร้านเรียบร้อยแล้ว" });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "ยืนยันข้อมูลไม่สำเร็จ" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7F4F1] pb-28 text-[#1A1A1A]">
      <div className="mx-auto max-w-6xl px-4 py-5 md:px-8 md:py-8">
        <header className="rounded-[1.75rem] bg-[#1A1A1A] px-5 py-6 text-white shadow-[0_24px_70px_rgba(30,20,22,0.16)] md:px-8 md:py-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Link href="/office" className="inline-flex items-center gap-1.5 text-xs text-white/55 transition hover:text-white">
                <ArrowLeft size={14} /> กลับ Office
              </Link>
              <div className="mt-5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#D8A0A8]">
                <FileCheck2 size={14} /> Data Review
              </div>
              <h1 className="mt-2 font-serif text-3xl md:text-5xl">ข้อมูลจริงของร้าน<br />ต้องมีชุดเดียว</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">ตรวจราคา เวลาเปิดร้าน ค่ามัดจำ และนโยบายก่อนให้หน้าเว็บ ระบบจอง และ LINE นำไปใช้ร่วมกัน</p>
            </div>
            <span className={`mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold ${review.isConfirmed ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-200"}`}>
              {review.isConfirmed ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
              {review.isConfirmed ? "ยืนยันแล้ว" : "รอยืนยัน"}
            </span>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4">
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-[10px] text-white/45">รายการราคา</p><p className="mt-1 text-xl font-semibold">{review.services.length}</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-[10px] text-white/45">ข้อมูลเดิมไม่ตรง</p><p className="mt-1 text-xl font-semibold text-amber-200">{review.conflictCount}</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-[10px] text-white/45">ค่ามัดจำ</p><p className="mt-1 text-xl font-semibold">฿{values.depositAmount.toLocaleString("th-TH")}</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-[10px] text-white/45">ยืนยันล่าสุด</p><p className="mt-1 text-xs font-medium leading-5">{reviewedAt(review.confirmedAt)}</p></div>
          </div>
        </header>

        {message && (
          <div className={`mt-4 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${message.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
            {message.kind === "success" ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}{message.text}
          </div>
        )}

        <section className="mt-5 rounded-[1.6rem] border border-[#EDE7E3] bg-white p-5 shadow-[0_12px_35px_rgba(68,44,48,0.045)] md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#B76E79]">01 · Prices</p><h2 className="mt-1 font-serif text-2xl">ราคาและระยะเวลาบริการ</h2><p className="mt-1 text-xs text-slate-400">ราคาฝั่ง “ฐานข้อมูล” คือค่าที่เว็บใช้อยู่จริง</p></div>
            <Link href="/admin/settings" className="inline-flex items-center gap-1.5 rounded-xl border border-[#E8DAD7] px-3 py-2 text-xs font-semibold text-[#9C5964]">แก้ไขรายการราคา <ExternalLink size={13} /></Link>
          </div>

          {review.conflictCount > 0 && (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 shrink-0" size={18} />
              <div><p className="font-semibold">พบข้อมูลราคาเก่าที่ไม่ตรงกับฐานข้อมูลปัจจุบัน</p><p className="mt-1 text-xs leading-5 text-amber-700">ระบบจะไม่เอาราคาในไฟล์ Markdown มาใช้เอง ให้ตรวจว่าราคาในฐานข้อมูลถูกต้อง หากต้องแก้ให้กด “แก้ไขรายการราคา” แล้วกลับมายืนยันหน้านี้</p></div>
            </div>
          )}

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {review.services.map((service) => (
              <article key={service.id} className={`rounded-2xl border p-4 ${service.reference?.conflicts ? "border-amber-200 bg-amber-50/45" : "border-[#EFE9E5]"}`}>
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{service.name}</p><p className="mt-1 text-[10px] text-slate-400">{service.category || "ไม่ระบุหมวด"} · {service.duration} นาที</p></div><p className="shrink-0 text-sm font-bold text-[#B76E79]">{price(service)}</p></div>
                {service.reference && (
                  <div className={`mt-3 rounded-xl px-3 py-2 text-[10px] ${service.reference.conflicts ? "bg-amber-100 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>
                    ไฟล์เดิม: {service.reference.label} {service.reference.referenceText} {service.reference.conflicts ? "· ต้องเลือกว่าค่าไหนถูก" : "· ตรงกัน"}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <article className="rounded-[1.6rem] border border-[#EDE7E3] bg-white p-5 shadow-[0_12px_35px_rgba(68,44,48,0.045)] md:p-7">
            <div className="flex items-center gap-3"><span className="rounded-2xl bg-[#F3E6E7] p-3 text-[#9C5964]"><Clock3 size={20} /></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#B76E79]">02 · Hours</p><h2 className="font-serif text-2xl">เวลาเปิดร้าน</h2></div></div>
            <p className="mt-3 text-xs leading-5 text-slate-500">ค่าในฐานข้อมูลตรงกับไฟล์ความรู้เดิมแล้ว แต่คุณสามารถปรับก่อนยืนยันได้</p>
            <div className="mt-5 space-y-4">
              <div><p className="mb-2 text-xs font-semibold">จันทร์–ศุกร์</p><div className="grid grid-cols-2 gap-3"><label className="text-[10px] text-slate-500">เปิด<input type="time" value={values.weekdayOpen} onChange={(event) => set("weekdayOpen", event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#E8DFDB] px-3 py-2.5 text-sm" /></label><label className="text-[10px] text-slate-500">ปิด<input type="time" value={values.weekdayClose} onChange={(event) => set("weekdayClose", event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#E8DFDB] px-3 py-2.5 text-sm" /></label></div></div>
              <div><p className="mb-2 text-xs font-semibold">เสาร์–อาทิตย์</p><div className="grid grid-cols-2 gap-3"><label className="text-[10px] text-slate-500">เปิด<input type="time" value={values.weekendOpen} onChange={(event) => set("weekendOpen", event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#E8DFDB] px-3 py-2.5 text-sm" /></label><label className="text-[10px] text-slate-500">ปิด<input type="time" value={values.weekendClose} onChange={(event) => set("weekendClose", event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#E8DFDB] px-3 py-2.5 text-sm" /></label></div></div>
            </div>
          </article>

          <article className="rounded-[1.6rem] border border-[#EDE7E3] bg-white p-5 shadow-[0_12px_35px_rgba(68,44,48,0.045)] md:p-7">
            <div className="flex items-center gap-3"><span className="rounded-2xl bg-[#EDF3F0] p-3 text-[#4A7562]"><Banknote size={20} /></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#4A7562]">03 · Deposit</p><h2 className="font-serif text-2xl">ค่ามัดจำกลาง</h2></div></div>
            <p className="mt-3 text-xs leading-5 text-slate-500">ค่านี้จะใช้ทั้งหน้าจอง, API สร้างคิว และข้อความยืนยันทาง LINE แทนเลข 50 ที่เคยเขียนตายตัว</p>
            <label className="mt-6 block text-xs font-semibold">จำนวนเงิน (บาท)<input type="number" min="0" max="10000" step="1" value={values.depositAmount} onChange={(event) => set("depositAmount", Number(event.target.value))} className="mt-2 w-full rounded-2xl border border-[#DCE7E1] bg-[#F7FBF9] px-4 py-4 text-2xl font-semibold text-[#315A48]" /></label>
          </article>
        </section>

        <section className="mt-5 rounded-[1.6rem] border border-[#EDE7E3] bg-white p-5 shadow-[0_12px_35px_rgba(68,44,48,0.045)] md:p-7">
          <div className="flex items-center gap-3"><span className="rounded-2xl bg-[#F5EEDC] p-3 text-[#8B6D2E]"><ShieldCheck size={20} /></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8B6D2E]">04 · Policies</p><h2 className="font-serif text-2xl">นโยบายที่ใช้ตอบลูกค้า</h2></div></div>
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500"><Info size={15} className="mt-0.5 shrink-0" />สามข้อถูกเติมจาก FAQ เดิม ส่วน “เลื่อน/ยกเลิกคิว” ไม่มีข้อมูลเดิม จึงต้องกำหนดให้ชัดก่อนกดยืนยัน</div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-xs font-semibold">การจองคิว<textarea value={values.bookingPolicy} onChange={(event) => set("bookingPolicy", event.target.value)} rows={4} className="mt-2 w-full resize-y rounded-2xl border border-[#E8DFDB] px-4 py-3 text-sm font-normal leading-6" /></label>
            <label className="text-xs font-semibold">การเลื่อน/ยกเลิกคิว <span className="text-rose-500">*</span><textarea value={values.cancellationPolicy} onChange={(event) => set("cancellationPolicy", event.target.value)} rows={4} placeholder="ตัวอย่าง: หากต้องการเลื่อนหรือยกเลิก กรุณาแจ้งล่วงหน้า..." className="mt-2 w-full resize-y rounded-2xl border border-rose-200 px-4 py-3 text-sm font-normal leading-6" /></label>
            <label className="text-xs font-semibold">Walk-in<textarea value={values.walkInPolicy} onChange={(event) => set("walkInPolicy", event.target.value)} rows={4} className="mt-2 w-full resize-y rounded-2xl border border-[#E8DFDB] px-4 py-3 text-sm font-normal leading-6" /></label>
            <label className="text-xs font-semibold">การรับประกัน/แก้งาน<textarea value={values.repairPolicy} onChange={(event) => set("repairPolicy", event.target.value)} rows={4} className="mt-2 w-full resize-y rounded-2xl border border-[#E8DFDB] px-4 py-3 text-sm font-normal leading-6" /></label>
          </div>
        </section>

        <section className="mt-5 rounded-[1.6rem] bg-[#EDE5DF] p-5 md:flex md:items-center md:justify-between md:gap-6 md:p-7">
          <div><div className="flex items-center gap-2 text-[#8F5A62]"><Sparkles size={17} /><p className="text-xs font-semibold uppercase tracking-wider">พร้อมยืนยันข้อมูลกลาง</p></div><p className="mt-2 max-w-2xl text-sm leading-6 text-[#4D4244]">การยืนยันจะบันทึกค่าด้านบน พร้อมลายนิ้วมือของรายการราคาปัจจุบัน หากมีใครแก้ราคา เวลา มัดจำ หรือนโยบายภายหลัง หน้านี้จะกลับเป็น “รอยืนยัน” โดยอัตโนมัติ</p></div>
          <button onClick={confirmReview} disabled={saving || !policiesComplete} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1A1A1A] px-5 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-[#332B2D] disabled:cursor-not-allowed disabled:opacity-40 md:mt-0 md:w-auto md:min-w-52">
            {saving ? <><Loader2 size={17} className="animate-spin" /> กำลังยืนยัน...</> : <><Save size={17} /> ยืนยันและนำไปใช้</>}
          </button>
        </section>
      </div>
    </main>
  );
}
