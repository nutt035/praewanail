import { Sparkles, MapPin, Camera, Star, BookOpen, CalendarHeart, Award, Search, HelpCircle, ChevronRight, Tag, Percent, Banknote, Megaphone } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ShopSettings, Promotion, settingsToMap, DEFAULT_SETTINGS, Review } from "@/lib/types";
import Link from "next/link";
import CustomerCalendar from "@/components/CustomerCalendar";
import GallerySection from "@/components/GallerySection";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getSettings(): Promise<Record<string, string>> {
  const { data } = await supabase.from("shop_settings").select("*");
  if (data && data.length > 0) return { ...DEFAULT_SETTINGS, ...settingsToMap(data as ShopSettings[]) };
  return DEFAULT_SETTINGS;
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

async function getReviews(): Promise<Review[]> {
  const { data } = await supabase
    .from("reviews")
    .select("*, customers(name)")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(5);
  return (data as Review[]) || [];
}

export default async function Home() {
  const [settings, promotions, reviews] = await Promise.all([
    getSettings(),
    getActivePromotions(),
    getReviews()
  ]);

  const isSameTime = settings.weekday_open_time === settings.weekend_open_time && settings.weekday_close_time === settings.weekend_close_time;

  return (
    <div className="min-h-screen bg-pink-50/40 pb-20 font-sans selection:bg-pink-200">

      {/* 1. Hero Section - ปรับให้หรูหรา น่าดึงดูด */}
      <div className="relative pt-16 pb-12 px-6 overflow-hidden bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-b-[40px] border-b border-pink-100">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-pink-200/50 to-rose-200/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-purple-200/50 to-pink-200/50 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/3"></div>

        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Logo / Icon Placeholder */}
          <div className="w-30 h-30 rounded-[2rem] bg-gradient-to-tr from-rose-400 via-pink-500 to-fuchsia-500 p-[2px] shadow-xl shadow-pink-200/60 mb-6 group cursor-pointer transition-transform hover:scale-105">
            <div className="w-full h-full bg-white rounded-[1.9rem] flex items-center justify-center overflow-hidden">
              {/* 💡 แอดมินสามารถนำรูปโลโก้มาใส่ในโฟลเดอร์ public/ โค้ดด้านล่างนี้ได้เลย */}
              <img src="/logo.png" alt="Shop Logo" className="w-full h-full object-cover" />
              <Sparkles size={40} className="text-pink-500 group-hover:animate-pulse" />
            </div>
          </div>

          <h1 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">
            {settings.shop_name || "Antonette Nail"}
          </h1>
          <p className="text-pink-600/80 font-medium text-sm max-w-xs mb-1">
            Nail Studio
          </p>
          <div className="inline-flex items-start gap-1.5 px-3 py-2 bg-green-50 text-green-600 rounded-2xl text-[10px] font-bold border border-green-100 text-left">
            <span className="relative flex h-2 w-2 mt-1 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <div className="flex flex-col">
              {isSameTime ? (
                <span>เปิดบริการ {settings.weekday_open_time || settings.open_time} – {settings.weekday_close_time || settings.close_time} น.</span>
              ) : (
                <>
                  <span>จ-ศ {settings.weekday_open_time || settings.open_time} – {settings.weekday_close_time || settings.close_time} น.</span>
                  <span>ส-อา {settings.weekend_open_time || settings.open_time} – {settings.weekend_close_time || settings.close_time} น.</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-md mx-auto px-5 py-8 space-y-10">

        {/* 2. Promotions (เอามาไว้หน้าแรกตามรีเควสต์) */}
        {promotions.length > 0 && (
          <section>
            <div className="flex items-end justify-between mb-4">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900">โปรโมชั่นพิเศษ ✨</h2>
                <p className="text-xs text-gray-500 mt-0.5">ข้อเสนอสุดคุ้มที่คุณไม่ควรพลาด</p>
              </div>
            </div>

            {/* Horizontal Scroll for Promotions */}
            <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory hide-scrollbar -mx-5 px-5">
              {promotions.map((promo) => (
                <div key={promo.id} className="snap-center shrink-0 w-[280px] bg-gradient-to-br from-rose-400 via-pink-500 to-fuchsia-500 rounded-3xl p-[2px] shadow-lg shadow-pink-200/50">
                  <div className="bg-white/95 backdrop-blur-sm rounded-[22px] h-full p-4 flex flex-col">
                    <div className="flex items-start gap-3 mb-2">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${promo.promotion_type === "discount" ? "bg-violet-100" :
                        promo.promotion_type === "buffet" || promo.promotion_type === "bundle" ? "bg-emerald-100" : "bg-rose-100"
                        }`}>
                        {promo.promotion_type === "discount" && <Percent size={20} className="text-violet-600" />}
                        {promo.promotion_type === "buffet" || promo.promotion_type === "bundle" && <Banknote size={20} className="text-emerald-600" />}
                        {promo.promotion_type !== "discount" && promo.promotion_type !== "buffet" && promo.promotion_type !== "bundle" && <Megaphone size={20} className="text-rose-600" />}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 line-clamp-1">{promo.title}</h3>
                        {promo.promotion_type === "discount" && promo.price > 0 && (
                          <span className="inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">ลด {promo.price}%</span>
                        )}
                        {promo.promotion_type === "buffet" || promo.promotion_type === "bundle" && promo.price > 0 && (
                          <span className="inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">ราคา ฿{promo.price}</span>
                        )}
                      </div>
                    </div>
                    {promo.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{promo.description}</p>}
                    <div className="mt-auto pt-3 border-t border-gray-100/50 flex items-center justify-between text-[10px] font-semibold text-gray-400">
                      <span>{promo.valid_to ? `หมดเขต ${new Date(promo.valid_to).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}` : "ไม่มีวันหมดอายุ"}</span>
                      <Link href="/book" className="text-pink-500">จองเลย</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 3. Main Menu Grid - ปรับดีไซน์ให้ดู Premium ขึ้น */}
        <section>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/book" className="group relative overflow-hidden bg-white p-5 rounded-[2rem] shadow-sm hover:shadow-xl transition-all active:scale-95 border border-pink-50 flex flex-col items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-pink-200 group-hover:scale-110 transition-transform">
                <CalendarHeart size={28} />
              </div>
              <div className="w-full">
                <h3 className="font-bold text-gray-900 text-lg flex justify-between items-center w-full">จองคิว <ChevronRight size={16} className="text-pink-300 group-hover:translate-x-1 transition-transform" /></h3>
                <p className="text-[11px] text-gray-500 mt-0.5">เลือกเวลา & วันที่ต้องการ</p>
              </div>
            </Link>

            <Link href="/services" className="group relative overflow-hidden bg-white p-5 rounded-[2rem] shadow-sm hover:shadow-xl transition-all active:scale-95 border border-pink-50 flex flex-col items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 group-hover:bg-rose-100 group-hover:scale-110 transition-all">
                <BookOpen size={28} />
              </div>
              <div className="w-full">
                <h3 className="font-bold text-gray-900 text-lg flex justify-between items-center w-full">เมนู <ChevronRight size={16} className="text-rose-300 group-hover:translate-x-1 transition-transform" /></h3>
                <p className="text-[11px] text-gray-500 mt-0.5">ดูรายการ & ราคา</p>
              </div>
            </Link>

            <Link href="/member" className="group relative overflow-hidden bg-white p-5 rounded-[2rem] shadow-sm hover:shadow-xl transition-all active:scale-95 border border-pink-50 flex flex-col items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 group-hover:bg-amber-100 group-hover:scale-110 transition-all">
                <Award size={28} />
              </div>
              <div className="w-full">
                <h3 className="font-bold text-gray-900 text-lg flex justify-between items-center w-full">สมาชิก <ChevronRight size={16} className="text-amber-300 group-hover:translate-x-1 transition-transform" /></h3>
                <p className="text-[11px] text-gray-500 mt-0.5">สะสมแต้ม & แลกของ</p>
              </div>
            </Link>

            <Link href="/how-to" className="group relative overflow-hidden bg-white p-5 rounded-[2rem] shadow-sm hover:shadow-xl transition-all active:scale-95 border border-pink-50 flex flex-col items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-slate-100 group-hover:scale-110 transition-all">
                <HelpCircle size={28} />
              </div>
              <div className="w-full">
                <h3 className="font-bold text-gray-900 text-lg flex justify-between items-center w-full">วิธีใช้ <ChevronRight size={16} className="text-slate-300 group-hover:translate-x-1 transition-transform" /></h3>
                <p className="text-[11px] text-gray-500 mt-0.5">คู่มือจองคิวออนไลน์</p>
              </div>
            </Link>

            <Link href="/check" className="group relative overflow-hidden bg-white p-5 rounded-[2rem] shadow-sm hover:shadow-xl transition-all active:scale-95 border border-pink-50 flex flex-col items-start gap-4 col-span-2">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 group-hover:bg-blue-100 group-hover:scale-110 transition-all">
                <Search size={28} />
              </div>
              <div className="w-full">
                <h3 className="font-bold text-gray-900 text-lg flex justify-between items-center w-full">ค้นหาคิว <ChevronRight size={16} className="text-blue-300 group-hover:translate-x-1 transition-transform" /></h3>
                <p className="text-[11px] text-gray-500 mt-0.5">เช็คคิว & ยกเลิกคิว</p>
              </div>
            </Link>
          </div>
        </section>

        {/* 3.5 Customer Calendar (เช็คคิวว่าง) */}
        <section className="bg-white rounded-[2rem] shadow-sm border border-pink-50 p-6">
          <div className="mb-4">
            <h2 className="font-bold text-gray-900 flex items-center gap-2 text-lg">
              <CalendarHeart className="text-pink-500" size={20} />
              เช็คคิวว่างเบื้องต้น
            </h2>
            <p className="text-xs text-gray-500 mt-1">กดที่วันเพื่อดูจำนวนคิวที่ยังว่างอยู่</p>
          </div>
          <CustomerCalendar />
        </section>

        {/* 4. Portfolio Embed (Gallery Section) */}
        <GallerySection />

        {/* 5. Google Maps Embed */}
        <section className="bg-white rounded-[2rem] shadow-sm border border-pink-50 overflow-hidden">
          <div className="p-5 border-b border-gray-50">
            <h2 className="font-bold text-gray-900 flex items-center gap-2 text-lg">
              <MapPin className="text-rose-500" size={20} />
              แผนที่ร้าน
            </h2>
          </div>
          <div className="p-8 bg-gray-50 flex flex-col items-center justify-center text-center">
             <MapPin size={32} className="text-gray-300 mb-2" />
             <p className="text-sm font-medium text-gray-500">รออัพเดทแผนที่</p>
          </div>
        </section>

        {/* 6. Reviews Section */}
        {reviews.length > 0 && (
          <section className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-[2rem] shadow-sm border border-amber-100/50 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 rounded-full blur-2xl"></div>
            <div className="relative z-10">
              <div className="text-center mb-5">
                <div className="flex justify-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map(i => <Star key={i} size={24} className="text-yellow-400 fill-yellow-400 drop-shadow-sm" />)}
                </div>
                <h2 className="font-black text-gray-900 text-xl mb-1">เสียงตอบรับจากลูกค้า</h2>
                <p className="text-sm text-gray-600">ขอบคุณทุกความไว้วางใจค่ะ 💕</p>
              </div>

              <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory hide-scrollbar -mx-6 px-6">
                {reviews.map((review) => (
                  <div key={review.id} className="snap-center shrink-0 w-[260px] bg-white/80 backdrop-blur-md border border-white rounded-2xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex flex-col">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center text-pink-600 font-bold uppercase">
                        {(review.customers?.name || "K")[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{review.customers?.name || "คุณลูกค้า"}</p>
                        <div className="flex gap-0.5 mt-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={10} className={i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 italic flex-1">"{review.comment}"</p>
                    <p className="text-[9px] text-gray-400 mt-3 text-right">
                      {new Date(review.created_at).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

      </main>
    </div>
  );
}
