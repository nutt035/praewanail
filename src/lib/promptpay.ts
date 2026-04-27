/**
 * ฟังก์ชันสำหรับสร้าง Payload ของ PromptPay QR Code (EMVCo Standard)
 * อ้างอิงจาก: https://github.com/dtinth/promptpay-qr
 */

function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    let x = ((crc >> 8) ^ data.charCodeAt(i)) & 0xff;
    x ^= x >> 4;
    crc = ((crc << 8) ^ (x << 12) ^ (x << 5) ^ x) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function f(id: string, value: string): string {
  return id + value.length.toString().padStart(2, "0") + value;
}

export function generatePromptPayPayload(id: string, amount?: number): string {
  const sanitizedId = id.replace(/[- ]/g, "");
  let target = "";
  
  if (sanitizedId.length >= 13) {
    // ID Card / Tax ID
    target = f("01", sanitizedId);
  } else {
    // Phone number: convert 08x-xxx-xxxx to 00668xxxxxxxx
    const mobileNumber = sanitizedId.replace(/^0/, "66");
    target = f("02", mobileNumber.padStart(13, "0"));
  }

  const data = [
    f("00", "01"), // Payload Format Indicator
    f("01", "11"), // Point of Initiation Method (11: Static, 12: Dynamic)
    f("29", f("00", "0677010111") + target), // Merchant Account Information (PromptPay)
    f("53", "764"), // Transaction Currency (764: THB)
    amount ? f("54", amount.toFixed(2)) : "", // Transaction Amount
    f("58", "TH"), // Country Code
  ].join("");

  const checksumData = data + "6304";
  return checksumData + crc16(checksumData);
}
