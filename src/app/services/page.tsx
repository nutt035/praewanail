import { Sparkles, Clock, Fingerprint, Tag, Percent, Banknote, Megaphone, ChevronLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Service, Promotion } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getServices(): Promise<Service[]> {
  const { data } = await supabase
    .from("services")
    .select("*")
    .order("category", { ascending: true })
    .order("price", { ascending: true });
  return (data as Service[]) || [];
}

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

export default async function ServicesPage() {
  const [services, promotions] = await Promise.all([
    getServices(),
    getActivePromotions(),
  ]);

  const servicesByCategory: Record<string, Service[]> = {};
  services.forEach((s) => {
    const cat = s.category || "อื่นๆ";
    if (!servicesByCategory[cat]) servicesByCategory[cat] = [];
    servicesByCategory[cat].push(s);
  });

  return (
    <div className="min-h-screen bg-[#FDF2F8]">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-pink-100 sticky top-0 z-50 isolate">
        <div className="max-w-xl mx-auto px-5 py-4 flex items-center gap-3">
          <Link href="/" className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center text-rose-400 hover:bg-pink-100 transition-colors">
            <ChevronLeft size={18} />
          </Link>
          <div className="flex-1">
            <p className="text-sm font-bold text-brand-dark">บริการและราคา</p>
            <p className="text-[10px] text-slate-400">Services & Pricing</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-sm">
            <Sparkles size={15} className="text-white" />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-8 space-y-10 pb-32">
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
                      promo.promotion_type === "discount" ? "bg-violet-50" :
                      promo.promotion_type === "buffet" || promo.promotion_type === "bundle" ? "bg-emerald-50" : "bg-rose-50"
                    }`}>
                      {promo.promotion_type === "discount" && <Percent size={16} className="text-violet-500" />}
                      {promo.promotion_type === "buffet" || promo.promotion_type === "bundle" && <Banknote size={16} className="text-emerald-500" />}
                      {promo.promotion_type !== "discount" && promo.promotion_type !== "buffet" && promo.promotion_type !== "bundle" && <Megaphone size={16} className="text-rose-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm text-brand-dark">{promo.title}</p>
                        {promo.promotion_type === "discount" && promo.price > 0 && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-600">
                            ลด {promo.price}%
                          </span>
                        )}
                        {promo.promotion_type === "buffet" || promo.promotion_type === "bundle" && promo.price > 0 && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600">
                            ราคา ฿{promo.price}
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
                        <p className="text-base font-bold text-rose-500 shrink-0 group-hover:scale-110 transition-transform">
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
      </main>
      
      {/* Fixed bottom booking button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-pink-100 z-40">
        <div className="max-w-2xl mx-auto">
          <Link href="/book" className="w-full flex justify-center items-center gap-2 py-3.5 bg-brand-dark text-white rounded-2xl font-bold shadow-md hover:bg-slate-800 transition-colors">
            <Sparkles size={18} />
            จองคิวตอนนี้
          </Link>
        </div>
      </div>
    </div>
  );
}
