import { Sparkles, Clock, Phone, Camera, MessageCircle, Fingerprint, Tag, Percent, Banknote, Megaphone } from "lucide-react";
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

        {/* Booking CTA */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-400 via-pink-500 to-fuchsia-500 p-6 text-center text-white shadow-lg">
          <div className="relative z-10">
            <h2 className="text-xl font-bold mb-2">จองคิวออนไลน์ได้แล้ว! 💅</h2>
            <p className="text-rose-100 text-sm mb-5">เลือกบริการ เลือกเวลา จองง่ายๆ ไม่ต้องรอ</p>
            <a
              href="/book"
              className="inline-flex items-center gap-2 px-8 py-3 bg-white text-rose-600 text-sm font-bold rounded-2xl shadow-md hover:shadow-xl transition-all active:scale-95"
            >
              <Sparkles size={18} />
              จองคิวเลย
            </a>
          </div>
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        </section>

        {/* Portfolio CTA - New Section */}
        <section id="portfolio" className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-100 to-pink-200 p-6 text-center shadow-sm border border-rose-200">
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
              <Camera size={24} className="text-rose-500" />
            </div>
            <h2 className="text-xl font-bold text-brand-dark mb-2">ดูผลงานล่าสุดของเรา ✨</h2>
            <p className="text-sm text-rose-600/80 mb-5">อัปเดตรูปแบบลายเล็บใหม่ๆ และรีวิวจากลูกค้าได้ที่โซเชียลมีเดีย</p>
            <div className="flex flex-wrap justify-center gap-3">
              {hasIg && (
                <a
                  href={`https://instagram.com/${settings.shop_ig.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-2.5 bg-white text-brand-dark text-sm font-bold rounded-full shadow-sm hover:shadow-md transition-all active:scale-95 border border-rose-100"
                >
                  <Camera size={16} className="text-pink-500" />
                  Instagram
                </a>
              )}
              {/* เพิ่ม TikTok ถ้ามีการระบุใน settings หรือใส่เป็นทางเลือกไว้ */}
              <a
                href="#"
                className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-full shadow-sm hover:bg-slate-800 transition-all active:scale-95"
              >
                <span className="text-lg">🎵</span>
                TikTok
              </a>
            </div>
          </div>
          {/* Decorative Background Elements */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/30 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-rose-300/20 rounded-full blur-2xl"></div>
        </section>

        {/* โปรโมชั่น */}
        {promotions.length > 0 && (
          <section id="promotions">
            <h2 className="text-xl font-bold text-brand-dark mb-1">โปรโมชั่นพิเศษ 🎉</h2>
            <p className="text-sm text-slate-400 mb-4">ข้อเสนอสุดพิเศษจากร้านเรา</p>
            <div className="space-y-3">
              {promotions.map((promo) => (
                <div
                  key={promo.id}
                  className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-400 via-pink-500 to-fuchsia-500 p-px shadow-md"
                >
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm text-brand-dark">{promo.title}</p>
                        {promo.discount_type === "percent" && promo.discount_value > 0 && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-600">
                            ลด {promo.discount_value}%
                          </span>
                        )}
                        {promo.discount_type === "amount" && promo.discount_value > 0 && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600">
                            ลด ฿{promo.discount_value}
                          </span>
                        )}
                      </div>
                      {promo.description && (
                        <p className="text-xs text-slate-500 mt-0.5">{promo.description}</p>
                      )}
                      {promo.valid_to && (
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <Tag size={10} />
                          หมดเขต {new Date(promo.valid_to).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "2-digit" })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* บริการ */}
        <section id="services">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-bold text-brand-dark">บริการของเรา 💅</h2>
            <span className="text-[10px] font-bold text-rose-400 bg-rose-50 px-2 py-0.5 rounded-full uppercase tracking-tighter border border-rose-100">Premium Quality</span>
          </div>
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
                        className="group bg-white rounded-xl px-4 py-3.5 border border-pink-100 hover:border-rose-300 hover:shadow-sm transition-all flex items-center justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-brand-dark group-hover:text-rose-500 transition-colors">{service.name}</p>
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
                        <p className="text-base font-bold gradient-text shrink-0 group-hover:scale-110 transition-transform">
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
          <div className="bg-white rounded-3xl p-6 border border-pink-100 shadow-sm">
            <p className="text-sm font-bold text-brand-dark mb-1">สนใจจองคิว 💅</p>
            <p className="text-[11px] text-slate-400 mb-5">แนะนำจองผ่าน Line เพื่อความรวดเร็วในการเช็คคิว</p>
            <div className="flex flex-wrap justify-center gap-3">
              {hasLine && (
                <a
                  href={`https://line.me/R/ti/p/~${settings.shop_line_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white text-sm font-bold rounded-2xl shadow-md transition-all hover:bg-green-600 active:scale-95"
                >
                  <MessageCircle size={18} />
                  จองผ่าน Line
                </a>
              )}
              {hasFb && (
                <a
                  href={settings.shop_fb.startsWith("http") ? settings.shop_fb : `https://${settings.shop_fb}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white text-sm font-bold rounded-2xl shadow-md transition-all hover:bg-blue-600 active:scale-95"
                >
                  <MessageCircle size={18} />
                  Messenger
                </a>
              )}
              {hasIg && (
                <a
                  href={`https://instagram.com/${settings.shop_ig.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white text-sm font-bold rounded-2xl shadow-md transition-all hover:opacity-90 active:scale-95"
                >
                  <Camera size={18} />
                  Instagram
                </a>
              )}
              {hasPhone && (
                <a
                  href={`tel:${settings.shop_phone}`}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white text-sm font-bold rounded-2xl shadow-md transition-all hover:bg-slate-900 active:scale-95"
                >
                  <Phone size={18} />
                  โทรสอบถาม
                </a>
              )}
            </div>
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
