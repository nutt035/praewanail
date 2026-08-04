"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase-browser";
import { MessageSquare, Send, User, Bot, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

interface ChatUser {
  id: string;
  platform: string;
  platform_user_id: string;
  display_name: string;
  picture_url: string;
  last_active: string;
}

interface ChatMessage {
  id: string;
  chat_user_id: string;
  direction: "inbound" | "outbound";
  content: string;
  created_at: string;
}

interface ChatSession {
  status: "bot" | "human";
}

export default function AdminChatDashboard() {
  const [platformTab, setPlatformTab] = useState<"line" | "facebook">("line");
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionStatus, setSessionStatus] = useState<"bot" | "human">("bot");
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUsers();
    // Subscribe to new messages (optional Realtime)
    const channel = supabase.channel('chat_updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
        if (selectedUser && payload.new.chat_user_id === selectedUser.id) {
          setMessages(prev => [...prev, payload.new as ChatMessage]);
        }
        fetchUsers(); // Refresh list to update last_active order
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [platformTab, selectedUser]);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.id);
      fetchSession(selectedUser.id);
    }
  }, [selectedUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("chat_users")
      .select("*")
      .eq("platform", platformTab)
      .order("last_active", { ascending: false });
    
    if (data) setUsers(data);
    setLoading(false);
  };

  const fetchMessages = async (userId: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("chat_user_id", userId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data);
  };

  const fetchSession = async (userId: string) => {
    const { data } = await supabase
      .from("chat_sessions")
      .select("status")
      .eq("chat_user_id", userId)
      .single();
    if (data) setSessionStatus(data.status as "bot" | "human");
  };

  const toggleSessionStatus = async () => {
    if (!selectedUser) return;
    const newStatus = sessionStatus === "bot" ? "human" : "bot";
    await supabase.from("chat_sessions").update({ status: newStatus }).eq("chat_user_id", selectedUser.id);
    setSessionStatus(newStatus);
    toast.success(`เปลี่ยนโหมดเป็น ${newStatus === 'bot' ? 'AI Bot 🤖' : 'แอดมินตอบเอง 👩‍💻'}`);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedUser) return;

    const textToSend = inputText.trim();
    setInputText("");

    // Optimistic UI
    const tempMsg: ChatMessage = {
      id: Date.now().toString(),
      chat_user_id: selectedUser.id,
      direction: "outbound",
      content: textToSend,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMsg]);

    const res = await fetch("/api/chat/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatUserId: selectedUser.id, text: textToSend })
    });

    if (!res.ok) {
      toast.error("ส่งข้อความไม่สำเร็จ");
      fetchMessages(selectedUser.id); // Revert
    }
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] bg-slate-900 text-slate-200 font-sans rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Sidebar - Chat List */}
      <div className="w-1/3 border-r border-slate-800 bg-slate-900/50 flex flex-col">
        {/* Header Tabs */}
        <div className="flex p-4 gap-2 border-b border-slate-800">
          <button 
            onClick={() => { setPlatformTab("line"); setSelectedUser(null); }}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${platformTab === "line" ? "bg-green-600/20 text-green-400 border border-green-500/30" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
          >
            LINE
          </button>
          <button 
            onClick={() => { setPlatformTab("facebook"); setSelectedUser(null); }}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${platformTab === "facebook" ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
          >
            Facebook
          </button>
        </div>
        
        {/* User List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="text-center p-4 text-slate-500"><RefreshCw className="animate-spin mx-auto mb-2" /> กำลังโหลด...</div>
          ) : users.length === 0 ? (
            <div className="text-center p-4 text-slate-500 text-sm">ไม่มีประวัติการสนทนา</div>
          ) : (
            users.map(u => (
              <div 
                key={u.id} 
                onClick={() => setSelectedUser(u)}
                className={`p-3 rounded-xl cursor-pointer flex items-center gap-3 transition-colors ${selectedUser?.id === u.id ? 'bg-slate-800 border border-slate-700' : 'hover:bg-slate-800/50 border border-transparent'}`}
              >
                {u.picture_url ? (
                  <img src={u.picture_url} alt="Profile" className="w-10 h-10 rounded-full border border-slate-700" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                    <User size={20} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-200 truncate">{u.display_name || "ลูกค้า"}</div>
                  <div className="text-xs text-slate-500 truncate">{new Date(u.last_active).toLocaleString('th-TH')}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      {selectedUser ? (
        <div className="flex-1 flex flex-col bg-[#0f172a]">
          {/* Chat Header */}
          <div className="h-16 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-900/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="font-medium text-lg text-white">{selectedUser.display_name}</div>
              <span className={`px-2 py-1 text-xs rounded-full border ${platformTab === 'line' ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-blue-900/30 text-blue-400 border-blue-800'}`}>
                {platformTab.toUpperCase()}
              </span>
            </div>
            
            {/* Toggle AI / Human */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">โหมดการตอบ:</span>
              <button 
                onClick={toggleSessionStatus}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  sessionStatus === 'bot' 
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600/30' 
                  : 'bg-rose-600/20 text-rose-400 border border-rose-500/30 hover:bg-rose-600/30'
                }`}
              >
                {sessionStatus === 'bot' ? <Bot size={16} /> : <User size={16} />}
                {sessionStatus === 'bot' ? 'AI Bot ทำงาน' : 'แอดมินตอบเอง'}
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, i) => {
              const isOut = msg.direction === "outbound";
              return (
                <div key={msg.id || i} className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] p-3 rounded-2xl ${
                    isOut 
                    ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-br-none shadow-lg shadow-indigo-900/20' 
                    : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700 shadow-lg'
                  }`}>
                    {msg.content}
                    <div className={`text-[10px] mt-1 ${isOut ? 'text-indigo-200' : 'text-slate-500'} text-right`}>
                      {new Date(msg.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={sendMessage} className="p-4 bg-slate-900 border-t border-slate-800">
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-full pr-2 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="พิมพ์ข้อความตอบกลับ..."
                className="flex-1 bg-transparent border-none outline-none py-3 px-6 text-slate-200 placeholder-slate-500"
              />
              <button 
                type="submit" 
                disabled={!inputText.trim()}
                className="p-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
              >
                <Send size={18} className="ml-0.5" />
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-[#0f172a]">
          <MessageSquare size={48} className="mb-4 opacity-20" />
          <p>เลือกผู้ติดต่อเพื่อเริ่มแชท</p>
        </div>
      )}
    </div>
  );
}
