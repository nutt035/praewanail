"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  PlusSquare,
  PackageSearch,
  Users,
  Settings,
  Sparkles,
  DollarSign,
  Receipt,
} from "lucide-react";
import { Toaster } from "react-hot-toast";

const navItems = [
  { href: "/admin", label: "ภาพรวม", icon: LayoutDashboard, exact: true },
  { href: "/admin/booking", label: "ลงคิวใหม่", icon: PlusSquare, exact: false },
  { href: "/admin/calendar", label: "ตารางคิว", icon: CalendarDays, exact: false },
  { href: "/admin/finance", label: "รายรับ-รายจ่าย", icon: DollarSign, exact: false },
  { href: "/admin/receipts", label: "ประวัติบิล", icon: Receipt, exact: false },
  { href: "/admin/inventory", label: "จัดการสต็อก", icon: PackageSearch, exact: false },
  { href: "/admin/customers", label: "ประวัติลูกค้า", icon: Users, exact: false },
  { href: "/admin/settings", label: "ตั้งค่าร้าน", icon: Settings, exact: false },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <div className="flex h-screen bg-brand-pink overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-pink-100 flex flex-col shrink-0" style={{ boxShadow: "var(--shadow-sidebar)" }}>
        {/* Logo */}
        <div className="p-5 border-b border-pink-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-sm">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-brand-dark leading-none">Antonette Nail</p>
              <p className="text-[10px] text-brand-slate mt-0.5">Studio Management</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${active ? "active" : ""}`}
              >
                <item.icon size={18} className={active ? "text-rose-500" : "text-slate-400"} />
                <span>{item.label}</span>
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-rose-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-pink-100">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-rose-400 transition-colors"
          >
            <Sparkles size={12} />
            <span>ดูหน้าลูกค้า →</span>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              borderRadius: "0.75rem",
              fontFamily: "Prompt, sans-serif",
              fontSize: "0.875rem",
            },
          }}
        />
        <div className="p-8 max-w-6xl mx-auto animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}