import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Inbox,
  LayoutDashboard,
  MessageCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Store,
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

  const activeBookings = data.bookings.filter((booking) => booking.status !== "cancelled");
  const completedCount = activeBookings.filter((booking) => booking.status === "completed").length;
  const completion = activeBookings.length > 0
    ? Math.round((completedCount / activeBookings.length) * 100)
    : 0;

  const quickActions = [
    { href: "/admin/booking", label: "ลงคิวใหม่", detail: "เพิ่มนัดให้ลูกค้า", icon: Plus, accent: "bg-[#1A1A1A] text-white" },
    { href: "/admin/calendar", label: "ตารางคิว", detail: "ดูและจัดการนัด", icon: CalendarDays, accent: "bg-[#F3E6E7] text-[#9C5964]" },
    { href: "/admin/chat", label: "แชทลูกค้า", detail: "ตอบแชทที่รับช่วง", icon: MessageCircle, accent: "bg-[#EDF3F0] text-[#4A7562]" },
    { href: "/admin/finance", label: "การเงิน", detail: "ดูรายรับรายจ่าย", icon: WalletCards, accent: "bg-[#F5EEDC] text-[#8B6D2E]" },
  ];

  return (
    <main className="min-h-screen bg-[#F7F4F1] pb-28 text-[#1A1A1A] md:pb-10">
      <div className="mx-auto max-w-7xl px-4 py-4 md:px-8 md:py-7">
        <header className="overflow-hidden rounded-[1.75rem] bg-[#1A1A1A] text-white shadow-[0_24px_70px_rgba(30,20,22,0.16)]">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 md:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#B76E79] shadow-[0_8px_24px_rgba(183,110,121,0.35)]">
                <Store size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold">Antonette Nail</p>
                <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-white/55">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Digital Office พร้อมใช้งาน
                </div>
              </div>
            </div>
            <Link href="/office" aria-label="อัปเดตข้อมูล" className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-white/70 transition hover:bg-white/10 hover:text-white">
              <RefreshCw size={17} />
            </Link>
          </div>

          <div className="grid gap-6 px-5 py-7 md:grid-cols-[1fr_auto] md:items-end md:px-8 md:py-9">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[#D8A0A8]">
                <Sparkles size={13} /> ภาพรวมวันนี้
              </div>
              <h1 className="mt-3 font-serif text-3xl leading-tight md:text-5xl">สวัสดีค่ะ วันนี้ร้าน<br className="hidden sm:block" />เป็นอย่างไรบ้าง</h1>
              <p className="mt-3 text-sm text-white/55">{displayDate}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 md:min-w-64">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/60">ความคืบหน้าคิววันนี้</span>
                <span className="font-semibold text-[#E9B7BE]">{completedCount}/{activeBookings.length} คิว</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-[#B76E79] to-[#E4A8B0] transition-all" style={{ width: `${completion}%` }} />
              </div>
              <p className="mt-2 text-[10px] text-white/40">{activeBookings.length === 0 ? "ยังไม่มีคิวในวันนี้" : completion === 100 ? "เสร็จครบทุกคิวแล้ว" : `เสร็จแล้ว ${completion}%`}</p>
            </div>
          </div>
        </header>

        {data.hasPartialData && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <AlertTriangle size={17} /> ข้อมูลบางส่วนยังโหลดไม่สำเร็จ กรุณาลองเปิดหน้าใหม่
          </div>
        )}

        <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map((card) => (
            <article key={card.label} className="rounded-[1.4rem] border border-[#EDE7E3] bg-white p-4 shadow-[0_12px_35px_rgba(68,44,48,0.045)] md:p-5">
              <div className="flex items-center justify-between"><p className="text-[11px] font-semibold text-slate-500 md:text-sm">{card.label}</p><span className="rounded-xl bg-[#F7F1EF] p-2 text-[#B76E79]"><card.icon size={17} /></span></div>
              <p className="mt-3 font-serif text-3xl md:text-4xl">{card.value}</p>
              <p className="mt-2 text-[10px] text-slate-400 md:text-xs">{card.detail}</p>
            </article>
          ))}
        </section>

        <section className="mt-5 rounded-[1.6rem] border border-[#EDE7E3] bg-white p-5 shadow-[0_12px_35px_rgba(68,44,48,0.045)] md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#B76E79]">Quick actions</p>
              <h2 className="mt-1 font-serif text-2xl">อยากทำอะไรต่อ</h2>
            </div>
            <Link href="/admin" className="hidden items-center gap-1 text-xs font-semibold text-[#9C5964] sm:flex">เปิดระบบเต็ม <ArrowRight size={14} /></Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href} className="group rounded-2xl border border-[#EFE9E5] p-3.5 transition hover:-translate-y-0.5 hover:border-[#DDBFC3] hover:shadow-md md:p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className={`rounded-xl p-2.5 ${action.accent}`}><action.icon size={18} /></span>
                  <ChevronRight size={16} className="mt-1 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#B76E79]" />
                </div>
                <p className="mt-3 text-sm font-semibold">{action.label}</p>
                <p className="mt-1 text-[10px] text-slate-400">{action.detail}</p>
              </Link>
            ))}
          </div>
        </section>

        {(data.pendingDepositCount > 0 || data.humanChatCount > 0) && (
          <section className="mt-5 grid gap-3 md:grid-cols-2">
            {data.pendingDepositCount > 0 && (
              <Link href="/admin/calendar" className="flex items-center gap-4 rounded-2xl border border-amber-200/70 bg-amber-50 px-4 py-4 transition hover:border-amber-300">
                <span className="rounded-xl bg-amber-100 p-2.5 text-amber-700"><BellRing size={19} /></span>
                <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-amber-900">มี {data.pendingDepositCount} คิวที่ยังรอมัดจำ</p><p className="mt-0.5 text-[11px] text-amber-700/70">แตะเพื่อเปิดตารางคิวและตรวจสอบ</p></div>
                <ChevronRight size={18} className="text-amber-500" />
              </Link>
            )}
            {data.humanChatCount > 0 && (
              <Link href="/admin/chat" className="flex items-center gap-4 rounded-2xl border border-rose-200/70 bg-rose-50 px-4 py-4 transition hover:border-rose-300">
                <span className="rounded-xl bg-rose-100 p-2.5 text-rose-700"><Inbox size={19} /></span>
                <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-rose-900">มี {data.humanChatCount} แชทที่รอคุณดูแล</p><p className="mt-0.5 text-[11px] text-rose-700/70">แตะเพื่อกลับไปตอบลูกค้า</p></div>
                <ChevronRight size={18} className="text-rose-500" />
              </Link>
            )}
          </section>
        )}

        <section className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
          <article className="rounded-[1.6rem] border border-[#EDE7E3] bg-white p-5 shadow-[0_12px_35px_rgba(68,44,48,0.045)] md:p-7">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3"><div className="rounded-2xl bg-[#F3E6E7] p-3 text-[#9C5964]"><Clock3 size={20} /></div><div><h2 className="font-serif text-2xl">คิววันนี้</h2><p className="text-xs text-slate-400">เรียงตามเวลาเริ่มงาน</p></div></div>
              <Link href="/admin/calendar" className="text-xs font-semibold text-[#B76E79]">ดูทั้งหมด</Link>
            </div>
            <div className="mt-5 space-y-3">
              {data.bookings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#DCCBC7] bg-[#FAF7F5] px-5 py-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#B76E79] shadow-sm"><CalendarDays size={22} /></div>
                  <p className="mt-4 text-sm font-semibold">วันนี้ยังไม่มีคิว</p>
                  <p className="mt-1 text-xs text-slate-400">เพิ่มคิวใหม่ หรือเปิดปฏิทินเพื่อดูวันถัดไป</p>
                  <div className="mt-4 flex justify-center gap-2"><Link href="/admin/booking" className="rounded-xl bg-[#1A1A1A] px-4 py-2.5 text-xs font-semibold text-white">+ ลงคิวใหม่</Link><Link href="/admin/calendar" className="rounded-xl border border-[#E2D8D4] bg-white px-4 py-2.5 text-xs font-semibold">ดูปฏิทิน</Link></div>
                </div>
              ) : data.bookings.map((booking) => (
                <Link href={`/admin/booking?edit=${booking.id}`} key={booking.id} className="block rounded-2xl border border-[#EFE9E5] px-4 py-4 transition hover:border-[#DDBFC3] hover:bg-[#FCFAF9]">
                  <div className="flex items-start gap-3">
                    <div className="w-14 shrink-0 rounded-xl bg-[#1A1A1A] px-2 py-2 text-center text-white"><p className="text-sm font-semibold">{time(booking.startTime)}</p><p className="mt-0.5 text-[9px] text-white/45">ถึง {time(booking.endTime)}</p></div>
                    <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate font-semibold">{booking.customerName}</p><p className="mt-1 truncate text-xs text-slate-400">{booking.services.join(", ") || "ยังไม่ระบุบริการ"}</p></div><span className="shrink-0 text-sm font-semibold">฿{booking.totalPrice.toLocaleString("th-TH")}</span></div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px]"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{statusLabels[booking.status] || booking.status}</span><span className={`rounded-full px-2.5 py-1 ${booking.depositPaid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{booking.depositPaid ? "มัดจำแล้ว" : "รอมัดจำ"}</span></div></div>
                  </div>
                </Link>
              ))}
            </div>
          </article>

          <aside className="rounded-[1.6rem] bg-[#EDE5DF] p-5 md:p-7">
            <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-[#8F5A62]"><ShieldCheck size={18} /><p className="text-xs font-semibold uppercase tracking-wider">ระบบล่าสุด</p></div><span className="rounded-full bg-white/70 px-2.5 py-1 text-[9px] text-slate-500">Audit log</span></div>
            <div className="mt-5 space-y-4">
              {data.audits.length === 0 ? <p className="text-sm text-slate-500">ยังไม่มีประวัติการทำงาน</p> : data.audits.map((audit) => (
                <div key={audit.id} className="flex gap-3 border-b border-black/5 pb-3 last:border-0"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#B76E79]" /><div><p className="text-sm text-[#342D2F]">{auditLabel(audit.action)}</p><p className="mt-1 text-[10px] text-slate-500">{new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" }).format(new Date(audit.createdAt))} · {audit.actorType}</p></div></div>
              ))}
            </div>
          </aside>
        </section>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 rounded-2xl border border-white/70 bg-white/95 px-2 py-2 shadow-[0_18px_50px_rgba(35,25,27,0.18)] backdrop-blur md:hidden">
        <Link href="/office" className="flex flex-col items-center gap-1 rounded-xl py-1.5 text-[#B76E79]"><LayoutDashboard size={19} /><span className="text-[9px] font-semibold">Office</span></Link>
        <Link href="/admin/calendar" className="flex flex-col items-center gap-1 rounded-xl py-1.5 text-slate-400"><CalendarDays size={19} /><span className="text-[9px]">คิว</span></Link>
        <Link href="/admin/booking" aria-label="ลงคิวใหม่" className="mx-auto -mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1A1A1A] text-white shadow-lg"><Plus size={22} /></Link>
        <Link href="/admin/chat" className="flex flex-col items-center gap-1 rounded-xl py-1.5 text-slate-400"><MessageCircle size={19} /><span className="text-[9px]">แชท</span></Link>
        <Link href="/admin" className="flex flex-col items-center gap-1 rounded-xl py-1.5 text-slate-400"><Store size={19} /><span className="text-[9px]">จัดการ</span></Link>
      </nav>
    </main>
  );
}
