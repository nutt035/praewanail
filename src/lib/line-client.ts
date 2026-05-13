/**
 * LINE Messaging API Client
 * ใช้ส่งข้อความและจัดการ webhook
 */

export class LineClient {
  private channelToken: string;

  constructor(channelToken: string) {
    this.channelToken = channelToken;
  }

  /** ส่งข้อความถึง user */
  async pushMessage(userId: string, text: string) {
    return this.pushMessages(userId, [{ type: "text", text }]);
  }

  /** ส่งหลายข้อความ */
  async pushMessages(userId: string, messages: any[]) {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.channelToken}`,
      },
      body: JSON.stringify({ to: userId, messages }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("[LINE_PUSH_ERROR]:", err);
    }
    return res.ok;
  }

  /** ส่งข้อความต้อนรับ + ขอรูปแบบเล็บ */
  async sendWelcomeDesignRequest(userId: string, customerName: string) {
    return this.pushMessages(userId, [
      {
        type: "text",
        text: `สวัสดีค่ะ คุณ${customerName}! 💅✨\n\nยืนยันการจองเรียบร้อยแล้วค่ะ\n\nตอนนี้สามารถส่ง "รูปตัวอย่างลายเล็บ" ที่ต้องการมาให้เราได้เลยนะคะ 🎨\n\nช่างจะดูรูปและแจ้งราคาขั้นสุดท้ายให้ค่ะ`,
      },
    ]);
  }

  /** ส่งแจ้งเตือนชำระเงินสำเร็จ (แก้ไขตามแบบฟอร์มใหม่) */
  async sendPaymentConfirmation(userId: string, customerName: string, phone: string, date: string, time: string) {
    return this.pushMessages(userId, [
      {
        type: "text",
        text: `ได้รับสลิปและข้อมูลเรียบร้อยค่ะ! ✅ ขอบคุณมากนะคะ\n\n📌 ยืนยันการจองคิว:\nคุณ ${customerName} | ${phone}\nวันที่: ${date}\nเวลา: ${time} น.\n\nล็อคคิวให้เรียบร้อยแล้วน้าา เตรียมมาสวยแบบสับๆ ได้เลยค่ะ! 💅✨ See you soon!`,
      },
    ]);
  }

  /** ดึง user profile */
  async getProfile(userId: string) {
    const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      headers: { Authorization: `Bearer ${this.channelToken}` },
    });
    if (!res.ok) return null;
    return res.json();
  }

  /** ดึงรูปจาก LINE message */
  async getMessageContent(messageId: string): Promise<Buffer | null> {
    const res = await fetch(
      `https://api-data.line.me/v2/bot/message/${messageId}/content`,
      { headers: { Authorization: `Bearer ${this.channelToken}` } }
    );
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
