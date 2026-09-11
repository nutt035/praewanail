"use client";

import { useState } from "react";
import { KeyRound, Loader2, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

const OWNER_EMAIL = "nuttakankhu@gmail.com";

export default function LoginPage() {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  async function sendOtp() {
    setSending(true);
    setError("");

    try {
      const { error: sendError } = await supabase.auth.signInWithOtp({
        email: OWNER_EMAIL,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (sendError) {
        setError("ส่งรหัสไม่สำเร็จ กรุณารอสักครู่แล้วลองใหม่");
        return;
      }

      setOtp("");
      setEmailSent(true);
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setSending(false);
    }
  }

  async function verifyOtp(event: React.FormEvent) {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp)) return;

    setVerifying(true);
    setError("");

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: OWNER_EMAIL,
        token: otp,
        type: "email",
      });

      if (verifyError || data.user?.email?.toLowerCase() !== OWNER_EMAIL) {
        await supabase.auth.signOut();
        setError("รหัสไม่ถูกต้องหรือหมดอายุ กรุณาใช้รหัสล่าสุดจากอีเมล");
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError("ตรวจสอบรหัสไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#FDF2F8] p-4">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-rose-200/30 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-pink-200/30 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 shadow-lg shadow-rose-200/50">
            <Sparkles size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Antonette Nail</h1>
          <p className="mt-1 text-sm text-slate-400">Digital Office</p>
        </div>

        <section className="rounded-3xl border border-pink-100 bg-white p-7 shadow-xl shadow-rose-100/50">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50">
              <ShieldCheck size={18} className="text-rose-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-700">เข้าสู่ระบบสำหรับเจ้าของร้าน</h2>
              <p className="text-[11px] text-slate-400">ยืนยันด้วยรหัส 6 หลักจากอีเมล</p>
            </div>
          </div>

          {!emailSent ? (
            <div>
              <div className="rounded-2xl border border-pink-100 bg-pink-50/60 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">ส่งรหัสไปที่</p>
                <p className="mt-1 break-all text-sm font-medium text-slate-700">{OWNER_EMAIL}</p>
              </div>
              <button
                type="button"
                onClick={sendOtp}
                disabled={sending}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-400 to-pink-500 py-3 font-bold text-white shadow-lg shadow-rose-200/50 transition-all disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
                {sending ? "กำลังส่งรหัส..." : "ส่งรหัส 6 หลักทางอีเมล"}
              </button>
            </div>
          ) : (
            <form onSubmit={verifyOtp}>
              <label htmlFor="owner-otp" className="mb-2 block text-xs font-semibold text-slate-500">
                รหัสยืนยัน 6 หลัก
              </label>
              <div className="relative">
                <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-400" />
                <input
                  id="owner-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={6}
                  value={otp}
                  onChange={(event) => {
                    setOtp(event.target.value.replace(/\D/g, "").slice(0, 6));
                    setError("");
                  }}
                  placeholder="000000"
                  className="w-full rounded-xl border border-pink-200 bg-pink-50/50 py-3 pl-12 pr-4 text-center font-mono text-2xl tracking-[0.35em] text-slate-700 outline-none transition-all placeholder:text-slate-300 focus:border-transparent focus:ring-2 focus:ring-rose-400"
                />
              </div>

              <button
                type="submit"
                disabled={verifying || otp.length !== 6}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-400 to-pink-500 py-3 font-bold text-white shadow-lg shadow-rose-200/50 transition-all disabled:cursor-not-allowed disabled:opacity-50"
              >
                {verifying ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                {verifying ? "กำลังตรวจสอบ..." : "ยืนยันและเข้าสู่หน้าจัดการ"}
              </button>

              <div className="mt-4 flex items-center justify-between gap-3 text-xs">
                <button type="button" onClick={sendOtp} disabled={sending} className="font-medium text-rose-500 disabled:opacity-50">
                  {sending ? "กำลังส่ง..." : "ส่งรหัสใหม่"}
                </button>
                <button type="button" onClick={() => { setEmailSent(false); setOtp(""); setError(""); }} className="text-slate-400">
                  ย้อนกลับ
                </button>
              </div>
            </form>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-600">
              ⚠️ {error}
            </div>
          )}

          <p className="mt-5 text-center text-[10px] leading-4 text-slate-400">
            เมื่อเข้าสู่ระบบแล้ว อุปกรณ์นี้จะจำการเข้าสู่ระบบไว้สูงสุด 30 วัน
          </p>
        </section>

        <p className="mt-6 text-center text-xs text-slate-300">© 2026 Antonette Nail Studio</p>
      </div>
    </main>
  );
}
