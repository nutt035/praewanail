"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { InventoryItem } from "@/lib/types";
import { Plus, Minus, PackageSearch, AlertTriangle, X, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

type ModalMode = "add" | "edit" | "adjust" | null;

const UNITS = ["ขวด", "กระปุก", "ห่อ", "ชิ้น", "แผ่น", "อัน", "ถุง"];

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalMode>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [form, setForm] = useState({ item_name: "", quantity: 0, unit: "ขวด", min_threshold: 5 });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchItems(); }, []);

  async function fetchItems() {
    setLoading(true);
    const { data } = await supabase.from("inventory").select("*").order("item_name");
    setItems((data as InventoryItem[]) || []);
    setLoading(false);
  }

  function openAdd() {
    setForm({ item_name: "", quantity: 0, unit: "ขวด", min_threshold: 5 });
    setSelectedItem(null);
    setModal("add");
  }

  function openEdit(item: InventoryItem) {
    setForm({ item_name: item.item_name, quantity: item.quantity, unit: item.unit || "ขวด", min_threshold: item.min_threshold });
    setSelectedItem(item);
    setModal("edit");
  }

  function openAdjust(item: InventoryItem, delta: number) {
    setSelectedItem(item);
    setAdjustQty(delta);
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
    if (!selectedItem) return;
    setSaving(true);
    const newQty = Math.max(0, selectedItem.quantity + adjustQty);
    const { error } = await supabase.from("inventory").update({ quantity: newQty }).eq("id", selectedItem.id);
    if (error) { toast.error("เกิดข้อผิดพลาด"); setSaving(false); return; }
    toast.success(`อัพเดตสต็อก ${selectedItem.item_name} เรียบร้อย ✓`);
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

      {/* สต็อกทั้งหมด */}
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>ชื่อสินค้า</th>
              <th>จำนวน</th>
              <th>หน่วย</th>
              <th>แจ้งเตือนเมื่อเหลือ</th>
              <th>สถานะ</th>
              <th className="text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td colSpan={6}>
                    <div className="h-4 bg-pink-50 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-400">
                  <PackageSearch size={32} className="mx-auto mb-2 text-pink-200" />
                  <p className="text-sm">ยังไม่มีสินค้าในสต็อก</p>
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const isLow = item.quantity <= item.min_threshold;
                return (
                  <tr key={item.id}>
                    <td className="font-medium">{item.item_name}</td>
                    <td>
                      <span className={`font-bold text-lg ${isLow ? "text-rose-500" : "text-emerald-600"}`}>
                        {item.quantity}
                      </span>
                    </td>
                    <td className="text-slate-400">{item.unit || "-"}</td>
                    <td className="text-slate-400">{item.min_threshold}</td>
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
                          onClick={() => openAdjust(item, -1)}
                          className="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition-colors"
                          title="ลดสต็อก"
                        >
                          <Minus size={13} />
                        </button>
                        <button
                          onClick={() => openAdjust(item, 1)}
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs animate-slide-up">
            <div className="px-6 py-4 border-b border-pink-100 flex justify-between items-center">
              <h4 className="font-bold text-brand-dark">{adjustQty > 0 ? "เพิ่มสต็อก" : "ตัดสต็อก"}</h4>
              <button onClick={() => setModal(null)} className="btn-ghost py-1 px-2"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">สินค้า: <strong>{selectedItem.item_name}</strong></p>
              <p className="text-sm text-slate-500">สต็อกปัจจุบัน: <strong>{selectedItem.quantity} {selectedItem.unit}</strong></p>
              <div>
                <label className="form-label">{adjustQty > 0 ? "เพิ่มจำนวน" : "ตัดจำนวน"}</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setAdjustQty((q) => q > 0 ? q - 1 : q < 0 ? q - 1 : q)}
                    className="btn-ghost py-1.5 px-3"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="text-xl font-bold text-brand-dark w-12 text-center">{Math.abs(adjustQty)}</span>
                  <button
                    onClick={() => setAdjustQty((q) => q > 0 ? q + 1 : q < 0 ? q + 1 : q)}
                    className="btn-ghost py-1.5 px-3"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-500">
                หลังอัพเดต: <strong className={Math.max(0, selectedItem.quantity + adjustQty) <= selectedItem.min_threshold ? "text-rose-500" : "text-emerald-600"}>
                  {Math.max(0, selectedItem.quantity + adjustQty)} {selectedItem.unit}
                </strong>
              </p>
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
