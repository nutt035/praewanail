/**
 * SlipOK API Wrapper
 * For automated payment slip verification.
 */

export class SlipOkApi {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.SLIPOK_API_KEY!;
    if (!this.apiKey) {
      throw new Error('SLIPOK_API_KEY is not defined in environment variables');
    }
  }

  /**
   * Verifies a payment slip image.
   * @param imageUri The LINE image content URL or binary
   * @returns Verification details if successful
   */
  async verifySlip(imageUri: string) {
    const url = 'https://api.slipok.com/api/verify';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify({
        url: imageUri, // SlipOK can take a URL to the image
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[SLIPOK_API_ERROR]:', errorData);
      throw new Error(`SlipOK API request failed: ${response.statusText}`);
    }

    return response.json();
  }
}
