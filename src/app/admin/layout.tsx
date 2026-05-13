"use client";

import { useState, useEffect } from "react";
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
  Tag,
  Wand2,
  Scissors,
  Menu,
  X,
  Gift,
} from "lucide-react";
import { Toaster } from "react-hot-toast";

const navItems = [
  { href: "/admin", label: "ภาพรวม", icon: LayoutDashboard, exact: true },
  { href: "/admin/booking", label: "ลงคิวใหม่", icon: PlusSquare, exact: false },
  { href: "/admin/calendar", label: "ตารางคิว", icon: CalendarDays, exact: false },
  { href: "/admin/finance", label: "รายรับ-รายจ่าย", icon: DollarSign, exact: false },
  { href: "/admin/receipts", label: "ประวัติบิล", icon: Receipt, exact: false },
  { href: "/admin/promotions", label: "โปรโมชั่น", icon: Tag, exact: false },
  { href: "/admin/rewards", label: "ของรางวัล/คูปอง", icon: Gift, exact: false },
  { href: "/admin/inventory", label: "จัดการสต็อก", icon: PackageSearch, exact: false },
  { href: "/admin/customers", label: "ประวัติลูกค้า", icon: Users, exact: false },
  { href: "/admin/estimator", label: "AI ประเมินราคา", icon: Wand2, exact: false },
  { href: "/admin/settings", label: "ตั้งค่าร้าน", icon: Settings, exact: false },
];


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <div className="flex h-screen bg-brand-pink overflow-hidden flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between bg-white p-4 border-b border-pink-100 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-sm">
            <Sparkles size={16} className="text-white" />
          </div>
          <p className="font-bold text-brand-dark leading-none">Antonette Nail</p>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-pink-100 flex flex-col shrink-0 transform transition-transform duration-300 ease-in-out md:relative md:w-60 md:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`} 
        style={{ boxShadow: "var(--shadow-sidebar)" }}
      >
        {/* Logo */}
        <div className="p-5 border-b border-pink-100 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-sm">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-brand-dark leading-none">Antonette Nail</p>
              <p className="text-[10px] text-brand-slate mt-0.5">Studio Management</p>
            </div>
          </div>
          <button 
            className="md:hidden p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
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
      <main className="flex-1 overflow-y-auto w-full relative">
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
        <div className="p-4 md:p-8 max-w-6xl mx-auto animate-fade-in pb-20">
          {children}
        </div>
      </main>
    </div>
  );
}