import { Sparkles, Clock, Phone, Camera, MessageCircle, Fingerprint, Tag, Percent, Banknote, Megaphone, MapPin } from "lucide-react";
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

  // Check shop open status
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const [openH, openM] = (settings.open_time || "09:00").split(":").map(Number);
  const [closeH, closeM] = (settings.close_time || "20:00").split(":").map(Number);
  const openTime = openH * 60 + openM;
  const closeTime = closeH * 60 + closeM;
  const isOpen = currentTime >= openTime && currentTime < closeTime;

  return (
    <div className="min-h-screen bg-[#FFF5F7]">
      {/* Premium Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-pink-100 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-200">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <p className="text-base font-black text-brand-dark leading-none tracking-tight">{settings.shop_name || "Praewa Nail"}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`w-2 h-2 rounded-full ${isOpen ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {isOpen ? "Open Now" : "Closed"} · {settings.open_time} - {settings.close_time}
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
             {/* Social icons removed for brevity in example, will keep them in full code */}
             {hasLine && (
              <a href={`https://line.me/R/ti/p/~${settings.shop_line_id}`} target="_blank" className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all shadow-sm"><MessageCircle size={16} /></a>
            )}
            {hasPhone && (
              <a href={`tel:${settings.shop_phone}`} className="w-9 h-9 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center hover:bg-slate-800 hover:text-white transition-all shadow-sm"><Phone size={16} /></a>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto pb-20">
        
        {/* Hero Section */}
        <section className="px-5 pt-8 pb-4">
          <div className="relative rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-rose-100 to-pink-200 aspect-[16/10] shadow-2xl shadow-rose-100 border-4 border-white">
            <div className="absolute inset-0 bg-black/5" />
            <div className="absolute inset-0 p-8 flex flex-col justify-end">
              <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 shadow-sm inline-block max-w-[80%] animate-slide-up">
                <h1 className="text-xl font-black text-brand-dark mb-1">สรรค์สร้างความมั่นใจ<br/>ผ่านปลายนิ้ว ✨</h1>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">เริ่มต้นความสวยได้แล้ววันนี้ กับบริการทำเล็บมืออาชีพที่ {settings.shop_name}</p>
              </div>
            </div>
            {/* Floating Badge */}
            <div className="absolute top-6 right-6 bg-white/90 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-1.5 shadow-lg shadow-rose-200/50 border border-white animate-bounce-slow">
              <span className="text-amber-400">⭐</span>
              <span className="text-xs font-bold text-brand-dark">4.9/5.0</span>
            </div>
          </div>
        </section>

        {/* Google Maps Card */}
        <section className="px-5 py-6">
          <div className="bg-white rounded-3xl p-4 shadow-xl shadow-pink-100 border border-pink-50">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                <MapPin size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-brand-dark">พิกัดสตูดิโอ 📍</h3>
                <p className="text-xs text-slate-400 truncate font-medium">เดินทางง่าย ใกล้คุณ แวะมาหาเรานะคะ</p>
              </div>
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.shop_name || "Praewa Nail Studio")}`}
                target="_blank"
                className="btn-primary py-2 px-4 rounded-xl text-xs"
              >
                นำทาง
              </a>
            </div>
            <div className="rounded-2xl overflow-hidden h-40 bg-slate-100 relative">
              {/* Mock Map Placeholder - In real use, an iframe or Google Maps Static API would go here */}
              <div className="absolute inset-0 flex items-center justify-center bg-blue-50">
                <div className="text-center">
                  <MapPin className="mx-auto text-rose-400 mb-2 animate-bounce" />
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Google Maps View</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Promotions */}
        {promotions.length > 0 && (
          <section className="px-5 py-4 overflow-x-auto">
            <div className="flex gap-4 pb-2">
              {promotions.map((promo) => (
                <div key={promo.id} className="min-w-[280px] bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden shrink-0">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-8 -mt-8" />
                  <div className="relative z-10">
                    <span className="px-2.5 py-1 bg-white/20 rounded-lg text-[10px] font-bold uppercase tracking-widest mb-3 inline-block border border-white/20">Hot Promo</span>
                    <h4 className="font-bold text-base mb-1">{promo.title}</h4>
                    <p className="text-xs text-slate-400 line-clamp-2 font-medium mb-3">{promo.description}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xl font-black text-rose-400">
                        {promo.discount_type === "percent" ? `ลด ${promo.discount_value}%` : `ลด ฿${promo.discount_value}`}
                      </p>
                      <span className="text-[10px] text-slate-500 font-bold tracking-tighter uppercase">Valid to {new Date(promo.valid_to || "").toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Services & Calendar... (Rest of content) */}

        {/* บริการ */}
        <section id="services">
          <h2 className="text-xl font-bold text-brand-dark mb-1">บริการของเรา 💅</h2>
          <p className="text-sm text-slate-400 mb-5">ราคาเริ่มต้น · ครอบคลุมทุกความต้องการ</p>

          {Object.keys(servicesByCategory).length === 0 ? (
            <div className="text-center text-slate-400 py-8 bg-white rounded-2xl border border-pink-100">
              <Sparkles size={28} className="mx-auto mb-2 text-pink-200" />
              <p className="text-sm">กำลังอัพเดตรายการบริการ</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(servicesByCategory).map(([category, categoryServices]) => (
                <div key={category}>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                    <span>{CATEGORY_EMOJI[category] || "💎"}</span>
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {categoryServices.map((service) => (
                      <div
                        key={service.id}
                        className="bg-white rounded-xl px-4 py-3.5 border border-pink-100 hover:border-rose-200 transition-all flex items-center justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-brand-dark">{service.name}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-slate-400 text-xs">
                            <span className="flex items-center gap-0.5">
                              <Clock size={11} />
                              {service.duration} นาที
                            </span>
                            {service.price_per_finger != null && (
                              <span className="flex items-center gap-0.5 text-violet-400">
                                <Fingerprint size={11} /> ต่อ{service.unit_name || "นิ้ว"}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-base font-bold gradient-text shrink-0">
                          {service.price_per_finger != null
                            ? `฿${service.price_per_finger.toLocaleString()}/${service.unit_name || "หน่วย"}`
                            : `฿${service.price.toLocaleString()}`
                          }
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ปฏิทิน */}
        <section id="calendar">
          <h2 className="text-xl font-bold text-brand-dark mb-1">ดูคิวว่าง 📅</h2>
          <p className="text-sm text-slate-400 mb-5">กดที่วันเพื่อดูจำนวนคิวว่าง</p>
          <CustomerCalendar />
        </section>

        {/* Contact CTA */}
        <section className="text-center py-6">
          <p className="text-sm font-bold text-brand-dark mb-4">สนใจจองคิว 💅</p>
          <div className="flex flex-wrap justify-center gap-3">
            {hasLine && (
              <a
                href={`https://line.me/R/ti/p/~${settings.shop_line_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-5 py-2.5 bg-green-500 text-white text-sm font-semibold rounded-xl shadow-md transition-all hover:bg-green-600 active:scale-95"
              >
                <MessageCircle size={16} />
                Line
              </a>
            )}
            {hasFb && (
              <a
                href={settings.shop_fb.startsWith("http") ? settings.shop_fb : `https://${settings.shop_fb}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-md transition-all hover:bg-blue-600 active:scale-95"
              >
                <MessageCircle size={16} />
                Messenger
              </a>
            )}
            {hasIg && (
              <a
                href={`https://instagram.com/${settings.shop_ig.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white text-sm font-semibold rounded-xl shadow-md transition-all hover:opacity-90 active:scale-95"
              >
                <Camera size={16} />
                Instagram
              </a>
            )}
            {hasPhone && (
              <a
                href={`tel:${settings.shop_phone}`}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-md transition-all hover:bg-slate-900 active:scale-95"
              >
                <Phone size={16} />
                โทรสอบถาม
              </a>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-slate-300 text-xs border-t border-pink-100">
        © 2025 {settings.shop_name || "Praewa Nail Studio"}
      </footer>
    </div>
  );
}
