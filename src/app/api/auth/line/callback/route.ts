import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/member?error=login_failed`);
  }

  const clientId = process.env.NEXT_PUBLIC_LINE_CLIENT_ID;
  const clientSecret = process.env.LINE_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/line/callback`;

  try {
    // 1. นำ Code ไปแลก Access Token
    const tokenResponse = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri!,
        client_id: clientId!,
        client_secret: clientSecret!,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      throw new Error("Failed to get access token");
    }

    // 2. ดึงข้อมูล Profile ของผู้ใช้ (จะให้ userId)
    const profileResponse = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileResponse.json();
    const lineUserId = profile.userId;
    const displayName = profile.displayName;

    if (!lineUserId) throw new Error("No LINE User ID found");

    // 3. เช็คว่ามีลูกค้ารายนี้ในระบบไหม (เทียบจาก line_id)
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id, phone")
      .eq("line_id", lineUserId)
      .single();

    if (existingCustomer) {
      // ลูกค้าเคยผูก LINE ไว้แล้ว -> ให้ล็อกอินสำเร็จเลย
      const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/member`);
      // บันทึก ID ลง Cookie
      response.cookies.set("customer_id", existingCustomer.id, {
        path: "/",
        httpOnly: false, // เราให้ฝั่ง Client อ่านไปแสดงผลได้
        maxAge: 60 * 60 * 24 * 30, // 30 วัน
      });
      response.cookies.set("customer_phone", existingCustomer.phone || "", { path: "/" });
      return response;
    } else {
      // ยังไม่เคยผูก LINE -> ส่งไปหน้าผูกเบอร์โทรศัพท์ (พร้อมแนบ line_id ไปชั่วคราว)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/member?link_line=${lineUserId}&name=${encodeURIComponent(displayName)}`);
    }
  } catch (err) {
    console.error("LINE Auth Error:", err);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/member?error=server_error`);
  }
}
