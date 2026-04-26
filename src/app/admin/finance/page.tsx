"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Transaction } from "@/lib/types";
import { TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight, Filter, Calendar } from "lucide-react";
import toast from "react-hot-toast";

type Period = "today" | "week" | "month" | "all";

function getDateRange(period: Period) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (period) {
    case "today":
      return { start: start.toISOString(), end: new Date(start.getTime() + 86400000).toISOString(), label: "วันนี้" };
    case "week": {
      const weekStart = new Date(start);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      return { start: weekStart.toISOString(), end: new Date(start.getTime() + 86400000).toISOString(), label: "สัปดาห์นี้" };
    }
    case "month":
      return { start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), end: new Date(start.getTime() + 86400000).toISOString(), label: "เดือนนี้" };
    case "all":
      return { start: new Date(2020, 0, 1).toISOString(), end: new Date(2030, 0, 1).toISOString(), label: "ทั้งหมด" };
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

export default function FinancePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [period, setPeriod] = useState<Period>("month");
  const [loading, setLoading] = useState(true);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ amount: 0, category: "ค่าอุปกรณ์" });
  const [saving, setSaving] = useState(false);

  const EXPENSE_CATEGORIES = ["ค่าอุปกรณ์", "ค่าสี/เจล", "ค่าน้ำค่าไฟ", "ค่าเช่า", "ค่าขนส่ง", "อื่นๆ"];

  useEffect(() => { fetchTransactions(); }, [period]);

  async function fetchTransactions() {
    setLoading(true);
    const range = getDateRange(period);
    let query = supabase.from("transactions").select("*").order("created_at", { ascending: false });
    if (period !== "all") {
      query = query.gte("created_at", range.start).lt("created_at", range.end);
    }
    const { data } = await query;
    setTransactions((data as Transaction[]) || []);
    setLoading(false);
  }

  async function addExpense() {
    if (expenseForm.amount <= 0) { toast.error("กรุณาใส่จำนวนเงิน"); return; }
    setSaving(true);
    const { error } = await supabase.from("transactions").insert([{
      type: "expense",
      amount: expenseForm.amount,
      category: expenseForm.category,
    }]);
    if (error) { toast.error("เกิดข้อผิดพลาด"); setSaving(false); return; }
    toast.success("บันทึกรายจ่ายเรียบร้อย ✓");
    setSaving(false);
    setShowAddExpense(false);
    setExpenseForm({ amount: 0, category: "ค่าอุปกรณ์" });
    fetchTransactions();
  }

  const income = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const expense = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const profit = income - expense;
  const rangeLabel = getDateRange(period).label;

  // จัดกลุ่มรายจ่ายตาม category
  const expenseByCategory: Record<string, number> = {};
  transactions.filter((t) => t.type === "expense").forEach((t) => {
    const cat = t.category || "อื่นๆ";
    expenseByCategory[cat] = (expenseByCategory[cat] || 0) + t.amount;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">สรุปรายรับ-รายจ่าย 💰</h2>
          <p className="page-subtitle">ภาพรวมทางการเงินของร้าน</p>
        </div>
        <button onClick={() => setShowAddExpense(true)} className="btn-primary">
          <ArrowDownRight size={16} /> บันทึกรายจ่าย
        </button>
      </div>

      {/* Period filter */}
      <div className="flex gap-1 bg-white rounded-xl p-1 border border-pink-100 w-fit">
        {([
          { value: "today", label: "วันนี้" },
          { value: "week", label: "สัปดาห์" },
          { value: "month", label: "เดือนนี้" },
          { value: "all", label: "ทั้งหมด" },
        ] as { value: Period; label: string }[]).map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              period === p.value
                ? "bg-gradient-to-r from-rose-400 to-pink-500 text-white shadow-sm"
                : "text-slate-500 hover:bg-pink-50"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* รายรับ */}
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">รายรับ</p>
              <p className="text-3xl font-bold text-emerald-600 mt-1">฿{income.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-1">{rangeLabel}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <TrendingUp size={20} className="text-emerald-500" />
            </div>
          </div>
        </div>

        {/* รายจ่าย */}
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">รายจ่าย</p>
              <p className="text-3xl font-bold text-rose-500 mt-1">฿{expense.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-1">{rangeLabel}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
              <TrendingDown size={20} className="text-rose-500" />
            </div>
          </div>
        </div>

        {/* กำไร */}
        <div className="stat-card" style={{ borderColor: profit >= 0 ? "#d1fae5" : "#fee2e2" }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">กำไรสุทธิ</p>
              <p className={`text-3xl font-bold mt-1 ${profit >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                {profit >= 0 ? "+" : ""}฿{profit.toLocaleString()}
              </p>
              <p className="text-xs text-slate-400 mt-1">{rangeLabel}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${profit >= 0 ? "bg-emerald-50" : "bg-rose-50"}`}>
              <DollarSign size={20} className={profit >= 0 ? "text-emerald-500" : "text-rose-500"} />
            </div>
          </div>
        </div>
      </div>

      {/* Expense breakdown */}
      {Object.keys(expenseByCategory).length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-brand-dark text-sm mb-3">สัดส่วนรายจ่าย</h3>
          <div className="space-y-2">
            {Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => {
              const pct = expense > 0 ? Math.round((amount / expense) * 100) : 0;
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-sm text-slate-600 w-24 truncate">{cat}</span>
                  <div className="flex-1 h-2 bg-pink-50 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-rose-400 to-pink-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-brand-dark w-20 text-right">฿{amount.toLocaleString()}</span>
                  <span className="text-xs text-slate-400 w-10 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transaction list */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-pink-100 flex items-center justify-between">
          <h3 className="font-semibold text-brand-dark text-sm">รายการทั้งหมด</h3>
          <span className="text-xs text-slate-400">{transactions.length} รายการ</span>
        </div>
        <div className="divide-y divide-pink-50 max-h-96 overflow-y-auto">
          {loading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="px-5 py-4"><div className="h-4 bg-pink-50 rounded animate-pulse w-1/2" /></div>
            ))
          ) : transactions.length === 0 ? (
            <div className="px-5 py-12 text-center text-slate-400">
              <DollarSign size={28} className="mx-auto mb-2 text-pink-200" />
              <p className="text-sm">ยังไม่มีรายการในช่วงนี้</p>
            </div>
          ) : (
            transactions.map((t) => (
              <div key={t.id} className="px-5 py-3 flex items-center gap-3 hover:bg-pink-50/50 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${t.type === "income" ? "bg-emerald-50" : "bg-rose-50"}`}>
                  {t.type === "income" ? <ArrowUpRight size={16} className="text-emerald-500" /> : <ArrowDownRight size={16} className="text-rose-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-dark">{t.category || (t.type === "income" ? "รายได้" : "รายจ่าย")}</p>
                  <p className="text-xs text-slate-400">{formatDate(t.created_at)} · {formatTime(t.created_at)}</p>
                </div>
                <p className={`text-sm font-bold shrink-0 ${t.type === "income" ? "text-emerald-600" : "text-rose-500"}`}>
                  {t.type === "income" ? "+" : "-"}฿{t.amount.toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add expense modal */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up">
            <div className="px-6 py-4 border-b border-pink-100 flex justify-between items-center">
              <h4 className="font-bold text-brand-dark">บันทึกรายจ่าย</h4>
              <button onClick={() => setShowAddExpense(false)} className="btn-ghost py-1 px-2"><Filter size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="form-label">จำนวนเงิน (บาท) *</label>
                <input
                  type="number"
                  className="input-field"
                  value={expenseForm.amount}
                  min={0}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="form-label">หมวดหมู่</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setExpenseForm((f) => ({ ...f, category: cat }))}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${expenseForm.category === cat
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
              <button onClick={() => setShowAddExpense(false)} className="btn-ghost">ยกเลิก</button>
              <button onClick={addExpense} disabled={saving} className="btn-primary">
                {saving ? "กำลังบันทึก..." : "บันทึกรายจ่าย"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
