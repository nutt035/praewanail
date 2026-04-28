import { Sparkles, Clock, Phone, Camera, MessageCircle, Fingerprint, Tag, Percent, Banknote, Megaphone, MapPin, CalendarDays, Scissors } from "lucide-react";
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
    <div className="min-h-screen bg-[#FFF5F7]">
      {/* Simple Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-pink-100 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-md">
              <Sparkles size={16} className="text-white" />
            </div>
            <p className="text-base font-bold text-brand-dark tracking-tight">{settings.shop_name || "Praewa Nail"}</p>
          </div>
          <div className="flex gap-2">
            {hasLine && (
              <a href={`https://line.me/R/ti/p/~${settings.shop_line_id}`} target="_blank" className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100"><MessageCircle size={15} /></a>
            )}
            {hasPhone && (
              <a href={`tel:${settings.shop_phone}`} className="w-8 h-8 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center border border-slate-100"><Phone size={15} /></a>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-6 space-y-10">
        
        {/* 1. โปรโมชั่น (Top Priority) */}
        {promotions.length > 0 && (
          <section id="promotions">
            <div className="flex items-center gap-2 mb-4">
              <Tag size={18} className="text-rose-400" />
              <h2 className="text-lg font-bold text-brand-dark">โปรโมชั่นพิเศษ 🎉</h2>
            </div>
            <div className="space-y-3">
              {promotions.map((promo) => (
                <div key={promo.id} className="bg-gradient-to-br from-rose-400 to-pink-500 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -mr-6 -mt-6" />
                   <h4 className="font-bold text-base mb-1">{promo.title}</h4>
                   <p className="text-xs text-white/80 line-clamp-2 mb-2">{promo.description}</p>
                   <p className="text-lg font-black">
                     {promo.discount_type === "percent" ? `ลด ${promo.discount_value}%` : `ลด ฿${promo.discount_value}`}
                   </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 2. ดูคิวว่าง (Calendar) */}
        <section id="calendar">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays size={18} className="text-rose-400" />
            <h2 className="text-lg font-bold text-brand-dark">เช็กคิวว่าง 📅</h2>
          </div>
          <CustomerCalendar />
        </section>

        {/* 3. บริการ (Services) */}
        <section id="services">
          <div className="flex items-center gap-2 mb-4">
            <Scissors size={18} className="text-rose-400" />
            <h2 className="text-lg font-bold text-brand-dark">บริการของเรา 💅</h2>
          </div>
          {Object.entries(servicesByCategory).map(([category, categoryServices]) => (
            <div key={category} className="mb-6 last:mb-0">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">{category}</h3>
              <div className="space-y-2">
                {categoryServices.map((service) => (
                  <div key={service.id} className="bg-white rounded-xl px-4 py-3 border border-pink-50 flex items-center justify-between gap-3 shadow-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-brand-dark truncate">{service.name}</p>
                      <p className="text-[10px] text-slate-400">{service.duration} นาที</p>
                    </div>
                    <p className="text-sm font-bold text-rose-500 shrink-0">
                      ฿{service.price_per_finger != null ? service.price_per_finger : service.price}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Contact CTA */}
        <section className="bg-white rounded-3xl p-6 text-center border border-pink-100 shadow-sm">
          <p className="text-sm font-bold text-brand-dark mb-4">สนใจจองคิว ทักหาเราได้เลยค่ะ ✨</p>
          <div className="flex flex-wrap justify-center gap-3">
            {hasLine && (
              <a href={`https://line.me/R/ti/p/~${settings.shop_line_id}`} target="_blank" className="flex items-center gap-2 px-6 py-2.5 bg-green-500 text-white text-sm font-bold rounded-xl shadow-md active:scale-95 transition-transform">
                <MessageCircle size={16} /> Line
              </a>
            )}
            {hasPhone && (
              <a href={`tel:${settings.shop_phone}`} className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-white text-sm font-bold rounded-xl shadow-md active:scale-95 transition-transform">
                <Phone size={16} /> โทร
              </a>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-slate-300 text-[10px] tracking-widest uppercase">
        © 2025 {settings.shop_name || "Praewa Nail Studio"}
      </footer>
    </div>
  );
}
