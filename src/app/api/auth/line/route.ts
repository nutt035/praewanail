import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_LINE_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/line/callback`;
  
  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: "Missing LINE credentials" }, { status: 500 });
  }

  // สร้าง URL สำหรับให้ลูกค้าล็อกอิน
  // bot_prompt=aggressive คือตัวบังคับให้ขึ้นหน้าจอ "เพิ่มเพื่อน" แบบชัดเจน
  const lineAuthUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=praewanail123&scope=profile%20openid&bot_prompt=aggressive`;

  return NextResponse.redirect(lineAuthUrl);
}
