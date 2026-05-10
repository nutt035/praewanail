import { createClient } from "@supabase/supabase-js";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(): string {
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return `BKG-${code}`;
}

/** สร้าง booking code ที่ไม่ซ้ำ */
export async function generateUniqueBookingCode(supabase: any): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomCode();
    const { data } = await supabase
      .from("bookings")
      .select("id")
      .eq("booking_code", code)
      .limit(1);
    if (!data || data.length === 0) return code;
  }
  // Fallback: timestamp-based
  return `BKG-${Date.now().toString(36).toUpperCase().slice(-4)}`;
}
