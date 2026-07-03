import { supabase } from "@/lib/supabase";

export async function getOrCreateChatUser(platform: string, platformUserId: string, displayName: string = "ลูกค้า", pictureUrl: string = "") {
  // หาผู้ใช้
  const { data: existing } = await supabase
    .from("chat_users")
    .select("id")
    .eq("platform_user_id", platformUserId)
    .single();

  if (existing) {
    // อัพเดต last_active
    await supabase.from("chat_users").update({ last_active: new Date().toISOString() }).eq("id", existing.id);
    return existing.id;
  }

  // สร้างใหม่
  const { data: newUser } = await supabase
    .from("chat_users")
    .insert([{ platform, platform_user_id: platformUserId, display_name: displayName, picture_url: pictureUrl }])
    .select("id")
    .single();

  if (newUser) {
    // สร้าง session เป็น bot เริ่มต้น
    await supabase.from("chat_sessions").insert([{ chat_user_id: newUser.id, status: "bot" }]);
    return newUser.id;
  }
  return null;
}

export async function getChatSessionStatus(chatUserId: string) {
  const { data } = await supabase.from("chat_sessions").select("status").eq("chat_user_id", chatUserId).single();
  return data?.status || "bot";
}

export async function setChatSessionStatus(chatUserId: string, status: "bot" | "human") {
  await supabase.from("chat_sessions").update({ status, updated_at: new Date().toISOString() }).eq("chat_user_id", chatUserId);
}

export async function saveChatMessage(chatUserId: string, direction: "inbound" | "outbound", content: string, type: string = "text", imageUrl: string = "") {
  await supabase.from("chat_messages").insert([{
    chat_user_id: chatUserId,
    direction,
    message_type: type,
    content,
    image_url: imageUrl,
    delivery_status: "success"
  }]);
}
