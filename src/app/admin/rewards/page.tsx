"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Reward } from "@/lib/types";
import { Plus, Edit2, Trash2, Gift, Save, X } from "lucide-react";
import toast from "react-hot-toast";

type RewardFormData = {
  title: string;
  description: string;
  points_required: number;
  value: number | string;
  reward_type: Reward["reward_type"];
  category: string;
  is_active: boolean;
};

export default function RewardsAdminPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<RewardFormData>({
    title: "",
    description: "",
    points_required: 5,
    value: 50,
    reward_type: "amount",
    category: "",
    is_active: true,
  });

  useEffect(() => {
    fetchRewards();
  }, []);

  async function fetchRewards() {
    setLoading(true);
    const { data, error } = await supabase.from("rewards").select("*").order("points_required", { ascending: true });
    if (!error && data) {
      setRewards(data as Reward[]);
    }
    setLoading(false);
  }

  function handleEdit(r: Reward) {
    setFormData({
      title: r.title,
      description: r.description || "",
      points_required: r.points_required,
      value: r.value,
      reward_type: r.reward_type,
      category: r.category || "",
      is_active: r.is_active,
    });
    setEditingId(r.id);
    setShowModal(true);
  }

  function handleAdd() {
    setFormData({
      title: "",
      description: "",
      points_required: 5,
      value: 50,
      reward_type: "amount",
      category: "",
      is_active: true
    });
    setEditingId(null);
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.title || formData.points_required <= 0) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    const t = toast.loading("กำลังบันทึก...");
    if (editingId) {
      const { error } = await supabase.from("rewards").update(formData).eq("id", editingId);
      if (error) toast.error("เกิดข้อผิดพลาด", { id: t });
      else toast.success("อัปเดตเรียบร้อย", { id: t });
    } else {
      const { error } = await supabase.from("rewards").insert([formData]);
      if (error) toast.error("เกิดข้อผิดพลาด", { id: t });
      else toast.success("เพิ่มเรียบร้อย", { id: t });
    }

    setShowModal(false);
    fetchRewards();
  }

  async function handleDelete(id: string) {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบของรางวัลชิ้นนี้?")) return;
    const { error } = await supabase.from("rewards").delete().eq("id", id);
    if (error) toast.error("ลบไม่สำเร็จ (อาจมีลูกค้าเคยแลกแล้ว)");
    else {
      toast.success("ลบเรียบร้อย");
      fetchRewards();
    }
  }

  async function toggleStatus(id: string, currentStatus: boolean) {
    await supabase.from("rewards").update({ is_active: !currentStatus }).eq("id", id);
    fetchRewards();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="page-title"><Gift className="inline mr-2 text-rose-500" /> จัดการของรางวัล / คูปอง</h2>
          <p className="page-subtitle">ตั้งค่าว่าลูกค้าสามารถนำแต้มไปแลกคูปองส่วนลดอะไรได้บ้าง</p>
        </div>
        <button onClick={handleAdd} className="btn-primary">
          <Plus size={16} /> สร้างคูปองใหม่
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-10 text-center text-slate-400">กำลังโหลดข้อมูล...</div>
        ) : rewards.length === 0 ? (
          <div className="col-span-full py-10 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-pink-200">
            ยังไม่มีของรางวัล กด "สร้างคูปองใหม่" เพื่อเริ่มต้น
          </div>
        ) : (
          rewards.map((r) => (
            <div key={r.id} className={`card p-5 border-2 transition-all ${r.is_active ? "border-transparent" : "border-slate-200 opacity-60"}`}>
              <div className="flex justify-between items-start mb-3">
                <span className="badge badge-pending font-bold text-sm bg-rose-100 text-rose-600">ใช้ {r.points_required} แต้ม</span>
                <div className="flex gap-1">
                  <button onClick={() => toggleStatus(r.id, r.is_active)} className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded hover:bg-slate-100">
                    {r.is_active ? "เปิดใช้" : "ปิด"}
                  </button>
                  <button onClick={() => handleEdit(r)} className="p-1 text-blue-400 hover:bg-blue-50 rounded"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(r.id)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                </div>
              </div>
              <h3 className="font-bold text-brand-dark text-lg mb-1">{r.title}</h3>
              {r.description && <p className="text-xs text-slate-400 mb-3">{r.description}</p>}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-50">
                <span className="text-sm text-slate-500">มูลค่าคูปอง:</span>
                <span className="font-bold text-emerald-500">
                  {r.reward_type === "amount" && `ส่วนลด ฿${r.value}`}
                  {r.reward_type === "percent" && `ส่วนลด ${r.value}%`}
                  {r.reward_type === "free_service" && `บริการฟรี: ${r.value}`}
                  {r.reward_type === "points" && `แลกแต้ม: ${r.value} แต้ม`}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up">
            <div className="px-6 py-4 border-b border-pink-100 flex justify-between items-center">
              <h3 className="font-bold text-brand-dark">{editingId ? "แก้ไขคูปอง" : "สร้างคูปองใหม่"}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:bg-slate-100 p-1 rounded-md"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="form-label">ชื่อคูปอง / ของรางวัล</label>
                  <input required type="text" className="input-field" placeholder="เช่น ส่วนลดวันเกิด" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="form-label">หมวดหมู่ (เช่น โปรโมชั่น, วันเกิด)</label>
                  <input type="text" className="input-field" placeholder="เช่น Birthday" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="form-label">รายละเอียด (บอกเงื่อนไขถ้ามี)</label>
                <textarea className="input-field" placeholder="เช่น ใช้เป็นส่วนลดสำหรับการทำเล็บเจล..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">ประเภทรางวัล</label>
                  <select
                    className="input-field"
                    value={formData.reward_type}
                    onChange={e => setFormData({...formData, reward_type: e.target.value as Reward["reward_type"]})}
                  >
                    <option value="amount">ลดเป็นจำนวนเงิน (฿)</option>
                    <option value="percent">ลดเป็นเปอร์เซ็นต์ (%)</option>
                    <option value="free_service">บริการฟรี (ระบุชื่อ)</option>
                    <option value="points">แลกแต้มเพิ่ม</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">ใช้ {formData.reward_type === "points" ? "แต้มที่ต้องใช้" : "แต้มแลก"}</label>
                  <input required type="number" min={1} className="input-field text-rose-500 font-bold" value={formData.points_required} onChange={e => setFormData({...formData, points_required: Number(e.target.value)})} />
                </div>
              </div>
              <div>
                <label className="form-label">
                  {formData.reward_type === "amount" && "มูลค่าส่วนลด (บาท)"}
                  {formData.reward_type === "percent" && "เปอร์เซ็นต์ส่วนลด (%)"}
                  {formData.reward_type === "free_service" && "ชื่อบริการที่แถมฟรี"}
                  {formData.reward_type === "points" && "จำนวนแต้มที่จะได้รับ"}
                </label>
                <input
                  required
                  type={formData.reward_type === "free_service" ? "text" : "number"}
                  className={`input-field font-bold ${formData.reward_type === "amount" || formData.reward_type === "points" ? "text-emerald-500" : ""}`}
                  value={formData.value}
                  onChange={e => setFormData({...formData, value: formData.reward_type === "free_service" ? e.target.value : Number(e.target.value)})}
                />
              </div>
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="w-4 h-4 text-rose-500 focus:ring-rose-400 border-gray-300 rounded" />
                <span className="text-sm font-medium text-slate-700">เปิดใช้งานให้ลูกค้าแลกได้</span>
              </label>

              <div className="flex gap-3 pt-4 border-t border-slate-50">
                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost flex-1">ยกเลิก</button>
                <button type="submit" className="btn-primary flex-1 justify-center"><Save size={16} /> บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
