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

    // 3. คำนวณราคาและเวลา
    let totalPrice = 0;
    let totalDuration = 0;
    const bookingServiceRows: any[] = [];

    for (const sel of selectedServices) {
      const svc = svcData.find((s: any) => s.id === sel.id);
      if (!svc) continue;
      const qty = sel.fingerCount || 1;
      const unitPrice = svc.price_per_finger != null ? svc.price_per_finger : svc.price;
      const lineTotal = svc.price_per_finger != null ? unitPrice * qty : unitPrice;
      totalPrice += lineTotal;
      totalDuration += svc.duration;
      bookingServiceRows.push({
        service_id: svc.id,
        service_name: svc.name,
        finger_count: svc.price_per_finger != null ? qty : null,
        unit_price: unitPrice,
        line_total: lineTotal,
      });
    }

    // 4. สร้าง booking
    const [year, month, day] = date.split("-").map(Number);
    const [hour, min] = startTime.split(":").map(Number);
    const startObj = new Date(year, month - 1, day, hour, min);
    const endObj = new Date(startObj.getTime() + (totalDuration || 60) * 60 * 1000);

    const bookingCode = await generateUniqueBookingCode(supabase);
    const depositRequired = totalPrice <= 200
      ? totalPrice  // ยอดน้อย จ่ายเต็ม
      : Math.min(totalPrice, Math.max(100, Math.ceil(totalPrice * 0.3 / 10) * 10)); // 30% มัดจำ

    const { data: booking, error: bookErr } = await supabase
      .from("bookings")
      .insert([{
        customer_id: customerId,
        start_time: startObj.toISOString(),
        end_time: endObj.toISOString(),
        status: "pending",
        total_price: totalPrice,
        booking_code: bookingCode,
        deposit_required: depositRequired,
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

    return NextResponse.json({
      success: true,
      bookingCode,
      bookingId: booking.id,
      totalPrice,
      depositRequired,
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
