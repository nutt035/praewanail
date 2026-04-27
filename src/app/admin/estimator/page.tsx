"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { EstimationHistory, DEFAULT_SETTINGS } from "@/lib/types";
import { 
  UploadCloud, Settings2, Trash2, Loader2, Sparkles, Image as ImageIcon,
  History, DollarSign, Calendar, Info, CheckCircle2
} from "lucide-react";
import toast from "react-hot-toast";
import imageCompression from "browser-image-compression";

export default function EstimatorPage() {
  const [history, setHistory] = useState<EstimationHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  
  const [pricingRules, setPricingRules] = useState(DEFAULT_SETTINGS.ai_pricing_rules);
  const [showSettings, setShowSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchHistory();
    fetchSettings();
  }, []);

  async function fetchHistory() {
    setLoadingHistory(true);
    const { data } = await supabase
      .from("estimation_history")
      .select("*")
      .order("created_at", { ascending: false });
    setHistory((data as EstimationHistory[]) || []);
    setLoadingHistory(false);
  }

  async function fetchSettings() {
    const { data } = await supabase
      .from("shop_settings")
      .select("value")
      .eq("key", "ai_pricing_rules")
      .single();
    
    if (data?.value) {
      setPricingRules(data.value);
    }
  }

  async function saveSettings() {
    setSavingSettings(true);
    const { error } = await supabase
      .from("shop_settings")
      .upsert({ key: "ai_pricing_rules", value: pricingRules }, { onConflict: 'key' });
    
    setSavingSettings(false);
    if (error) {
      toast.error("บันทึกการตั้งค่าไม่สำเร็จ");
    } else {
      toast.success("บันทึกโครงสร้างราคาเรียบร้อย");
      setShowSettings(false);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset preview and input
    setPreviewImage(URL.createObjectURL(file));
    setIsProcessing(true);

    try {
      // 1. Client-side compression (< 500KB)
      toast.loading("กำลังบีบอัดรูปภาพ...", { id: "estimating" });
      const compressionOptions = {
        maxSizeMB: 0.5, // 500KB
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      };
      
      const compressedFile = await imageCompression(file, compressionOptions);
      console.log(`Original size: ${file.size / 1024 / 1024} MB, Compressed size: ${compressedFile.size / 1024 / 1024} MB`);

      // 2. Upload to Supabase Storage
      toast.loading("กำลังอัปโหลดรูปภาพ...", { id: "estimating" });
      const fileExt = compressedFile.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('estimations')
        .upload(filePath, compressedFile);

      if (uploadError) throw new Error("อัปโหลดรูปลง Storage ไม่สำเร็จ");

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('estimations')
        .getPublicUrl(filePath);
      
      const publicUrl = publicUrlData.publicUrl;

      // 3. Call AI API
      toast.loading("กำลังให้ AI วิเคราะห์ราคา...", { id: "estimating" });
      const response = await fetch('/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: publicUrl }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "เกิดข้อผิดพลาดในการเรียก AI");
      }

      const aiResult = await response.json();

      // 4. Save to Database
      toast.loading("กำลังบันทึกข้อมูล...", { id: "estimating" });
      const newRecord = {
        image_url: publicUrl,
        storage_path: filePath,
        base_price: aiResult.base_price || 0,
        add_ons: aiResult.add_ons || [],
        estimated_total_price: aiResult.estimated_total_price || 0,
        complexity: aiResult.complexity || "Unknown",
        note: aiResult.note || "",
      };

      const { data: insertedData, error: dbError } = await supabase
        .from("estimation_history")
        .insert([newRecord])
        .select()
        .single();

      if (dbError) throw new Error("บันทึกลงฐานข้อมูลไม่สำเร็จ");

      // Success
      setHistory(prev => [insertedData as EstimationHistory, ...prev]);
      toast.success("ประเมินราคาสำเร็จ! 🎉", { id: "estimating" });

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "เกิดข้อผิดพลาด", { id: "estimating" });
    } finally {
      setIsProcessing(false);
      setPreviewImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDelete(item: EstimationHistory) {
    toast.loading("กำลังลบข้อมูล...", { id: "deleting" });
    
    // 1. Delete from Storage
    const { error: storageError } = await supabase.storage
      .from('estimations')
      .remove([item.storage_path]);

    if (storageError) {
      console.error("Storage delete error:", storageError);
      // We continue to delete from DB even if storage fails 
      // (might have been deleted manually before)
    }

    // 2. Delete from Database
    const { error: dbError } = await supabase
      .from("estimation_history")
      .delete()
      .eq("id", item.id);

    if (dbError) {
      toast.error("ลบข้อมูลในฐานข้อมูลไม่สำเร็จ", { id: "deleting" });
      return;
    }

    setHistory(prev => prev.filter(h => h.id !== item.id));
    toast.success("ลบข้อมูลการประเมินราคาเรียบร้อย", { id: "deleting" });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title flex items-center gap-2">
            AI ประเมินราคาลายเล็บ <Sparkles size={20} className="text-rose-500" />
          </h2>
          <p className="page-subtitle">อัปโหลดลายเล็บให้ AI ช่วยคิดราคาก่อนแจ้งลูกค้า</p>
        </div>
        <button 
          onClick={() => setShowSettings(!showSettings)} 
          className="btn-ghost flex items-center gap-2"
        >
          <Settings2 size={16} /> 
          ตั้งค่าราคา AI
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="card p-6 bg-rose-50/50 border-rose-100 animate-slide-down">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-bold text-brand-dark">โครงสร้างราคาสำหรับ AI (Prompt)</h3>
              <p className="text-xs text-slate-500 mt-0.5">ระบุราคากลาง เพื่อให้ AI นำไปคำนวณได้อย่างแม่นยำ</p>
            </div>
          </div>
          <textarea
            className="input-field font-mono text-sm resize-y"
            rows={6}
            value={pricingRules}
            onChange={(e) => setPricingRules(e.target.value)}
          />
          <div className="flex justify-end mt-4">
            <button
              onClick={saveSettings}
              disabled={savingSettings}
              className="btn-primary"
            >
              {savingSettings ? <Loader2 size={16} className="animate-spin" /> : "บันทึกการตั้งค่า"}
            </button>
          </div>
        </div>
      )}

      {/* Uploader Section */}
      <div className="card p-8 border-dashed border-2 border-pink-200 bg-pink-50/30 flex flex-col items-center justify-center text-center transition-all hover:bg-pink-50/60 mt-4 rounded-2xl relative overflow-hidden">
        {isProcessing && (
           <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
              <Loader2 size={36} className="animate-spin text-rose-500 mb-3" />
              <p className="font-semibold text-brand-dark">กำลังให้ AI วิเคราะห์รูปภาพ...</p>
              <p className="text-xs text-slate-400 mt-1">ใช้เวลาประมาณ 5 - 10 วินาที</p>
           </div>
        )}

        <input 
          type="file" 
          accept="image/jpeg, image/png, image/webp" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileSelect}
        />

        {previewImage ? (
           <div className="relative">
              <img src={previewImage} alt="Preview" className="w-48 h-48 object-cover rounded-xl shadow-md border-4 border-white mb-4" />
           </div>
        ) : (
          <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center text-pink-500 mb-4">
            <UploadCloud size={30} />
          </div>
        )}
        
        <h3 className="font-bold text-brand-dark text-lg mb-1">อัปโหลดลายเล็บ</h3>
        <p className="text-sm text-slate-400 mb-5 max-w-sm">
          รองรับไฟล์ JPG, PNG ระบบจะบีบอัดภาพให้อัตโนมัติก่อนส่งไปให้ AI
        </p>
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="btn-primary shadow-lg shadow-rose-200"
        >
          <ImageIcon size={18} /> เลือกรูปภาพ
        </button>
      </div>

      {/* History List */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <History size={18} className="text-brand-dark" />
          <h3 className="font-bold text-brand-dark">ประวัติการประเมินราคา</h3>
        </div>

        {loadingHistory ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="card p-5 animate-pulse flex gap-5">
                <div className="w-32 h-32 bg-slate-100 rounded-xl shrink-0" />
                <div className="flex-1 space-y-3 py-2">
                  <div className="h-4 bg-slate-100 rounded w-1/3" />
                  <div className="h-10 bg-slate-50 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="card p-12 text-center text-slate-400 border-dashed">
            <ImageIcon size={32} className="mx-auto mb-3 text-slate-200" />
            <p className="text-sm">ยังไม่มีประวัติการประเมินราคา</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((record) => (
              <div key={record.id} className="card p-5 hover:border-pink-200 transition-colors flex flex-col md:flex-row gap-5">
                {/* Image */}
                <div className="w-full md:w-40 h-40 shrink-0">
                  <img 
                    src={record.image_url} 
                    alt="Nail Art" 
                    className="w-full h-full object-cover rounded-xl border border-pink-100"
                  />
                  <p className="text-[10px] text-slate-400 text-center mt-2 flex items-center justify-center gap-1">
                    <Calendar size={10} /> 
                    {new Date(record.created_at).toLocaleString("th-TH")}
                  </p>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-lg text-emerald-600 flex items-center gap-1.5">
                        <DollarSign size={18} />
                        ราคาประเมิน: ฿{record.estimated_total_price.toLocaleString()}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium border border-slate-200">
                          ความยาก: {record.complexity}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDelete(record)}
                      className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors"
                      title="ลบข้อมูล"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-slate-600 font-medium">ทาสีเจลพื้นฐาน</span>
                      <span className="text-brand-dark">฿{record.base_price}</span>
                    </div>
                    
                    {record.add_ons && record.add_ons.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-200">
                        <p className="text-xs text-slate-400 mb-2">ท็อปปิ้ง / อะไหล่เพิ่มเติม:</p>
                        {record.add_ons.map((addon, idx) => (
                          <div key={idx} className="flex justify-between text-sm items-center pl-2 border-l-2 border-rose-200">
                            <span className="text-slate-600">{addon.item}</span>
                            <span className="text-brand-dark">+฿{addon.cost}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {record.note && (
                    <div className="mt-3 flex items-start gap-1.5 text-xs text-amber-600 bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                      <Info size={14} className="shrink-0 mt-0.5" />
                      <p>{record.note}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
