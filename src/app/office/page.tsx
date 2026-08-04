import { redirect, notFound } from "next/navigation";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Inbox,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { isFeatureEnabled } from "@/lib/server/feature-flags";
import { getOfficeDashboardData } from "@/lib/server/office-dashboard";
import { hasOwnerSession } from "@/lib/server/owner-auth";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  pending: "รอยืนยัน",
  confirmed: "ยืนยันแล้ว",
  completed: "เสร็จแล้ว",
  cancelled: "ยกเลิก",
};

function time(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function auditLabel(action: string) {
  const labels: Record<string, string> = {
    "system.audit.foundation.deployed": "เปิดใช้งานระบบ Audit",
    "chat.reply.sent": "เจ้าของส่งข้อความตอบลูกค้า",
    "payment.slip.rejected": "SlipOK ปฏิเสธสลิป",
    "payment.slip.duplicate": "ตรวจพบสลิปซ้ำ",
    "payment.deposit.verified": "ยืนยันมัดจำสำเร็จ",
    "payment.deposit.underpaid": "ยอดมัดจำไม่ครบ",
  };
  return labels[action] || action;
}

export default async function OfficePage() {
  if (!isFeatureEnabled("office")) notFound();
  if (!(await hasOwnerSession())) redirect("/login");

  const data = await getOfficeDashboardData();
  const displayDate = new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${data.date}T12:00:00+07:00`));

  const cards = [
    { label: "คิววันนี้", value: data.bookings.length.toLocaleString("th-TH"), detail: displayDate, icon: CalendarDays },
    { label: "รายได้ประมาณการ", value: `฿${data.estimatedRevenue.toLocaleString("th-TH")}`, detail: "ไม่รวมคิวที่ยกเลิก", icon: WalletCards },
    { label: "มัดจำที่ยังค้าง", value: data.pendingDepositCount.toLocaleString("th-TH"), detail: "คิวรอยืนยันและยืนยันแล้ว", icon: CheckCircle2 },
    { label: "แชทที่รับช่วง", value: data.humanChatCount.toLocaleString("th-TH"), detail: "สถานะเจ้าของดูแล", icon: Inbox },
  ];

  return (
    <main className="min-h-screen bg-[#F5F0EB] px-4 py-6 text-[#1A1A1A] md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-[2rem] border border-white/80 bg-white px-5 py-6 shadow-[0_18px_50px_rgba(68,44,48,0.08)] md:px-8 md:py-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#B76E79]">
                <Sparkles size={15} /> Antonette Digital Office
              </div>
              <h1 className="font-serif text-3xl leading-tight md:text-5xl">สรุปร้านวันนี้</h1>
              <p className="mt-3 text-sm text-slate-500">ข้อมูลจริงแบบอ่านอย่างเดียว · อัปเดตเมื่อเปิดหน้า</p>
            </div>
            <div className="hidden rounded-2xl bg-[#F5F0EB] p-3 text-[#B76E79] md:block"><Sparkles size={24} /></div>
          </div>
        </header>

        {data.hasPartialData && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <AlertTriangle size={17} /> ข้อมูลบางส่วนยังโหลดไม่สำเร็จ กรุณาลองเปิดหน้าใหม่
          </div>
        )}

        <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map((card) => (
            <article key={card.label} className="rounded-3xl border border-white/80 bg-white p-4 shadow-[0_12px_35px_rgba(68,44,48,0.06)] md:p-5">
              <div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-500 md:text-sm">{card.label}</p><card.icon size={18} className="text-[#B76E79]" /></div>
              <p className="mt-4 font-serif text-3xl md:text-4xl">{card.value}</p>
              <p className="mt-2 text-[10px] text-slate-400 md:text-xs">{card.detail}</p>
            </article>
          ))}
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <article className="rounded-3xl border border-white/80 bg-white p-5 shadow-[0_12px_35px_rgba(68,44,48,0.06)] md:p-7">
            <div className="flex items-center gap-3"><div className="rounded-2xl bg-rose-50 p-3 text-[#B76E79]"><Clock3 size={20} /></div><div><h2 className="font-serif text-2xl">คิววันนี้</h2><p className="text-xs text-slate-400">เรียงตามเวลาเริ่มงาน</p></div></div>
            <div className="mt-5 space-y-3">
              {data.bookings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50/40 px-4 py-8 text-center text-sm text-slate-500">วันนี้ยังไม่มีคิว</div>
              ) : data.bookings.map((booking) => (
                <div key={booking.id} className="rounded-2xl border border-slate-100 px-4 py-3">
                  <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{booking.customerName}</p><p className="mt-1 text-xs text-slate-400">{booking.services.join(", ") || "ยังไม่ระบุบริการ"}</p></div><span className="whitespace-nowrap text-sm font-semibold text-[#B76E79]">{time(booking.startTime)}–{time(booking.endTime)}</span></div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{statusLabels[booking.status] || booking.status}</span><span className={`rounded-full px-2.5 py-1 ${booking.depositPaid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{booking.depositPaid ? "จ่ายมัดจำแล้ว" : "ยังไม่จ่ายมัดจำ"}</span><span className="ml-auto font-semibold">฿{booking.totalPrice.toLocaleString("th-TH")}</span></div>
                </div>
              ))}
            </div>
          </article>

          <aside className="rounded-3xl bg-[#1A1A1A] p-5 text-white shadow-[0_12px_35px_rgba(26,26,26,0.16)] md:p-7">
            <div className="flex items-center gap-2 text-[#D9A0A8]"><CheckCircle2 size={18} /><p className="text-xs font-semibold uppercase tracking-wider">Audit ล่าสุด</p></div>
            <div className="mt-5 space-y-4">
              {data.audits.length === 0 ? <p className="text-sm text-slate-400">ยังไม่มีประวัติการทำงาน</p> : data.audits.map((audit) => (
                <div key={audit.id} className="border-b border-white/10 pb-3 last:border-0"><p className="text-sm text-slate-100">{auditLabel(audit.action)}</p><p className="mt-1 text-[10px] text-slate-500">{new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" }).format(new Date(audit.createdAt))} · {audit.actorType}</p></div>
              ))}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
