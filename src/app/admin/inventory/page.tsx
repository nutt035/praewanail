"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { InventoryItem } from "@/lib/types";
import {
  Plus, Minus, PackageSearch, AlertTriangle, X, Pencil, Trash2,
  Palette, Layers, FlaskConical, Filter,
} from "lucide-react";
import toast from "react-hot-toast";

type ModalMode = "add" | "edit" | "adjust" | null;

const UNITS = ["ขวด", "กระปุก", "ห่อ", "ชิ้น", "แผ่น", "อัน", "ถุง", "กล่อง"];

const CATEGORIES = [
  { value: "สีเจล/เนื้อเจล", label: "สีเจล/เนื้อเจล", icon: Palette, color: "text-violet-600 bg-violet-50 border-violet-100", defaultThreshold: 3 },
  { value: "วัสดุสิ้นเปลือง", label: "วัสดุสิ้นเปลือง", icon: Layers, color: "text-amber-600 bg-amber-50 border-amber-100", defaultThreshold: 20 },
  { value: "ของใช้หลัก", label: "ของใช้หลัก", icon: FlaskConical, color: "text-emerald-600 bg-emerald-50 border-emerald-100", defaultThreshold: 2 },
];

function getCatConfig(cat: string | null) {
  return CATEGORIES.find((c) => c.value === cat) || CATEGORIES[0];
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalMode>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustNote, setAdjustNote] = useState("");   // บันทึกค่าใช้จ่ายไหม
  const [adjustCost, setAdjustCost] = useState(0);    // ราคาที่ซื้อ
  const [logExpense, setLogExpense] = useState(false); // เชื่อม finance ไหม
  const [form, setForm] = useState({
    item_name: "",
    quantity: 0,
    unit: "ขวด",
    category: "สีเจล/เนื้อเจล",
    min_threshold: 3,
  });
  const [saving, setSaving] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("ทั้งหมด");

  useEffect(() => { fetchItems(); }, []);

  async function fetchItems() {
    setLoading(true);
    const { data } = await supabase.from("inventory").select("*").order("category").order("item_name");
    setItems((data as InventoryItem[]) || []);
    setLoading(false);
  }

  function openAdd() {
    setForm({ item_name: "", quantity: 0, unit: "ขวด", category: "สีเจล/เนื้อเจล", min_threshold: 3 });
    setSelectedItem(null);
    setModal("add");
  }

  function openEdit(item: InventoryItem) {
    setForm({
      item_name: item.item_name,
      quantity: item.quantity,
      unit: item.unit || "ขวด",
      category: item.category || "สีเจล/เนื้อเจล",
      min_threshold: item.min_threshold,
    });
    setSelectedItem(item);
    setModal("edit");
  }

  function openAdjust(item: InventoryItem, direction: "add" | "sub") {
    setSelectedItem(item);
    setAdjustQty(direction === "add" ? 1 : -1);
    setAdjustNote("");
    setAdjustCost(0);
    setLogExpense(false);
    setModal("adjust");
  }

  async function saveItem() {
    if (!form.item_name.trim()) { toast.error("กรุณาใส่ชื่อสินค้า"); return; }
    setSaving(true);
    if (modal === "add") {
      const { error } = await supabase.from("inventory").insert([form]);
      if (error) { toast.error("เกิดข้อผิดพลาด"); setSaving(false); return; }
      toast.success("เพิ่มสต็อกเรียบร้อย ✓");
    } else if (modal === "edit" && selectedItem) {
      const { error } = await supabase.from("inventory").update(form).eq("id", selectedItem.id);
      if (error) { toast.error("เกิดข้อผิดพลาด"); setSaving(false); return; }
      toast.success("อัพเดตเรียบร้อย ✓");
    }
    setSaving(false);
    setModal(null);
    fetchItems();
  }

  async function confirmAdjust() {
    if (!selectedItem || adjustQty === 0) return;
    setSaving(true);
    const newQty = Math.max(0, selectedItem.quantity + adjustQty);
    const { error } = await supabase.from("inventory").update({ quantity: newQty }).eq("id", selectedItem.id);
    if (error) { toast.error("เกิดข้อผิดพลาด"); setSaving(false); return; }

    // บันทึกค่าใช้จ่ายใน Finance ถ้าเลือก
    if (logExpense && adjustQty > 0 && adjustCost > 0) {
      await supabase.from("transactions").insert([{
        type: "expense",
        amount: adjustCost,
        category: `ซื้อ ${selectedItem.item_name}`,
      }]);
      toast.success(`อัพเดตสต็อก + บันทึกรายจ่าย ฿${adjustCost} ✓`);
    } else {
      toast.success(`อัพเดตสต็อก ${selectedItem.item_name} เรียบร้อย ✓`);
    }

    setSaving(false);
    setModal(null);
    fetchItems();
  }

  async function deleteItem(item: InventoryItem) {
    if (!confirm(`ลบ "${item.item_name}" ออกจากสต็อก?`)) return;
    const { error } = await supabase.from("inventory").delete().eq("id", item.id);
    if (error) { toast.error("ไม่สามารถลบได้"); return; }
    toast.success("ลบเรียบร้อย ✓");
    fetchItems();
  }

  // ── filter ──
  const filterOptions = ["ทั้งหมด", ...CATEGORIES.map((c) => c.value)];
  const displayedItems = activeFilter === "ทั้งหมด"
    ? items
    : items.filter((i) => (i.category || "สีเจล/เนื้อเจล") === activeFilter);

  const lowItems = items.filter((i) => i.quantity <= i.min_threshold);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">จัดการสต็อก 📦</h2>
          <p className="page-subtitle">ติดตามสีและอุปกรณ์ทำเล็บ</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={16} /> เพิ่มสินค้า
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        {CATEGORIES.map((cat) => {
          const catItems = items.filter((i) => (i.category || "สีเจล/เนื้อเจล") === cat.value);
          const catLow = catItems.filter((i) => i.quantity <= i.min_threshold).length;
          const Icon = cat.icon;
          return (
            <div key={cat.value} className="stat-card">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${cat.color}`}>
                  <Icon size={16} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 truncate max-w-[90px]">{cat.label}</p>
                  <p className="text-lg font-bold text-brand-dark">
                    {catItems.length} รายการ
                    {catLow > 0 && <span className="text-xs text-rose-400 ml-1">({catLow} ใกล้หมด)</span>}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* แจ้งเตือนของใกล้หมด */}
      {lowItems.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl animate-slide-up">
          <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-700">มีสินค้าใกล้หมด {lowItems.length} รายการ</p>
            <p className="text-xs text-amber-600 mt-0.5">{lowItems.map((i) => i.item_name).join(", ")}</p>
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex items-center gap-1 text-slate-400 mr-1">
          <Filter size={13} />
          <span className="text-xs">กรอง:</span>
        </div>
        {filterOptions.map((f) => {
          const cat = CATEGORIES.find((c) => c.value === f);
          const Icon = cat?.icon;
          return (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${activeFilter === f
                ? "bg-gradient-to-r from-rose-400 to-pink-500 text-white border-transparent shadow-sm"
                : "bg-white text-slate-500 border-pink-100 hover:border-rose-300"
              }`}
            >
              {Icon && <Icon size={12} />}
              {f}
            </button>
          );
        })}
      </div>

      {/* สต็อกทั้งหมด */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table min-w-[700px]">
            <thead>
              <tr>
              <th>ชื่อสินค้า</th>
              <th>หมวด</th>
              <th>จำนวน</th>
              <th>หน่วย</th>
              <th>เตือนเมื่อ</th>
              <th>สถานะ</th>
              <th className="text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td colSpan={7}><div className="h-4 bg-pink-50 rounded animate-pulse" /></td>
                </tr>
              ))
            ) : displayedItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">
                  <PackageSearch size={32} className="mx-auto mb-2 text-pink-200" />
                  <p className="text-sm">ยังไม่มีสินค้าในหมวดนี้</p>
                </td>
              </tr>
            ) : (
              displayedItems.map((item) => {
                const isLow = item.quantity <= item.min_threshold;
                const catCfg = getCatConfig(item.category);
                const CatIcon = catCfg.icon;
                return (
                  <tr key={item.id}>
                    <td className="font-medium">{item.item_name}</td>
                    <td>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${catCfg.color}`}>
                        <CatIcon size={10} />
                        {catCfg.label}
                      </span>
                    </td>
                    <td>
                      <span className={`font-bold text-lg ${isLow ? "text-rose-500" : "text-emerald-600"}`}>
                        {item.quantity}
                      </span>
                    </td>
                    <td className="text-slate-400">{item.unit || "-"}</td>
                    <td className="text-slate-400">≤ {item.min_threshold}</td>
                    <td>
                      {isLow ? (
                        <span className="badge badge-cancelled">⚠ ใกล้หมด</span>
                      ) : (
                        <span className="badge badge-completed">✓ ปกติ</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openAdjust(item, "sub")}
                          className="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition-colors"
                          title="ตัดสต็อก"
                        >
                          <Minus size={13} />
                        </button>
                        <button
                          onClick={() => openAdjust(item, "add")}
                          className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-colors"
                          title="เพิ่มสต็อก"
                        >
                          <Plus size={13} />
                        </button>
                        <button
                          onClick={() => openEdit(item)}
                          className="w-7 h-7 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 flex items-center justify-center transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => deleteItem(item)}
                          className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add / Edit */}
      {(modal === "add" || modal === "edit") && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up">
            <div className="px-6 py-4 border-b border-pink-100 flex justify-between items-center">
              <h4 className="font-bold text-brand-dark">{modal === "add" ? "เพิ่มสินค้าใหม่" : "แก้ไขสินค้า"}</h4>
              <button onClick={() => setModal(null)} className="btn-ghost py-1 px-2"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="form-label">ชื่อสินค้า *</label>
                <input
                  className="input-field"
                  value={form.item_name}
                  onChange={(e) => setForm((f) => ({ ...f, item_name: e.target.value }))}
                  placeholder="เช่น สีเจล OPI #52"
                />
              </div>

              {/* หมวดหมู่ */}
              <div>
                <label className="form-label">หมวดหมู่</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => {
                          setForm((f) => ({
                            ...f,
                            category: cat.value,
                            min_threshold: cat.defaultThreshold,
                          }));
                        }}
                        className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium border transition-all ${form.category === cat.value
                          ? "bg-rose-400 text-white border-transparent"
                          : "bg-white text-slate-500 border-pink-100 hover:border-rose-200"
                        }`}
                      >
                        <Icon size={15} />
                        <span className="text-center leading-tight">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">จำนวน</label>
                  <input
                    type="number"
                    className="input-field"
                    value={form.quantity}
                    min={0}
                    onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="form-label">หน่วย</label>
                  <select
                    className="input-field"
                    value={form.unit}
                    onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  >
                    {UNITS.map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label">แจ้งเตือนเมื่อเหลือน้อยกว่า</label>
                <input
                  type="number"
                  className="input-field"
                  value={form.min_threshold}
                  min={0}
                  onChange={(e) => setForm((f) => ({ ...f, min_threshold: Number(e.target.value) }))}
                />
                <p className="text-xs text-slate-400 mt-1">
                  💡 แนะนำ: สีเจล ≤ 3, วัสดุสิ้นเปลือง ≤ 20, ของใช้หลัก ≤ 2
                </p>
              </div>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="btn-ghost">ยกเลิก</button>
              <button onClick={saveItem} disabled={saving} className="btn-primary">
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Adjust */}
      {modal === "adjust" && selectedItem && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up">
            <div className="px-6 py-4 border-b border-pink-100 flex justify-between items-center">
              <h4 className="font-bold text-brand-dark">{adjustQty > 0 ? "เพิ่มสต็อก" : "ตัดสต็อก"}</h4>
              <button onClick={() => setModal(null)} className="btn-ghost py-1 px-2"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                สินค้า: <strong>{selectedItem.item_name}</strong>
              </p>
              <p className="text-sm text-slate-500">
                สต็อกปัจจุบัน: <strong>{selectedItem.quantity} {selectedItem.unit}</strong>
              </p>

              {/* จำนวน */}
              <div>
                <label className="form-label">{adjustQty > 0 ? "เพิ่มจำนวน" : "ตัดจำนวน"}</label>
                <input
                  type="number"
                  className="input-field text-center text-xl font-bold"
                  value={Math.abs(adjustQty)}
                  min={1}
                  onChange={(e) => {
                    const val = Math.max(1, Number(e.target.value));
                    setAdjustQty(adjustQty > 0 ? val : -val);
                  }}
                />
              </div>

              <p className="text-sm text-slate-500 text-center">
                หลังอัพเดต:{" "}
                <strong className={Math.max(0, selectedItem.quantity + adjustQty) <= selectedItem.min_threshold ? "text-rose-500" : "text-emerald-600"}>
                  {Math.max(0, selectedItem.quantity + adjustQty)} {selectedItem.unit}
                </strong>
              </p>

              {/* เชื่อม Finance (เฉพาะการเพิ่มสต็อก = ซื้อของ) */}
              {adjustQty > 0 && (
                <div className={`p-3 rounded-xl border transition-all ${logExpense ? "border-emerald-200 bg-emerald-50" : "border-pink-100 bg-slate-50"}`}>
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setLogExpense(!logExpense)}
                  >
                    <div>
                      <p className="text-sm font-medium text-brand-dark">💰 บันทึกค่าใช้จ่ายด้วย</p>
                      <p className="text-xs text-slate-400">บันทึกลง Finance → รายจ่าย อัตโนมัติ</p>
                    </div>
                    <div className={`w-10 h-5 rounded-full transition-all relative shrink-0 ${logExpense ? "bg-emerald-500" : "bg-slate-200"}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${logExpense ? "left-5" : "left-0.5"}`} />
                    </div>
                  </div>
                  {logExpense && (
                    <div className="mt-3">
                      <label className="form-label">ราคาที่ซื้อ (บาท)</label>
                      <input
                        type="number"
                        className="input-field mt-1"
                        value={adjustCost}
                        min={0}
                        onChange={(e) => setAdjustCost(Number(e.target.value))}
                        placeholder="0"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="px-6 pb-5 flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="btn-ghost">ยกเลิก</button>
              <button onClick={confirmAdjust} disabled={saving || adjustQty === 0} className="btn-primary">
                {saving ? "กำลังบันทึก..." : "ยืนยัน"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
