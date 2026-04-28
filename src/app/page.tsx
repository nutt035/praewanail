import { Sparkles, Clock, Phone, Camera, MessageCircle, Fingerprint, Tag, Percent, Banknote, Megaphone, CalendarDays, Scissors } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Service, ShopSettings, Promotion, settingsToMap, DEFAULT_SETTINGS } from "@/lib/types";
import CustomerCalendar from "@/components/CustomerCalendar";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ดึงข้อมูล services จาก Supabase (Server Component)
async function getServices(): Promise<Service[]> {
  const { data } = await supabase
    .from("services")
    .select("*")
    .order("category", { ascending: true })
    .order("price", { ascending: true });
  return (data as Service[]) || [];
}

// ดึง shop settings
async function getSettings(): Promise<Record<string, string>> {
  const { data } = await supabase.from("shop_settings").select("*");
  if (data && data.length > 0) return { ...DEFAULT_SETTINGS, ...settingsToMap(data as ShopSettings[]) };
  return DEFAULT_SETTINGS;
}

// ดึงโปรโมชั่นที่ active อยู่
async function getActivePromotions(): Promise<Promotion[]> {
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("promotions")
    .select("*")
    .eq("is_active", true)
    .or(`valid_from.is.null,valid_from.lte.${today}`)
    .or(`valid_to.is.null,valid_to.gte.${today}`)
    .order("created_at", { ascending: false });
  return (data as Promotion[]) || [];
}

const CATEGORY_EMOJI: Record<string, string> = {
  "ทำเล็บมือ": "💅",
  "ทำเล็บเท้า": "🦶",
  "ต่อเล็บ": "✨",
  "สปา": "🧖‍♀️",
  "ถอดเล็บ": "🧴",
  "อื่นๆ": "💎",
};

export default async function Home() {
  const [services, settings, promotions] = await Promise.all([
    getServices(),
    getSettings(),
    getActivePromotions(),
  ]);

  // จัดกลุ่มบริการตาม category
  const servicesByCategory: Record<string, Service[]> = {};
  services.forEach((s) => {
    const cat = s.category || "อื่นๆ";
    if (!servicesByCategory[cat]) servicesByCategory[cat] = [];
    servicesByCategory[cat].push(s);
  });

  const hasLine = settings.shop_line_id && settings.shop_line_id.trim() !== "";
  const hasFb = settings.shop_fb && settings.shop_fb.trim() !== "";
  const hasIg = settings.shop_ig && settings.shop_ig.trim() !== "";
  const hasPhone = settings.shop_phone && settings.shop_phone.trim() !== "";

  return (
    <div className="min-h-screen bg-[#FDF2F8]">
      {/* Header สไตล์เดิม */}
      <header className="bg-white border-b border-pink-100 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-sm">
              <Sparkles size={15} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-brand-dark leading-none">{settings.shop_name || "Praewa Nail"}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                เปิด {settings.open_time} – {settings.close_time} น.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {hasLine && (
              <a href={`https://line.me/R/ti/p/~${settings.shop_line_id}`} target="_blank" className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white shadow-sm hover:scale-110 transition-transform">
                <MessageCircle size={14} />
              </a>
            )}
            {hasFb && (
              <a href={settings.shop_fb.startsWith("http") ? settings.shop_fb : `https://${settings.shop_fb}`} target="_blank" className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-sm transition-transform hover:scale-110">
                <MessageCircle size={14} />
              </a>
            )}
            {hasIg && (
              <a href={`https://instagram.com/${settings.shop_ig.replace("@", "")}`} target="_blank" className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 flex items-center justify-center text-white shadow-sm transition-transform hover:scale-110">
                <Camera size={14} />
              </a>
            )}
            {hasPhone && (
              <a href={`tel:${settings.shop_phone}`} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white shadow-sm transition-transform hover:scale-110">
                <Phone size={14} />
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-8 space-y-12">

        {/* 1. โปรโมชั่น (เอาขึ้นก่อนตามคำขอ) */}
        {promotions.length > 0 && (
          <section id="promotions">
            <h2 className="text-xl font-bold text-brand-dark mb-1">โปรโมชั่นพิเศษ 🎉</h2>
            <p className="text-sm text-slate-400 mb-4">ข้อเสนอสุดพิเศษสำหรับคุณ</p>
            <div className="space-y-3">
              {promotions.map((promo) => (
                <div key={promo.id} className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-400 via-pink-500 to-fuchsia-500 p-px shadow-md">
                  <div className="bg-white rounded-[15px] px-4 py-3.5 flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      promo.discount_type === "percent" ? "bg-violet-50" :
                      promo.discount_type === "amount" ? "bg-emerald-50" : "bg-rose-50"
                    }`}>
                      {promo.discount_type === "percent" && <Percent size={16} className="text-violet-500" />}
                      {promo.discount_type === "amount" && <Banknote size={16} className="text-emerald-500" />}
                      {promo.discount_type === "announcement" && <Megaphone size={16} className="text-rose-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-brand-dark">{promo.title}</p>
                      {promo.description && <p className="text-xs text-slate-500 mt-0.5">{promo.description}</p>}
                      <div className="mt-2 flex items-center justify-between">
                         <span className="text-sm font-black text-rose-500">
                           {promo.discount_type === "percent" ? `ลด ${promo.discount_value}%` : `ลด ฿${promo.discount_value}`}
                         </span>
                         {promo.valid_to && <span className="text-[10px] text-slate-300">ถึง {new Date(promo.valid_to).toLocaleDateString("th-TH")}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 2. เช็กคิวว่าง (ปฏิทิน) */}
        <section id="calendar">
          <h2 className="text-xl font-bold text-brand-dark mb-1">จองคิวว่าง 📅</h2>
          <p className="text-sm text-slate-400 mb-5">เลือกวันที่คุณสะดวกเพื่อดูคิวที่ยังว่างอยู่</p>
          <CustomerCalendar />
        </section>

        {/* 3. บริการ (เอาไว้ล่างสุด) */}
        <section id="services">
          <h2 className="text-xl font-bold text-brand-dark mb-1">บริการของเรา 💅</h2>
          <p className="text-sm text-slate-400 mb-6">ราคาเริ่มต้น ครอบคลุมทุกความต้องการ</p>

          <div className="space-y-8">
            {Object.entries(servicesByCategory).map(([category, categoryServices]) => (
              <div key={category}>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <span>{CATEGORY_EMOJI[category] || "💎"}</span>
                  {category}
                </h3>
                <div className="space-y-2">
                  {categoryServices.map((service) => (
                    <div key={service.id} className="bg-white rounded-xl px-4 py-3.5 border border-pink-100 flex items-center justify-between gap-3 shadow-sm">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-brand-dark">{service.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-slate-400 text-[10px]">
                          <span className="flex items-center gap-0.5"><Clock size={10} /> {service.duration} นาที</span>
                        </div>
                      </div>
                      <p className="text-base font-bold text-rose-500 shrink-0">
                        ฿{service.price_per_finger != null ? service.price_per_finger.toLocaleString() : service.price.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer สไตล์เดิม */}
        <section className="text-center py-6">
          <p className="text-sm font-bold text-brand-dark mb-4">สนใจจองคิว ทักหาเราได้เลยค่ะ ✨</p>
          <div className="flex flex-wrap justify-center gap-3">
            {hasLine && (
              <a href={`https://line.me/R/ti/p/~${settings.shop_line_id}`} target="_blank" className="flex items-center gap-2 px-6 py-2.5 bg-green-500 text-white text-sm font-bold rounded-xl shadow-md transition-all active:scale-95">
                <MessageCircle size={16} /> Line
              </a>
            )}
            {hasPhone && (
              <a href={`tel:${settings.shop_phone}`} className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-white text-sm font-bold rounded-xl shadow-md transition-all active:scale-95">
                <Phone size={16} /> โทรสอบถาม
              </a>
            )}
          </div>
        </section>
      </main>

      <footer className="text-center py-10 text-slate-300 text-[10px] tracking-widest uppercase">
        © 2025 {settings.shop_name || "Praewa Nail Studio"}
      </footer>
    </div>
  );
}
