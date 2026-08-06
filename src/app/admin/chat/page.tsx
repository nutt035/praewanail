"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, ChevronLeft, Loader2, MessageSquare, RefreshCw, Send, Sparkles, User } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase-browser";

type ChatUser = { id: string; platform: string; platform_user_id: string; display_name: string; picture_url: string; last_active: string };
type ChatMessage = { id: string; chat_user_id: string; direction: "inbound" | "outbound"; content: string; message_type?: string; image_url?: string; created_at: string };
type Suggestion = { label: string; text: string };

export default function AdminChatDashboard() {
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selected, setSelected] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);

  async function fetchUsers() {
    setLoading(true);
    const { data } = await supabase.from("chat_users").select("*").eq("platform", "line").order("last_active", { ascending: false });
    setUsers(data ?? []);
    setLoading(false);
  }

  async function fetchMessages(userId: string) {
    const { data } = await supabase.from("chat_messages").select("*").eq("chat_user_id", userId).order("created_at", { ascending: true });
    setMessages(data ?? []);
  }

  // Fetching remote inbox state is intentionally initiated when the page/user changes.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchUsers(); }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (selected) void fetchMessages(selected.id); }, [selected]);
  useEffect(() => {
    const updateClock = () => setCurrentTime(Date.now());
    updateClock();
    const timer = window.setInterval(updateClock, 5_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    const channel = supabase.channel("line_inbox_updates").on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
      const message = payload.new as ChatMessage;
      if (selected?.id === message.chat_user_id) setMessages((current) => [...current, message]);
      void fetchUsers();
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [selected]);

  const lastInbound = [...messages].reverse().find((message) => message.direction === "inbound");
  const likelyFree = Boolean(lastInbound && currentTime - new Date(lastInbound.created_at).getTime() < 50_000);

  async function generateSuggestions() {
    if (!selected) return;
    setSuggesting(true);
    setSuggestions([]);
    const response = await fetch("/api/chat/suggestions", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chatUserId: selected.id }),
    });
    const result = await response.json().catch(() => ({}));
    setSuggesting(false);
    if (!response.ok) return toast.error("ยังสร้างคำตอบแนะนำไม่ได้ กรุณาลองอีกครั้ง");
    setSuggestions(result.suggestions ?? []);
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!selected || !input.trim() || sending) return;
    const text = input.trim();
    setSending(true);
    const response = await fetch("/api/chat/reply", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chatUserId: selected.id, text }),
    });
    const result = await response.json().catch(() => ({}));
    setSending(false);
    if (!response.ok) return toast.error("ส่งข้อความไม่สำเร็จ");
    setInput("");
    setSuggestions([]);
    await fetchMessages(selected.id);
    toast.success(result.deliveryMode === "reply" ? "ส่งแล้ว · ไม่ใช้โควตา LINE" : "ส่งแล้ว · ใช้โควตา LINE 1 ข้อความ");
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-rose-100 bg-white font-sans shadow-sm">
      <header className="border-b border-rose-100 bg-gradient-to-r from-rose-50 to-white px-5 py-4">
        <div className="flex items-center gap-3"><div className="rounded-2xl bg-[#06C755] p-2.5 text-white"><MessageSquare size={20} /></div><div><h1 className="text-xl font-semibold text-slate-900">กล่องข้อความ LINE</h1><p className="text-xs text-slate-500">AI ช่วยร่าง คุณตรวจและกดส่งเองทุกครั้ง</p></div></div>
      </header>
      <div className="grid h-[calc(100vh-13rem)] min-h-[560px] md:grid-cols-[300px_1fr]">
        <aside className={`${selected ? "hidden md:flex" : "flex"} flex-col border-r border-rose-100 bg-[#FCFAF8]`}>
          <div className="flex-1 space-y-1 overflow-y-auto p-3">
            {loading ? <div className="py-12 text-center text-sm text-slate-400"><RefreshCw className="mx-auto mb-2 animate-spin" />กำลังโหลด...</div> : users.length === 0 ? <div className="py-12 text-center text-sm text-slate-400">ยังไม่มีข้อความจากลูกค้า</div> : users.map((user) => (
              <button key={user.id} onClick={() => { setSelected(user); setSuggestions([]); }} className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${selected?.id === user.id ? "bg-white shadow-sm ring-1 ring-rose-100" : "hover:bg-white"}`}>
                {user.picture_url ? <img src={user.picture_url} alt="" className="h-11 w-11 rounded-full object-cover" /> : <span className="grid h-11 w-11 place-items-center rounded-full bg-rose-100 text-rose-500"><User size={18} /></span>}
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800">{user.display_name || "ลูกค้า LINE"}</span><span className="block text-xs text-slate-400">{new Date(user.last_active).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}</span></span>
              </button>
            ))}
          </div>
        </aside>
        {selected ? <main className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <div className="flex items-center gap-3 border-b border-rose-100 px-4 py-3"><button className="rounded-full p-2 hover:bg-rose-50 md:hidden" onClick={() => setSelected(null)}><ChevronLeft /></button><div className="font-semibold text-slate-800">{selected.display_name || "ลูกค้า LINE"}</div><span className="ml-auto rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">LINE</span></div>
          <div className="min-h-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto bg-[#FFFCFA] p-4 md:p-6">
            {messages.map((message) => <div key={message.id} className={`flex min-w-0 ${message.direction === "outbound" ? "justify-end" : "justify-start"}`}><div className={`min-w-0 max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed md:max-w-[70%] ${message.direction === "outbound" ? "rounded-br-md bg-rose-500 text-white" : "rounded-bl-md border border-rose-100 bg-white text-slate-700 shadow-sm"}`}>{message.message_type === "image" && message.image_url && <img src={message.image_url} alt="รูปจากลูกค้า" className="mb-2 max-h-72 w-full rounded-xl object-contain" />}<p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{message.content}</p><p className={`mt-1 text-right text-[10px] ${message.direction === "outbound" ? "text-rose-100" : "text-slate-400"}`}>{new Date(message.created_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</p></div></div>)}
            <div ref={endRef} />
          </div>
          <div className="border-t border-rose-100 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-2"><button type="button" onClick={generateSuggestions} disabled={suggesting} className="flex items-center gap-2 rounded-full bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60">{suggesting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}ข้อเสนอแนะคำตอบ</button><span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${likelyFree ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>{likelyFree ? "มีโอกาสตอบฟรี" : "อาจใช้โควตา LINE"}</span></div>
            {suggestions.length > 0 && <div className="mb-3 grid max-h-52 gap-2 overflow-y-auto md:grid-cols-3">{suggestions.map((suggestion) => <button key={suggestion.label} type="button" onClick={() => setInput(suggestion.text)} className="min-w-0 rounded-2xl border border-rose-100 p-3 text-left hover:border-rose-300 hover:bg-rose-50"><span className="mb-1 flex items-center gap-1 text-xs font-semibold text-rose-600"><Bot size={13} />{suggestion.label}</span><span className="block whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-600 [overflow-wrap:anywhere]">{suggestion.text}</span></button>)}</div>}
            <form onSubmit={sendMessage} className="flex items-end gap-2"><textarea value={input} onChange={(event) => setInput(event.target.value)} rows={2} placeholder="เลือกคำตอบแนะนำ หรือพิมพ์ข้อความเอง..." className="min-h-12 flex-1 resize-none rounded-2xl border border-rose-200 px-4 py-3 text-sm outline-none focus:border-rose-400" /><button disabled={!input.trim() || sending} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-40">{sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}</button></form>
          </div>
        </main> : <div className="hidden place-items-center bg-[#FFFCFA] text-center text-slate-400 md:grid"><div><MessageSquare className="mx-auto mb-3 text-rose-200" size={48} /><p>เลือกลูกค้าเพื่อดูบทสนทนา</p></div></div>}
      </div>
    </section>
  );
}
