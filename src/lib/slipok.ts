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
  apiKey: string
): Promise<SlipOkResult> {
  try {
    const formData = new FormData();
    const uint8 = new Uint8Array(imageBuffer);
    const blob = new Blob([uint8], { type: "image/jpeg" });
    formData.append("files", blob, "slip.jpg");

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

    const json = await res.json();

    if (json.data) {
      return {
        success: true,
        data: {
          amount: parseFloat(json.data.amount) || 0,
          transRef: json.data.transRef || "",
          sendingBank: json.data.sendingBank || "",
          receivingBank: json.data.receivingBank || "",
          transDate: json.data.transDate || "",
          transTime: json.data.transTime || "",
          sender: json.data.sender,
          receiver: json.data.receiver,
        },
      };
    }

    return { success: false, message: json.message || "Verification failed" };
  } catch (error: any) {
    return { success: false, message: error.message || "SlipOK API error" };
  }
}
