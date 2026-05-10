/**
 * PromptPay QR Payload Generator
 * สร้าง EMVCo QR payload สำหรับ PromptPay
 */

function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) crc = (crc << 1) ^ 0x1021;
      else crc <<= 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function tlv(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

/**
 * สร้าง PromptPay QR payload
 * @param promptPayId - เบอร์โทรหรือเลขบัตรประชาชน
 * @param amount - จำนวนเงิน (ไม่ระบุ = QR แบบไม่กำหนดจำนวน)
 */
export function generatePromptPayPayload(promptPayId: string, amount?: number): string {
  const sanitized = promptPayId.replace(/[^0-9]/g, "");
  const isPhone = sanitized.length <= 10;

  let formattedId: string;
  if (isPhone) {
    // แปลง 0XX... เป็น 0066XX...
    formattedId = "0066" + sanitized.substring(1);
  } else {
    formattedId = sanitized;
  }

  const idType = isPhone ? "01" : "02";

  // Merchant Account Information (ID: 29)
  const merchantData =
    tlv("00", "A000000677010111") + // AID for PromptPay
    tlv(idType, formattedId);       // Phone or National ID

  let payload = "";
  payload += tlv("00", "01");                    // Payload Format Indicator
  payload += tlv("01", "12");                    // Point of Initiation (Dynamic)
  payload += tlv("29", merchantData);            // Merchant Account Info
  payload += tlv("53", "764");                   // Currency (THB)

  if (amount && amount > 0) {
    payload += tlv("54", amount.toFixed(2));      // Transaction Amount
  }

  payload += tlv("58", "TH");                   // Country Code
  payload += "6304";                             // CRC placeholder

  const checksum = crc16(payload);
  return payload.slice(0, -4) + "6304" + checksum;
}
