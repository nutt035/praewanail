"use client";

import { useState } from "react";
import { Sparkles, Lock, Loader2, Eye, EyeOff, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

const OWNER_EMAIL = "nuttakankhu@gmail.com";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError("");

    try {
      const { error: signInError } = await supabaseBrowser.auth.signInWithPassword({
        email: OWNER_EMAIL,
        password,
      });

      if (!signInError) {
        router.push("/admin");
        router.refresh();
      } else {
        setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      }
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink() {
    setMagicLinkLoading(true);
    setError("");

    const { error: magicLinkError } = await supabaseBrowser.auth.signInWithOtp({
      email: OWNER_EMAIL,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (magicLinkError) {
      setError("ส่งลิงก์เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่");
    } else {
      setEmailSent(true);
    }
    setMagicLinkLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#FDF2F8] flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-rose-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-pink-200/30 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center mx-auto shadow-lg shadow-rose-200/50 mb-4">
            <Sparkles size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Antonette Nail</h1>
          <p className="text-sm text-slate-400 mt-1">Studio Management</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-rose-100/50 border border-pink-100 p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
              <Lock size={16} className="text-rose-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-700">เข้าสู่ระบบ</h2>
              <p className="text-[11px] text-slate-400">สำหรับผู้ดูแลร้านเท่านั้น</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                รหัสผ่าน
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="กรอกรหัสผ่าน"
                  autoFocus
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-pink-200 bg-pink-50/50 text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-xs text-rose-500 bg-rose-50 px-3 py-2 rounded-lg border border-rose-100 animate-slide-up">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full py-3 bg-gradient-to-r from-rose-400 to-pink-500 text-white font-bold rounded-xl shadow-lg shadow-rose-200/50 hover:shadow-xl hover:shadow-rose-300/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  กำลังเข้าสู่ระบบ...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  เข้าสู่ระบบ
                </>
              )}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-widest text-slate-300">
            <span className="h-px flex-1 bg-pink-100" />
            หรือ
            <span className="h-px flex-1 bg-pink-100" />
          </div>

          <button
            type="button"
            onClick={handleMagicLink}
            disabled={magicLinkLoading || emailSent}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-pink-200 px-4 py-3 text-sm font-semibold text-rose-500 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {magicLinkLoading ? <Loader2 size={17} className="animate-spin" /> : <Mail size={17} />}
            {emailSent ? "ส่งลิงก์เข้าอีเมลแล้ว" : "ส่งลิงก์เข้าสู่ระบบทางอีเมล"}
          </button>

          {emailSent && (
            <p className="mt-3 text-center text-xs leading-5 text-emerald-600">
              เปิดอีเมล {OWNER_EMAIL} บนอุปกรณ์นี้ แล้วกดลิงก์เพื่อเข้าสู่ระบบ
            </p>
          )}
        </div>

        <p className="text-center text-xs text-slate-300 mt-6">
          © 2025 Antonette Nail Studio
        </p>
      </div>
    </div>
  );
}
