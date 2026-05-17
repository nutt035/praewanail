import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateUniqueBookingCode } from "@/lib/booking-code";
import { Promotion, Service } from "@/lib/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

/** POST: สร้างการจองใหม่จากลูกค้า */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customerName,
      phone,
      email,
      services: selectedServices = [],
      date,
      startTime,
      notes,
      promotionId
    } = body;

    if (!customerName || !phone || (!selectedServices.length && !promotionId) || !date || !startTime) {
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

    // 2. ดึงข้อมูลบริการที่เลือก
    const serviceIds = selectedServices.map((s: any) => s.id);
    const { data: svcData } = await supabase
      .from("services")
      .select("*")
      .in("id", serviceIds);

    if (!svcData || svcData.length === 0) {
      return NextResponse.json({ error: "ไม่พบบริการที่เลือก" }, { status: 400 });
    }

    // 3. คำนวณราคาและเวลา
    let totalPrice = 0;
    let totalDuration = 0;
    const bookingServiceRows: any[] = [];

    // ตรวจสอบว่าใช้โปรโมชั่นแบบ Buffet หรือไม่
    let activePromotion: Promotion | null = null;
    if (promotionId) {
      const { data: promo } = await supabase
        .from("promotions")
        .select("*")
        .eq("id", promotionId)
        .single();
      activePromotion = promo;
    }

    const isBuffet = activePromotion?.promotion_type === "buffet";

    if (isBuffet && activePromotion) {
      totalPrice = activePromotion.price; // เริ่มต้นด้วยราคาเหมา
    }

    for (const sel of selectedServices) {
      const svc = svcData.find((s: any) => s.id === sel.id);
      if (!svc) continue;

      totalDuration += svc.duration;

      let itemPrice = svc.price;

      // ถ้าเป็น Buffet: ตรวจสอบว่าบริการนี้ "ไม่อยู่ในโปร" (ต้องจ่ายเพิ่ม) หรือไม่
      if (isBuffet && activePromotion) {
        const excludedIds = activePromotion.excluded_service_ids || [];
        if (excludedIds.includes(svc.id)) {
          // เป็นบริการพิเศษที่ต้องจ่ายเพิ่ม
          itemPrice = svc.price;
          totalPrice += itemPrice;
        } else {
          // อยู่ในบุฟเฟต์ -> ราคาเป็น 0 ในรายการย่อย
          itemPrice = 0;
        }
      }

      bookingServiceRows.push({
        service_id: svc.id,
        service_name: svc.name,
        finger_count: null,
        unit_price: itemPrice,
        line_total: itemPrice,
      });
    }

    // 4. สร้าง booking
    const startObj = new Date(`${date}T${startTime}:00+07:00`);
    const endObj = new Date(startObj.getTime() + (totalDuration || 60) * 60 * 1000);

    const bookingCode = await generateUniqueBookingCode(supabase);
    const DEPOSIT_AMOUNT = 50;

    const { data: booking, error: bookErr } = await supabase
      .from("bookings")
      .insert([{
        customer_id: customerId,
        start_time: startObj.toISOString(),
        end_time: endObj.toISOString(),
        status: "pending",
        total_price: totalPrice,
        promotion_id: promotionId || null,
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
      return NextResponse.json({ error: `ไม่สามารถสร้างการจองได้: ${errMsg}` }, { status: 500 });
    }

    // 5. สร้าง booking services
    const bsRows = bookingServiceRows.map(r => ({ ...r, booking_id: booking.id }));
    await supabase.from("booking_services").insert(bsRows);

    // 6. แจ้งเตือนแอดมินผ่าน /api/notify (Dispatcher)
    try {
      const svcNames = bookingServiceRows.map(r => r.service_name).join(", ");
      const thDate = new Date(`${date}T${startTime}:00+07:00`);
      const dateStr = thDate.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", weekday: "short", day: "numeric", month: "short" });
      const timeStr = thDate.toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });

      const promoText = activePromotion ? `\n🎁 โปรโมชั่น: ${activePromotion.title}` : "";
      const message = `💅 <b>คิวใหม่! (Online)</b>\n\n👤 ${customerName}\n📞 ${phone}${promoText}\n✂️ ${svcNames}\n📅 ${dateStr} ${timeStr} น.\n🆔 ${bookingCode}\n\n✨ <i>ยืนยันคิวในหน้าระบบได้เลยค่ะ</i>`;

      // เรียกใช้ notify route ภายใน server
      await fetch(new URL("/api/notify", req.url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, imageUrl: null })
      });
    } catch (notifyErr) {
      console.error("[NOTIFY_ERROR]:", notifyErr);
    }

    return NextResponse.json({
      success: true,
      bookingCode,
      bookingId: booking.id,
      depositRequired: DEPOSIT_AMOUNT,
      totalPrice,
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
