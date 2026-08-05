import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { getOwnerUser } from "@/lib/server/owner-auth";
import { hasSameOrigin, takeRateLimit } from "@/lib/server/request-security";
import { getSharedShopSettings } from "@/lib/server/shop-context";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";

const schema = z.object({ chatUserId: z.string().uuid() });
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

export async function POST(req: NextRequest) {
  const owner = await getOwnerUser();
  if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const rate = takeRateLimit(req, "chat-suggestions", 20, 10 * 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !ai) return NextResponse.json({ error: "Suggestions unavailable" }, { status: 400 });

  const supabase = createSupabaseAdminClient();

  const { data: messages } = await supabase.from("chat_messages")
    .select("direction,content,created_at")
    .eq("chat_user_id", parsed.data.chatUserId)
    .order("created_at", { ascending: false }).limit(12);
  const settings = await getSharedShopSettings();
  const history = [...(messages ?? [])].reverse().map((m) => `${m.direction === "inbound" ? "ลูกค้า" : "ร้าน"}: ${m.content}`).join("\n");
  const prompt = `คุณเป็นผู้ช่วยร่างคำตอบของร้านทำเล็บ Antonette Nail ให้เจ้าของร้านตรวจแล้วกดส่งเอง
ตอบภาษาไทย โทนอบอุ่น เป็นผู้หญิง สุภาพ พรีเมียม และไม่รับปากข้อมูลที่ไม่มีหลักฐาน
ข้อมูลร้านที่ยืนยันแล้ว: ${JSON.stringify(settings)}
บทสนทนาล่าสุด:\n${history}
สร้างคำตอบ 3 แบบ: short (สั้นกระชับ), warm (เป็นกันเอง), detailed (สุภาพละเอียด)
ตอบเป็น JSON เท่านั้น รูปแบบ {"suggestions":[{"label":"สั้นกระชับ","text":"..."},{"label":"เป็นกันเอง","text":"..."},{"label":"สุภาพละเอียด","text":"..."}]}`;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", contents: prompt,
      config: { responseMimeType: "application/json", temperature: 0.5 },
    });
    const result = JSON.parse(response.text || "{}");
    const suggestions = z.array(z.object({ label: z.string().max(30), text: z.string().min(1).max(1000) })).length(3).parse(result.suggestions);
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("[CHAT_SUGGESTIONS_ERROR]", error);
    return NextResponse.json({ error: "Could not create suggestions" }, { status: 500 });
  }
}
