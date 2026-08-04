/**
 * SlipOK API Client
 * ใช้ตรวจสอบสลิปการโอนเงินอัตโนมัติ
 * Docs: https://docs.slipok.com
 */

export interface SlipOkResult {
  success: boolean;
  data?: {
    amount: number;
    transRef: string;
    sendingBank: string;
    receivingBank: string;
    transDate: string;
    transTime: string;
    sender?: { displayName?: string; name?: string };
    receiver?: { displayName?: string; name?: string };
  };
  message?: string;
}

/**
 * ส่งรูปสลิปไปตรวจสอบกับ SlipOK API
 * @param imageBuffer - Buffer ของรูปสลิป
 * @param branchId - SlipOK Branch ID
 * @param apiKey - SlipOK API Key
 */
export async function verifySlip(
  imageBuffer: Buffer,
  branchId: string,
  apiKey: string,
  mimeType: "image/jpeg" | "image/png" | "image/webp" = "image/jpeg",
): Promise<SlipOkResult> {
  try {
    const formData = new FormData();
    const uint8 = new Uint8Array(imageBuffer);
    const blob = new Blob([uint8], { type: mimeType });
    const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
    formData.append("files", blob, `slip.${extension}`);

    const res = await fetch(
      `https://api.slipok.com/api/line/apikey/${branchId}`,
      {
        method: "POST",
        headers: {
          "x-authorization": apiKey,
        },
        body: formData,
      }
    );

    const json: unknown = await res.json();

    if (!json || typeof json !== "object") {
      return { success: false, message: "SlipOK returned an invalid response" };
    }

    const response = json as {
      data?: {
        amount?: string | number;
        transRef?: string;
        sendingBank?: string;
        receivingBank?: string;
        transDate?: string;
        transTime?: string;
        sender?: SlipOkResult["data"] extends infer T
          ? T extends { sender?: infer S } ? S : never
          : never;
        receiver?: SlipOkResult["data"] extends infer T
          ? T extends { receiver?: infer R } ? R : never
          : never;
      };
      message?: string;
    };

    if (res.ok && response.data) {
      return {
        success: true,
        data: {
          amount: Number(response.data.amount) || 0,
          transRef: response.data.transRef || "",
          sendingBank: response.data.sendingBank || "",
          receivingBank: response.data.receivingBank || "",
          transDate: response.data.transDate || "",
          transTime: response.data.transTime || "",
          sender: response.data.sender,
          receiver: response.data.receiver,
        },
      };
    }

    return { success: false, message: response.message || "Verification failed" };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "SlipOK API error",
    };
  }
}
