import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateUniqueBookingCode } from "@/lib/booking-code";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

/** POST: สร้างการจองใหม่จากลูกค้า */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerName, phone, email, services: selectedServices, date, startTime, notes } = body;

    if (!customerName || !phone || !selectedServices?.length || !date || !startTime) {
      return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });
    }

    // 1. หาหรือสร้าง customer
    let customerId: string;
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", phone)
      .limit(1);

    if (existing && existing.length > 0) {
      customerId = existing[0].id;
    } else {
      const { data: newCust, error: custErr } = await supabase
        .from("customers")
        .insert([{ name: customerName, phone, email: email || null }])
        .select()
        .single();
      if (custErr || !newCust) {
        return NextResponse.json({ error: "ไม่สามารถสร้างข้อมูลลูกค้าได้" }, { status: 500 });
      }
      customerId = newCust.id;
    }

    // 2. ดึงข้อมูลบริการ
    const serviceIds = selectedServices.map((s: any) => s.id);
    const { data: svcData } = await supabase
      .from("services")
      .select("*")
      .in("id", serviceIds);

    if (!svcData || svcData.length === 0) {
      return NextResponse.json({ error: "ไม่พบบริการที่เลือก" }, { status: 400 });
    }

    // 3. คำนวณเวลารวม (ไม่คิดราคา แอดมินใส่เองตอนปิดคิว)
    let totalDuration = 0;
    const bookingServiceRows: any[] = [];

    for (const sel of selectedServices) {
      const svc = svcData.find((s: any) => s.id === sel.id);
      if (!svc) continue;
      totalDuration += svc.duration;
      bookingServiceRows.push({
        service_id: svc.id,
        service_name: svc.name,
        finger_count: null,
        unit_price: 0,
        line_total: 0,
      });
    }

    // 4. สร้าง booking
    // ใช้ +07:00 offset เพื่อให้ server (Vercel UTC) แปลงเวลาออกเป็นเวลาไทยถูกต้อง
    const startObj = new Date(`${date}T${startTime}:00+07:00`);
    const endObj = new Date(startObj.getTime() + (totalDuration || 60) * 60 * 1000);

    const bookingCode = await generateUniqueBookingCode(supabase);
    const DEPOSIT_AMOUNT = 50; // มัดจำตายตัวทุกคน

    const { data: booking, error: bookErr } = await supabase
      .from("bookings")
      .insert([{
        customer_id: customerId,
        start_time: startObj.toISOString(),
        end_time: endObj.toISOString(),
        status: "pending",
        total_price: 0,
        booking_code: bookingCode,
        deposit_required: DEPOSIT_AMOUNT,
        deposit_paid: false,
        deposit: 0,
        notes: notes || null,
        discount_amount: 0,
        discount_type: "amount",
        is_practice_model: false,
        material_cost: 0,
        has_line_linked: false,
      }])
      .select()
      .single();

    if (bookErr || !booking) {
      const errMsg = bookErr?.message || "unknown";
      console.error("[BOOKING_INSERT_ERROR]:", errMsg);
      // ถ้า column ไม่มี (migration ยังไม่รัน)
      if (errMsg.includes("column") || errMsg.includes("does not exist")) {
        return NextResponse.json({
          error: "โครงสร้างฐานข้อมูลยังไม่อัพเดต กรุณารันไฟล์ migrations/phase2_full_system.sql ใน Supabase ก่อน"
        }, { status: 500 });
      }
      return NextResponse.json({ error: `ไม่สามารถสร้างการจองได้: ${errMsg}` }, { status: 500 });
    }

    // 5. สร้าง booking services
    const bsRows = bookingServiceRows.map(r => ({ ...r, booking_id: booking.id }));
    await supabase.from("booking_services").insert(bsRows);

    // 6. แจ้งเตือนแอดมินผ่าน LINE
    try {
      const { data: settingsRows } = await supabase
        .from("shop_settings")
        .select("key, value")
        .in("key", ["line_channel_token", "admin_line_uid"]);

      const cfg: Record<string, string> = {};
      (settingsRows || []).forEach((s: any) => { cfg[s.key] = s.value; });

      if (cfg.line_channel_token && cfg.admin_line_uid) {
        const svcNames = bookingServiceRows.map(r => r.service_name).join(", ");
        const thDate = new Date(`${date}T${startTime}:00+07:00`);
        const dateStr = thDate.toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short" });
        const timeStr = thDate.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
        const message = `💅 คิวใหม่! (Online)\n\n👤 ${customerName}\n📞 ${phone}\n\u2702️ ${svcNames}\n📅 ${dateStr} ${timeStr} น.\n🆔 ${bookingCode}\n\n✨ ยืนยันคิวในหน้า Calendar ได้เลยค่ะ`;

        await fetch("https://api.line.me/v2/bot/message/push", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${cfg.line_channel_token}`,
          },
          body: JSON.stringify({
            to: cfg.admin_line_uid,
            messages: [{ type: "text", text: message }],
          }),
        });
      }
    } catch (lineErr) {
      console.error("[LINE_NOTIFY_ERROR]:", lineErr); // ไม่ให้ผิดพลาด booking flow
    }

    return NextResponse.json({
      success: true,
      bookingCode,
      bookingId: booking.id,
      depositRequired: DEPOSIT_AMOUNT,
    }, { status: 201 });

  } catch (error: any) {
    console.error("[BOOKING_API_ERROR]:", error);
    return NextResponse.json({ error: error.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

/** GET: ดึงข้อมูลจอง by code */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

  const { data, error } = await supabase
    .from("bookings")
    .select("*, customers(*), booking_services(*, services(name, category))")
    .eq("booking_code", code)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "ไม่พบการจอง" }, { status: 404 });
  }

  return NextResponse.json({ booking: data });
}
