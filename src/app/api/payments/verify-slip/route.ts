import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { resolveSlipOkConfig } from "@/lib/server/slipok-config";
import { storeBookingSlip } from "@/lib/server/slip-storage";
import { resolveTelegramConfig } from "@/lib/server/telegram-config";
import { verifySlip } from "@/lib/slipok";
import { sendTelegramPhoto } from "@/lib/telegram";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);

const MAX_SLIP_BYTES = 8 * 1024 * 1024;
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
type AllowedMimeType = "image/jpeg" | "image/png" | "image/webp";

const bookingCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^BKG-[A-HJ-NP-Z2-9]{4}$/);

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, verified: false, error: message }, { status });
}

function hasExpectedImageSignature(buffer: Buffer, mimeType: AllowedMimeType): boolean {
  if (mimeType === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (mimeType === "image/png") {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }

  return buffer.length >= 12
    && buffer.subarray(0, 4).toString("ascii") === "RIFF"
    && buffer.subarray(8, 12).toString("ascii") === "WEBP";
}

async function notifyOwnerWithSlip(
  imageBuffer: Buffer,
  mimeType: AllowedMimeType,
  bookingCode: string,
  statusLine: string,
): Promise<void> {
  const telegramConfig = resolveTelegramConfig();
  if (!telegramConfig) {
    console.warn("[TELEGRAM_NOT_CONFIGURED_FOR_SLIP]");
    return;
  }

  const caption = `🧾 <b>มีสลิปมัดจำเข้ามา</b>\n🆔 <code>${bookingCode}</code>\n${statusLine}`;
  const deliveries = await sendTelegramPhoto(
    telegramConfig.token,
    telegramConfig.chatIds,
    imageBuffer,
    mimeType,
    caption,
  );

  if (deliveries.some((delivery) => !delivery.ok)) {
    console.error("[SLIP_TELEGRAM_DELIVERY_FAILED]");
  }
}

/** POST: verify a customer's deposit slip for an existing booking. */
export async function POST(req: NextRequest) {
  try {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return errorResponse("รูปแบบคำขอไม่ถูกต้อง", 400);
    }

    const slip = formData.get("slip");
    const parsedBookingCode = bookingCodeSchema.safeParse(formData.get("bookingCode"));

    if (!(slip instanceof File) || !parsedBookingCode.success) {
      return errorResponse("กรุณาแนบสลิปและตรวจสอบรหัสการจอง", 400);
    }

    if (!allowedMimeTypes.has(slip.type) || slip.size === 0 || slip.size > MAX_SLIP_BYTES) {
      return errorResponse("รองรับเฉพาะไฟล์ JPG, PNG หรือ WebP ขนาดไม่เกิน 8 MB", 400);
    }

    const bookingCode = parsedBookingCode.data;
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, deposit_required, deposit_paid")
      .eq("booking_code", bookingCode)
      .single();

    if (bookingError || !booking) {
      return errorResponse("ไม่พบรหัสการจอง", 404);
    }

    if (booking.deposit_paid) {
      return errorResponse("การจองนี้ชำระมัดจำแล้ว", 409);
    }

    let slipOkConfig = resolveSlipOkConfig();
    if (!slipOkConfig) {
      const { data: settings, error: settingsError } = await supabase
        .from("shop_settings")
        .select("key,value")
        .in("key", ["slipok_branch_id", "slipok_api_key"]);

      if (settingsError) {
        throw new Error(`Could not load SlipOK settings: ${settingsError.message}`);
      }

      slipOkConfig = resolveSlipOkConfig(
        Object.fromEntries((settings || []).map((item) => [item.key, item.value])),
      );
    }

    if (!slipOkConfig) {
      console.error("[SLIPOK_NOT_CONFIGURED]");
      return errorResponse("ระบบตรวจสลิปยังไม่พร้อม กรุณาติดต่อร้าน", 503);
    }

    const mimeType = slip.type as AllowedMimeType;
    const imageBuffer = Buffer.from(await slip.arrayBuffer());
    if (!hasExpectedImageSignature(imageBuffer, mimeType)) {
      return errorResponse("ไฟล์ที่แนบไม่ใช่รูปภาพสลิปที่รองรับ", 400);
    }

    await storeBookingSlip(booking.id, imageBuffer, mimeType);

    const result = await verifySlip(
      imageBuffer,
      slipOkConfig.branchId,
      slipOkConfig.apiKey,
      mimeType,
    );

    if (!result.success || !result.data) {
      console.warn("[SLIPOK_VERIFICATION_REJECTED]", result.message);
      await notifyOwnerWithSlip(
        imageBuffer,
        mimeType,
        bookingCode,
        "⚠️ SlipOK ตรวจไม่ผ่าน — กรุณาตรวจสลิปด้วยตนเอง",
      );
      return errorResponse("ตรวจสอบสลิปไม่สำเร็จ กรุณาตรวจสอบภาพแล้วลองใหม่", 400);
    }

    const transactionId = result.data.transRef.trim();
    if (!transactionId) {
      console.error("[SLIPOK_MISSING_TRANSACTION_ID]");
      await notifyOwnerWithSlip(
        imageBuffer,
        mimeType,
        bookingCode,
        "⚠️ ข้อมูลจาก SlipOK ไม่สมบูรณ์ — กรุณาตรวจด้วยตนเอง",
      );
      return errorResponse("ข้อมูลสลิปไม่สมบูรณ์ กรุณาติดต่อร้าน", 502);
    }

    const { data: existingPayment, error: duplicateCheckError } = await supabase
      .from("payments")
      .select("id")
      .eq("transaction_id", transactionId)
      .limit(1)
      .maybeSingle();

    if (duplicateCheckError) {
      throw new Error(`Could not check duplicate slip: ${duplicateCheckError.message}`);
    }

    if (existingPayment) {
      await notifyOwnerWithSlip(
        imageBuffer,
        mimeType,
        bookingCode,
        "⚠️ สลิปซ้ำ — เคยใช้ยืนยันการชำระเงินแล้ว",
      );
      return errorResponse("สลิปนี้ถูกใช้ยืนยันการชำระเงินแล้ว", 409);
    }

    const requiredAmount = Number(booking.deposit_required) || 0;
    const slipAmount = result.data.amount;
    const isAmountOk = requiredAmount > 0 && slipAmount >= requiredAmount;

    const { error: paymentError } = await supabase.from("payments").insert([{
      booking_id: booking.id,
      amount: slipAmount,
      payment_type: "deposit",
      payment_status: isAmountOk ? "verified" : "pending",
      slip_verified: isAmountOk,
      transaction_id: transactionId,
      bank_info: {
        sendingBank: result.data.sendingBank,
        receivingBank: result.data.receivingBank,
        sender: result.data.sender,
      },
    }]);

    if (paymentError) {
      throw new Error(`Could not record payment: ${paymentError.message}`);
    }

    if (isAmountOk) {
      const { error: bookingUpdateError } = await supabase
        .from("bookings")
        .update({
          deposit_paid: true,
          deposit: slipAmount,
          payment_method: "promptpay",
        })
        .eq("id", booking.id)
        .eq("deposit_paid", false);

      if (bookingUpdateError) {
        throw new Error(`Could not update booking payment: ${bookingUpdateError.message}`);
      }

      const { error: transactionError } = await supabase.from("transactions").insert([{
        type: "income",
        amount: slipAmount,
        category: "มัดจำ (ลูกค้าจองเอง)",
        booking_id: booking.id,
      }]);

      if (transactionError) {
        throw new Error(`Could not record transaction: ${transactionError.message}`);
      }
    }

    await notifyOwnerWithSlip(
      imageBuffer,
      mimeType,
      bookingCode,
      isAmountOk
        ? `✅ SlipOK ยืนยันแล้ว — ฿${slipAmount.toLocaleString()}`
        : `⚠️ ยอดไม่ครบ — โอน ฿${slipAmount.toLocaleString()} / ต้อง ฿${requiredAmount.toLocaleString()}`,
    );

    return NextResponse.json({
      success: true,
      verified: isAmountOk,
      slipAmount,
      required: requiredAmount,
      message: isAmountOk
        ? "✅ ชำระมัดจำเรียบร้อยแล้ว"
        : `ยอดเงินไม่ครบ (โอน ฿${slipAmount} แต่ต้อง ฿${requiredAmount})`,
    });
  } catch (error: unknown) {
    console.error("[PAYMENT_VERIFY_ERROR]", error);
    return errorResponse("เกิดข้อผิดพลาด กรุณาลองใหม่ภายหลัง", 500);
  }
}
