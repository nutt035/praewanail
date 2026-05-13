"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Search, Trophy, Phone, User, Calendar, Star, Sparkles, ChevronLeft, CreditCard, Gift, Loader2 } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { Reward, CustomerCoupon, Customer, ShopSettings, settingsToMap, DEFAULT_SETTINGS, Review } from "@/lib/types";

function MemberContent() {
  const searchParams = useSearchParams();
  const linkLineId = searchParams?.get("link_line");
  const linkName = searchParams?.get("name");
  
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>(DEFAULT_SETTINGS);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [myCoupons, setMyCoupons] = useState<CustomerCoupon[]>([]);
  const [redeeming, setRedeeming] = useState(false);

  // Registration & Update state
  const [isRegistering, setIsRegistering] = useState(false);
  const [isUpdatingInfo, setIsUpdatingInfo] = useState(false);
  const [regName, setRegName] = useState(linkName || "");
  const [regPhone, setRegPhone] = useState("");
  const [regBirthdate, setRegBirthdate] = useState("");

  // Review state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  useEffect(() => {
    // เช็ค Cookie ว่ามี session ไหม
    const cookies = document.cookie.split(";").reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split("=");
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {} as Record<string, string>);

    if (cookies.customer_phone && !hasSearched) {
      setPhone(cookies.customer_phone);
      // Auto login by phone if cookie exists
      handleSearchByPhone(cookies.customer_phone);
    }

    (async () => {
      const [settingsRes, rewardsRes] = await Promise.all([
        supabase.from("shop_settings").select("*"),
        supabase.from("rewards").select("*").eq("is_active", true).order("points_required", { ascending: true })
      ]);
      if (settingsRes.data && settingsRes.data.length > 0) {
        setSettings({ ...DEFAULT_SETTINGS, ...settingsToMap(settingsRes.data as ShopSettings[]) });
      }
      if (rewardsRes.data) {
        setRewards(rewardsRes.data as Reward[]);
      }
    })();
  }, []);

  async function fetchMyCoupons(customerId: string) {
    const { data } = await supabase
      .from("customer_coupons")
      .select("*, rewards(*)")
      .eq("customer_id", customerId)
      .eq("status", "active");
    if (data) setMyCoupons(data as CustomerCoupon[]);
  }

  async function handleSearchByPhone(phoneNumber: string) {
    if (!phoneNumber) return;
    setLoading(true);
    setHasSearched(false);
    
    try {
      const cleanPhone = phoneNumber.replace(/\D/g, "");
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .ilike("phone", `%${cleanPhone}%`)
        .limit(1)
        .single();

      if (error && error.code === "PGRST116") {
        // ไม่พบข้อมูล -> ให้สมัครสมาชิก
        setCustomer(null);
        setRegPhone(cleanPhone);
        if (linkName) setRegName(linkName);
        setIsRegistering(true);
      } else if (data) {
        // หากกำลังผูก LINE ID ให้ทำการอัปเดต
        if (linkLineId) {
          await supabase.from("customers").update({ line_id: linkLineId }).eq("id", data.id);
          toast.success("ผูกบัญชี LINE สำเร็จ!");
          // ลบ query param
          window.history.replaceState({}, "", "/member");
        }
        
        // Save to cookie for auto login
        document.cookie = `customer_phone=${phoneNumber}; path=/; max-age=${60 * 60 * 24 * 30}`;
        
        setCustomer(data);
        fetchMyCoupons(data.id);
        
        // เช็คว่าข้อมูลครบไหม
        if (!data.name || !data.birthdate) {
          setRegName(data.name || linkName || "");
          setRegPhone(data.phone || phoneNumber);
          setRegBirthdate(data.birthdate || "");
          setIsUpdatingInfo(true);
        }
      }
    } catch (err) {
      toast.error("เกิดข้อผิดพลาดในการค้นหา");
    } finally {
      setLoading(false);
      setHasSearched(true);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    await handleSearchByPhone(phone);
  }

  async function handleRegisterOrUpdate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading(isUpdatingInfo ? "กำลังอัปเดตข้อมูล..." : "กำลังสมัครสมาชิก...");

    try {
      const cleanPhone = regPhone.replace(/\D/g, "");
      
      if (isUpdatingInfo && customer) {
        // อัปเดตข้อมูล
        const { error } = await supabase
          .from("customers")
          .update({ name: regName, birthdate: regBirthdate || null, line_id: linkLineId || customer.line_id })
          .eq("id", customer.id);
        
        if (error) throw error;
        setCustomer({ ...customer, name: regName, birthdate: regBirthdate || null, line_id: linkLineId || customer.line_id });
        setIsUpdatingInfo(false);
        toast.success("อัปเดตข้อมูลสำเร็จ!", { id: toastId });
        
        if (linkLineId) window.history.replaceState({}, "", "/member");

      } else {
        // สมัครใหม่
        const { data: newCust, error } = await supabase
          .from("customers")
          .insert([{
            name: regName,
            phone: cleanPhone,
            line_id: linkLineId || null,
            birthdate: regBirthdate || null,
            points: 0
          }])
          .select()
          .single();
          
        if (error) throw error;
        
        document.cookie = `customer_phone=${cleanPhone}; path=/; max-age=${60 * 60 * 24 * 30}`;
        setCustomer(newCust);
        setIsRegistering(false);
        toast.success("สมัครสมาชิกสำเร็จ!", { id: toastId });
        
        if (linkLineId) window.history.replaceState({}, "", "/member");
      }
    } catch (err: any) {
      toast.error(err.message || "เกิดข้อผิดพลาด", { id: toastId });
    } finally {
      setLoading(false);
    }
  }

  async function handleRedeem(reward: Reward) {
    if (!customer) return;
    if (customer.points < reward.points_required) {
      toast.error("แต้มไม่พอแลกคูปองนี้ค่ะ");
      return;
    }
    if (!confirm(`ยืนยันการใช้ ${reward.points_required} แต้ม เพื่อแลก "${reward.title}" หรือไม่?`)) return;

    setRedeeming(true);
    const toastId = toast.loading("กำลังแลกคูปอง...");

    try {
      // 1. Deduct points
      const newPoints = customer.points - reward.points_required;
      const { error: updateError } = await supabase
        .from("customers")
        .update({ points: newPoints })
        .eq("id", customer.id);
      
      if (updateError) throw updateError;

      // 2. Insert coupon
      const { error: insertError } = await supabase
        .from("customer_coupons")
        .insert([{
          customer_id: customer.id,
          reward_id: reward.id,
          status: "active"
        }]);

      if (insertError) throw insertError;

      // 3. Update UI
      setCustomer({ ...customer, points: newPoints });
      await fetchMyCoupons(customer.id);
      toast.success("แลกคูปองสำเร็จ! ดูได้ที่ 'คูปองของฉัน'", { id: toastId });
    } catch (err) {
      toast.error("เกิดข้อผิดพลาดในการแลกคูปอง", { id: toastId });
    } finally {
      setRedeeming(false);
    }
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!customer) return;
    setSubmittingReview(true);
    const toastId = toast.loading("กำลังบันทึกรีวิว...");
    
    try {
      const { error } = await supabase.from("reviews").insert([{
        customer_id: customer.id,
        rating,
        comment,
        is_published: true
      }]);
      
      if (error) throw error;
      
      setHasReviewed(true);
      toast.success("ขอบคุณสำหรับรีวิวค่ะ!", { id: toastId });
    } catch (err) {
      toast.error("เกิดข้อผิดพลาดในการส่งรีวิว", { id: toastId });
    } finally {
      setSubmittingReview(false);
    }
  }

  // คำนวณระดับสมาชิก
  const points = customer?.points || 0;
  let tier = "Classic";
  let tierColor = "from-slate-300 to-slate-400";
  let textColor = "text-slate-600";
  let badgeColor = "bg-slate-100 text-slate-500";
  let iconColor = "text-slate-400";

  if (points >= 10) {
    tier = "Gold";
    tierColor = "from-yellow-300 via-amber-400 to-yellow-500";
    textColor = "text-yellow-900";
    badgeColor = "bg-yellow-100 text-yellow-700";
    iconColor = "text-yellow-100";
  } else if (points >= 5) {
    tier = "Silver";
    tierColor = "from-gray-300 via-slate-300 to-gray-400";
    textColor = "text-slate-800";
    badgeColor = "bg-slate-200 text-slate-700";
    iconColor = "text-slate-100";
  } else {
    tier = "Classic";
    tierColor = "from-rose-300 via-pink-400 to-rose-400";
    textColor = "text-rose-900";
    badgeColor = "bg-rose-100 text-rose-700";
    iconColor = "text-rose-100";
  }



  return (
    <div className="min-h-screen bg-[#FDF2F8] selection:bg-pink-200 pb-20">
      <Toaster position="top-center" toastOptions={{ className: "text-sm font-medium" }} />
      
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-pink-100 sticky top-0 z-50 isolate">
        <div className="max-w-md mx-auto px-5 py-4 flex items-center gap-3">
          <a href="/" className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center text-rose-400 hover:bg-pink-100 transition-colors">
            <ChevronLeft size={18} />
          </a>
          <div className="flex-1">
            <p className="text-sm font-bold text-brand-dark">ระบบสมาชิก</p>
            <p className="text-[10px] text-slate-400">เช็คแต้มสะสม & สิทธิพิเศษ</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-sm">
            <Star size={15} className="text-white fill-white" />
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 py-8">
        
        {isRegistering || isUpdatingInfo ? (
          <div className="space-y-6 animate-slide-up">
            <div className="text-center space-y-2 mb-8">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                {isUpdatingInfo ? "อัปเดตข้อมูลส่วนตัว" : "สมัครสมาชิกใหม่"}
              </h1>
              <p className="text-sm text-gray-500">กรอกข้อมูลให้ครบถ้วนเพื่อรับสิทธิพิเศษ</p>
            </div>
            <form onSubmit={handleRegisterOrUpdate} className="bg-white rounded-[2rem] shadow-sm border border-pink-100 p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">ชื่อ-นามสกุล / ชื่อเล่น</label>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={regName} onChange={e => setRegName(e.target.value)} required className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-pink-400 outline-none transition-all font-medium text-slate-700" placeholder="ชื่อของคุณ" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">เบอร์โทรศัพท์</label>
                <div className="relative">
                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} required className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-pink-400 outline-none transition-all font-medium text-slate-700" placeholder="08X-XXX-XXXX" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">วัน/เดือน/ปีเกิด (เพื่อรับสิทธิพิเศษ)</label>
                <div className="relative">
                  <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="date" value={regBirthdate} onChange={e => setRegBirthdate(e.target.value)} required className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-pink-400 outline-none transition-all font-medium text-slate-700" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-rose-400 to-pink-500 hover:to-pink-600 text-white font-bold py-4 px-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2">
                {loading ? <><Loader2 size={18} className="animate-spin" /> กำลังบันทึก...</> : "บันทึกข้อมูล"}
              </button>
              {isRegistering && (
                <button type="button" onClick={() => setIsRegistering(false)} className="w-full mt-3 text-sm text-slate-400 font-bold hover:text-slate-600 transition-colors">
                  ยกเลิก / กลับไปเข้าสู่ระบบ
                </button>
              )}
            </form>
          </div>
        ) : !customer ? (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2 mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-rose-100 to-pink-200 rounded-[2rem] flex items-center justify-center mx-auto mb-4 shadow-inner">
                <Trophy className="text-rose-500 w-10 h-10" />
              </div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                {linkLineId ? "ผูกบัญชี LINE" : "เข้าสู่ระบบสมาชิก"}
              </h1>
              <p className="text-sm text-gray-500">
                {linkLineId ? `คุณ ${linkName || ""} กรุณากรอกเบอร์โทรที่เคยใช้บริการเพื่อผูกบัญชี` : "กรอกเบอร์โทรศัพท์หรือเข้าสู่ระบบด้วย LINE"}
              </p>
            </div>

            {!linkLineId && (
              <a href="/api/auth/line" className="w-full bg-[#06C755] hover:bg-[#05b34c] text-white font-bold py-4 px-4 rounded-2xl shadow-lg shadow-green-200/50 transition-all flex items-center justify-center gap-2 active:scale-[0.98] mb-4">
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
                  <path d="M22.28 11.23c0-4.88-4.9-8.86-10.9-8.86C5.37 2.37.47 6.35.47 11.23c0 4.38 3.93 8.09 9.17 8.76.36.08.85.24.97.55.11.28.07.7.03 1.09l-.15 1c-.04.28-.21 1.09.96.6 1.17-.49 6.29-3.7 8.65-6.39 1.4-1.63 2.18-3.47 2.18-5.61z"/>
                </svg>
                ล็อกอินด้วย LINE
              </a>
            )}

            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-pink-100"></div>
              <span className="text-xs font-bold text-pink-300 uppercase">หรือ</span>
              <div className="flex-1 h-px bg-pink-100"></div>
            </div>

            <form onSubmit={handleSearch} className="bg-white rounded-[2rem] shadow-sm border border-pink-100 p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                  เบอร์โทรศัพท์
                </label>
                <div className="relative">
                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="08X-XXX-XXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-pink-400 focus:border-transparent outline-none transition-all font-medium text-slate-700"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-rose-400 to-pink-500 hover:to-pink-600 text-white font-bold py-4 px-4 rounded-2xl shadow-lg shadow-pink-200/50 transition-all flex items-center justify-center gap-2 disabled:opacity-70 active:scale-[0.98]"
              >
                {loading ? (
                  <><Loader2 size={18} className="animate-spin" /> กำลังตรวจสอบ...</>
                ) : (
                  <><Search size={18} /> เข้าสู่ระบบ</>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-6 animate-slide-up">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">บัตรสมาชิกของคุณ</h2>
              <button onClick={() => {
                setCustomer(null); 
                setPhone(""); 
                document.cookie = "customer_phone=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                document.cookie = "customer_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
              }} className="text-xs font-bold text-rose-500 bg-rose-50 px-3 py-1.5 rounded-full hover:bg-rose-100 transition-colors">
                ออกจากระบบ
              </button>
            </div>

            {/* Member Card - Glassmorphism */}
            <div className={`relative overflow-hidden rounded-[2rem] p-6 shadow-xl bg-gradient-to-br ${tierColor} transform transition-transform hover:scale-[1.02] duration-300`}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/5 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4"></div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-widest ${textColor} opacity-80 mb-1`}>Member Card</p>
                    <h3 className={`text-2xl font-black ${textColor} tracking-tight`}>{customer.name}</h3>
                  </div>
                  <div className={`px-3 py-1.5 rounded-full text-xs font-black backdrop-blur-md bg-white/30 ${textColor} shadow-sm border border-white/20 flex items-center gap-1`}>
                    <Sparkles size={12} /> {tier}
                  </div>
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <p className={`text-[10px] uppercase font-bold ${textColor} opacity-70 mb-1`}>แต้มสะสม</p>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-5xl font-black ${textColor}`}>{points}</span>
                      <span className={`text-sm font-bold ${textColor} opacity-80`}>pts</span>
                    </div>
                  </div>
                  <CreditCard size={48} className={`${iconColor} opacity-50`} />
                </div>
              </div>
            </div>

            {/* My Coupons */}
            {myCoupons.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <Gift size={16} className="text-rose-500" /> คูปองของฉัน
                </h4>
                <div className="grid gap-3">
                  {myCoupons.map(coupon => (
                    <div key={coupon.id} className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-2xl p-4 border border-rose-100 flex items-center gap-4 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-400"></div>
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-rose-400 font-bold text-xl shadow-sm shrink-0">
                        %
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 truncate">{coupon.rewards?.title}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">แจ้งแอดมินตอนชำระเงินเพื่อใช้คูปองนี้</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rewards Catalog */}
            <div className="space-y-3">
              <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Star size={16} className="text-amber-500" /> แลกของรางวัล
              </h4>
              <div className="grid gap-3">
                {rewards.length === 0 ? (
                  <div className="text-center p-6 bg-white rounded-2xl border border-dashed border-pink-200">
                    <p className="text-sm text-slate-400">ยังไม่มีของรางวัลให้แลกในขณะนี้</p>
                  </div>
                ) : (
                  rewards.map(reward => {
                    const canRedeem = points >= reward.points_required;
                    return (
                      <div key={reward.id} className={`bg-white rounded-2xl p-4 border transition-all ${canRedeem ? "border-amber-200 shadow-sm" : "border-gray-100 opacity-70"}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-bold text-gray-900">{reward.title}</p>
                            {reward.description && <p className="text-[10px] text-gray-500 mt-0.5">{reward.description}</p>}
                          </div>
                          <div className={`px-2 py-1 rounded-lg text-[10px] font-bold ${canRedeem ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                            ใช้ {reward.points_required} แต้ม
                          </div>
                        </div>
                        <button 
                          onClick={() => handleRedeem(reward)}
                          disabled={!canRedeem || redeeming}
                          className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${
                            canRedeem 
                              ? "bg-gray-900 text-white hover:bg-gray-800 shadow-md" 
                              : "bg-gray-100 text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          {canRedeem ? "แลกคูปองนี้" : `ขาดอีก ${reward.points_required - points} แต้ม`}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* เขียนรีวิว */}
            <div className="bg-white rounded-2xl border border-pink-100 overflow-hidden p-5 shadow-sm">
              <h4 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
                <Star size={16} className="text-pink-500 fill-pink-500" />
                รีวิวความประทับใจ
              </h4>
              {hasReviewed ? (
                <div className="bg-pink-50 text-rose-500 p-4 rounded-xl text-center text-sm font-medium">
                  ขอบคุณสำหรับรีวิวของคุณค่ะ! 💕
                </div>
              ) : (
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">ให้คะแนนร้านเรา</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            rating >= star ? "bg-amber-100 text-amber-500" : "bg-slate-50 text-slate-300 hover:bg-slate-100"
                          }`}
                        >
                          <Star size={20} className={rating >= star ? "fill-amber-500" : ""} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">ความรู้สึก/ข้อเสนอแนะ</label>
                    <textarea 
                      required
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="เขียนรีวิวผลงานให้เราหน่อยน้า..."
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-400 focus:border-transparent outline-none transition-all text-sm min-h-[80px]"
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={submittingReview || !comment.trim()}
                    className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    {submittingReview ? "กำลังส่ง..." : "ส่งรีวิว"}
                  </button>
                </form>
              )}
            </div>

            {/* Info */}
            <div className="bg-white rounded-2xl border border-pink-100 overflow-hidden">
              <div className="p-4 border-b border-gray-50">
                <h4 className="font-bold text-gray-900 text-sm">ข้อมูลสมาชิก</h4>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                    <Phone size={14} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">เบอร์โทรศัพท์</p>
                    <p className="text-sm font-medium text-slate-700">{customer.phone || "-"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                    <Calendar size={14} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">วันที่สมัคร</p>
                    <p className="text-sm font-medium text-slate-700">{new Date(customer.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>
                {customer.notes && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                      <User size={14} />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">บันทึกช่วยจำ</p>
                      <p className="text-sm font-medium text-slate-700">{customer.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
          </div>
        )}
      </main>
    </div>
  );
}

export default function MemberPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FDF2F8] flex items-center justify-center"><Loader2 className="animate-spin text-rose-400" size={32} /></div>}>
      <MemberContent />
    </Suspense>
  );
}
