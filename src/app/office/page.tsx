import { notFound } from "next/navigation";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Inbox,
  Sparkles,
} from "lucide-react";
import { isFeatureEnabled } from "@/lib/server/feature-flags";

export const dynamic = "force-dynamic";

const summaryCards = [
  {
    label: "คิววันนี้",
    value: "—",
    detail: "จะแสดงหลังเชื่อมข้อมูลจริง",
    icon: CalendarDays,
  },
  {
    label: "รอตอบลูกค้า",
    value: "—",
    detail: "Inbox ยังอยู่ในโหมดปิด",
    icon: Inbox,
  },
  {
    label: "รออนุมัติ",
    value: "—",
    detail: "Agent ยังดำเนินการเองไม่ได้",
    icon: CheckCircle2,
  },
];

export default function OfficePage() {
  if (!isFeatureEnabled("office")) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#F5F0EB] px-4 py-6 text-[#1A1A1A] md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-[2rem] border border-white/80 bg-white px-5 py-6 shadow-[0_18px_50px_rgba(68,44,48,0.08)] md:px-8 md:py-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#B76E79]">
                <Sparkles size={15} /> Antonette Digital Office
              </div>
              <h1 className="font-serif text-3xl leading-tight md:text-5xl">
                สวัสดีค่ะ วันนี้มีอะไรให้ช่วยดูแลบ้าง
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 md:text-base">
                ศูนย์รวมคิว แชต งานอนุมัติ และรายงานร้าน — เริ่มต้นแบบ read-only
                ก่อนเปิดความสามารถของ Digital Employee ทีละขั้น
              </p>
            </div>
            <div className="hidden rounded-2xl bg-[#F5F0EB] p-3 text-[#B76E79] md:block">
              <Sparkles size={24} />
            </div>
          </div>
        </header>

        <section className="mt-5 grid gap-4 md:grid-cols-3">
          {summaryCards.map((card) => (
            <article
              key={card.label}
              className="rounded-3xl border border-white/80 bg-white p-5 shadow-[0_12px_35px_rgba(68,44,48,0.06)]"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-500">{card.label}</p>
                <card.icon size={19} className="text-[#B76E79]" />
              </div>
              <p className="mt-5 font-serif text-4xl">{card.value}</p>
              <p className="mt-2 text-xs text-slate-400">{card.detail}</p>
            </article>
          ))}
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <article className="rounded-3xl border border-white/80 bg-white p-5 shadow-[0_12px_35px_rgba(68,44,48,0.06)] md:p-7">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-rose-50 p-3 text-[#B76E79]">
                <Clock3 size={20} />
              </div>
              <div>
                <h2 className="font-serif text-2xl">Today</h2>
                <p className="text-xs text-slate-400">พื้นที่สรุปงานประจำวัน</p>
              </div>
            </div>
            <div className="mt-6 rounded-2xl border border-dashed border-rose-200 bg-rose-50/40 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-slate-600">ยังไม่เชื่อมข้อมูล production</p>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                จะเปิดหลัง Owner Auth, RLS และ read-only queries ผ่าน staging
              </p>
            </div>
          </article>

          <aside className="rounded-3xl bg-[#1A1A1A] p-5 text-white shadow-[0_12px_35px_rgba(26,26,26,0.16)] md:p-7">
            <div className="flex items-center gap-2 text-[#D9A0A8]">
              <AlertTriangle size={18} />
              <p className="text-xs font-semibold uppercase tracking-wider">Safe mode</p>
            </div>
            <h2 className="mt-5 font-serif text-2xl">Agent ยังไม่ส่งหรือแก้ข้อมูลเอง</h2>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-300">
              <li>• ไม่มีข้อความถูกส่งอัตโนมัติ</li>
              <li>• ไม่มีการแก้คิว ราคา หรือการเงิน</li>
              <li>• ทุก action เสี่ยงต้องรอ Owner อนุมัติ</li>
            </ul>
          </aside>
        </section>
      </div>
    </main>
  );
}
