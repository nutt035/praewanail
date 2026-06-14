import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { action, bookingCode, date, time } = await req.json();

    if (!bookingCode || !action) {
      return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
    }

    // ดึงข้อมูลคิวเดิม
    const { data: booking, error: fetchErr } = await supabase
      .from("bookings")
      .select("*")
      .eq("booking_code", bookingCode)
      .single();

    if (fetchErr || !booking) {
      return NextResponse.json({ error: "ไม่พบข้อมูลคิว" }, { status: 404 });
    }

    if (booking.status === "cancelled" || booking.status === "completed") {
      return NextResponse.json({ error: "คิวนี้ถูกยกเลิกหรือเสร็จสิ้นไปแล้ว" }, { status: 400 });
    }

    const now = new Date();
    const startTime = new Date(booking.start_time);
    const hoursDiff = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    // 1. ถ้ายกเลิกคิว (Cancel)
    if (action === "cancel") {
      const { error: updateErr } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", booking.id);

      if (updateErr) throw updateErr;
      return NextResponse.json({ success: true, message: "ยกเลิกคิวสำเร็จ (สงวนสิทธิ์ไม่คืนมัดจำทุกกรณี)" });
    }

    // 2. ถ้าเลื่อนคิว (Reschedule)
    if (action === "reschedule") {
      if (hoursDiff < 24) {
        return NextResponse.json({ error: "ไม่สามารถเลื่อนคิวได้ (ต้องแจ้งล่วงหน้าอย่างน้อย 24 ชั่วโมง)" }, { status: 400 });
      }

      if (!date || !time) {
        return NextResponse.json({ error: "กรุณาระบุวันและเวลาที่ต้องการเลื่อน" }, { status: 400 });
      }

      const newStartObj = new Date(`${date}T${time}:00+07:00`);
      // ใช้ Duration 120 นาทีเป็นค่าเริ่มต้น
      const newEndObj = new Date(newStartObj.getTime() + 120 * 60 * 1000);

      const { error: updateErr } = await supabase
        .from("bookings")
        .update({
          start_time: newStartObj.toISOString(),
          end_time: newEndObj.toISOString()
        })
        .eq("id", booking.id);

      if (updateErr) throw updateErr;
      return NextResponse.json({ success: true, message: "เลื่อนคิวสำเร็จ" });
    }

    return NextResponse.json({ error: "คำสั่งไม่ถูกต้อง" }, { status: 400 });

  } catch (error: any) {
    console.error("[BOOKING_MANAGE_ERROR]:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์" }, { status: 500 });
  }
}
