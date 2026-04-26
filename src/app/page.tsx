import { Sparkles, Clock, Phone, Camera, MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Service, ShopSettings, settingsToMap, DEFAULT_SETTINGS } from "@/lib/types";
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

const CATEGORY_EMOJI: Record<string, string> = {
  "ทำเล็บมือ": "💅",
  "ทำเล็บเท้า": "🦶",
  "ต่อเล็บ": "✨",
  "สปา": "🧖‍♀️",
  "ถอดเล็บ": "🧴",
  "อื่นๆ": "💎",
};

export default async function Home() {
  const [services, settings] = await Promise.all([getServices(), getSettings()]);

  console.log("SERVER FETCHED SETTINGS:", settings); // <--- DEBUG LOG

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
      {/* Mini Header */}
      <header className="bg-white border-b border-pink-100 sticky top-0 z-10">
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
              <a
                href={`https://line.me/R/ti/p/~${settings.shop_line_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white shadow-sm hover:scale-110 transition-transform"
                title="Line"
              >
                <MessageCircle size={14} />
              </a>
            )}
            {hasFb && (
              <a
                href={settings.shop_fb.startsWith("http") ? settings.shop_fb : `https://${settings.shop_fb}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-sm transition-transform hover:scale-110 active:scale-95"
                title="Messenger"
              >
                <MessageCircle size={14} />
              </a>
            )}
            {hasIg && (
              <a
                href={`https://instagram.com/${settings.shop_ig.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 flex items-center justify-center text-white shadow-sm transition-transform hover:scale-110 active:scale-95"
                title="Instagram"
              >
                <Camera size={14} />
              </a>
            )}
            {hasPhone && (
              <a
                href={`tel:${settings.shop_phone}`}
                className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white shadow-sm transition-transform hover:scale-110 active:scale-95"
                title="โทรสอบถาม"
              >
                <Phone size={14} />
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-8 space-y-10">
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
                          <div className="flex items-center gap-1 mt-0.5 text-slate-400 text-xs">
                            <Clock size={11} />
                            <span>{service.duration} นาที</span>
                          </div>
                        </div>
                        <p className="text-base font-bold gradient-text shrink-0">
                          ฿{service.price.toLocaleString()}
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
