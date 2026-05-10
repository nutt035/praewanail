import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifySlip } from "@/lib/slipok";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

/**
 * POST: อัพโหลดสลิปเพื่อยืนยันการชำระเงิน
 * Body: FormData with 'slip' (image file) and 'bookingCode' (string)
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const slip = formData.get("slip") as File | null;
    const bookingCode = formData.get("bookingCode") as string;

    if (!slip || !bookingCode) {
      return NextResponse.json({ error: "กรุณาแนบสลิปและรหัสการจอง" }, { status: 400 });
    }

    // 1. ดึง booking
    const { data: booking, error: fetchErr } = await supabase
      .from("bookings")
      .select("id, deposit_required, deposit_paid, status, customer_id")
      .eq("booking_code", bookingCode)
      .single();

    if (fetchErr || !booking) {
      return NextResponse.json({ error: "ไม่พบรหัสการจอง" }, { status: 404 });
    }

    if (booking.deposit_paid) {
      return NextResponse.json({ error: "ชำระมัดจำแล้ว" }, { status: 400 });
    }

    // 2. ดึง SlipOK settings
    const { data: settings } = await supabase
      .from("shop_settings")
      .select("key, value")
      .in("key", ["slipok_branch_id", "slipok_api_key"]);

    const settingsMap: Record<string, string> = {};
    (settings || []).forEach((s: any) => { settingsMap[s.key] = s.value; });

    const branchId = settingsMap.slipok_branch_id;
    const apiKey = settingsMap.slipok_api_key;

    if (!branchId || !apiKey) {
      // ไม่มี SlipOK → บันทึกแบบ manual (admin ตรวจเอง)
      await supabase.from("payments").insert([{
        booking_id: booking.id,
        amount: booking.deposit_required,
        payment_type: "deposit",
        payment_status: "pending",
        slip_verified: false,
      }]);

      return NextResponse.json({
        success: true,
        verified: false,
        message: "อัพโหลดสลิปเรียบร้อย รอแอดมินตรวจสอบ",
      });
    }

    // 3. ส่งสลิปไป SlipOK
    const arrayBuffer = await slip.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);
    const result = await verifySlip(imageBuffer, branchId, apiKey);

    if (!result.success || !result.data) {
      await supabase.from("payments").insert([{
        booking_id: booking.id,
        amount: 0,
        payment_type: "deposit",
        payment_status: "failed",
        slip_verified: false,
      }]);

      return NextResponse.json({
        success: false,
        verified: false,
        message: result.message || "สลิปไม่ถูกต้อง กรุณาลองใหม่",
      }, { status: 400 });
    }

    // 4. ตรวจยอดเงิน
    const slipAmount = result.data.amount;
    const isAmountOk = slipAmount >= booking.deposit_required;

    // 5. บันทึก payment
    await supabase.from("payments").insert([{
      booking_id: booking.id,
      amount: slipAmount,
      payment_type: "deposit",
      payment_status: isAmountOk ? "verified" : "pending",
      slip_verified: isAmountOk,
      transaction_id: result.data.transRef,
      bank_info: {
        sendingBank: result.data.sendingBank,
        receivingBank: result.data.receivingBank,
        sender: result.data.sender,
      },
    }]);

    // 6. อัพเดต booking ถ้ายอดถูกต้อง
    if (isAmountOk) {
      await supabase.from("bookings").update({
        deposit_paid: true,
        deposit: slipAmount,
        payment_method: "promptpay",
      }).eq("id", booking.id);

      // บันทึก transaction
      await supabase.from("transactions").insert([{
        type: "income",
        amount: slipAmount,
        category: "มัดจำ (ลูกค้าจองเอง)",
        booking_id: booking.id,
      }]);
    }

    return NextResponse.json({
      success: true,
      verified: isAmountOk,
      slipAmount,
      required: booking.deposit_required,
      message: isAmountOk
        ? "✅ ชำระมัดจำเรียบร้อยแล้ว!"
        : `ยอดเงินไม่ตรง (โอน ฿${slipAmount} แต่ต้อง ฿${booking.deposit_required})`,
    });

  } catch (error: any) {
    console.error("[PAYMENT_VERIFY_ERROR]:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
