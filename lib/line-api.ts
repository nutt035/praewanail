/**
 * LINE Messaging API Wrapper
 * Designed for Vercel Serverless functions.
 */

export class LineApi {
  private channelAccessToken: string;

  constructor() {
    this.channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN!;
    if (!this.channelAccessToken) {
      throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not defined in environment variables');
    }
  }

  /**
   * Sends a push message to a specific LINE user.
   */
  async pushMessage(userId: string, text: string) {
    const url = 'https://api.line.me/v2/bot/message/push';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.channelAccessToken}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [
          {
            type: 'text',
            text: text,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[LINE_API_ERROR]:', errorData);
      throw new Error(`LINE API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Sends a "Welcome" message with specific instructions for nail design.
   */
  async sendWelcomeDesignRequest(userId: string, customerName: string) {
    const message = `สวัสดีค่ะ คุณ${customerName} ✨\n\nขอบคุณที่ชำระเงินมัดจำเรียบร้อยแล้วค่ะ เพื่อให้ช่างประเมินราคาที่แม่นยำที่สุด\n\nรบกวนส่ง "รูปตัวอย่างลายเล็บ" ที่ต้องการให้เราได้เลยนะคะ 💅\n\nหากมีจุดไหนที่ต้องการเน้นเป็นพิเศษ แจ้งเพิ่มเติมได้เลยค่ะ!`;
    return this.pushMessage(userId, message);
  }
}
