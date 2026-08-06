import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";

export async function getOrCreateChatUser(
  platform: string,
  platformUserId: string,
  displayName = "ลูกค้า",
  pictureUrl = "",
) {
  const supabase = createSupabaseAdminClient();
  const { data: existing } = await supabase.from("chat_users").select("id")
    .eq("platform_user_id", platformUserId).maybeSingle();

  if (existing) {
    await supabase.from("chat_users").update({
      last_active: new Date().toISOString(), display_name: displayName, picture_url: pictureUrl,
    }).eq("id", existing.id);
    return existing.id;
  }

  const { data: newUser, error } = await supabase.from("chat_users").insert({
    platform, platform_user_id: platformUserId, display_name: displayName, picture_url: pictureUrl,
  }).select("id").single();
  if (error || !newUser) return null;

  await supabase.from("chat_sessions").insert({ chat_user_id: newUser.id, status: "bot" });
  return newUser.id;
}

export async function getChatSessionStatus(chatUserId: string) {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.from("chat_sessions").select("status")
    .eq("chat_user_id", chatUserId).maybeSingle();
  return data?.status || "bot";
}

export async function setChatSessionStatus(chatUserId: string, status: "bot" | "human") {
  const supabase = createSupabaseAdminClient();
  await supabase.from("chat_sessions").update({ status, updated_at: new Date().toISOString() })
    .eq("chat_user_id", chatUserId);
}

export async function saveChatMessage(
  chatUserId: string,
  direction: "inbound" | "outbound",
  content: string,
  type = "text",
  imageUrl = "",
) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("chat_messages").insert({
    chat_user_id: chatUserId, direction, message_type: type, content,
    image_url: imageUrl, delivery_status: "success",
  });
  if (error) throw error;
}
