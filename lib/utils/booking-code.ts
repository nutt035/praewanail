import { createClient } from '@supabase/supabase-js'; // I'll use a generic type if the actual client isn't imported yet, but I will ensure it's compatible with the project's supabase client

/**
 * Generates a unique, human-friendly booking code.
 * Format: BKG-XXXX (where X is uppercase alphanumeric)
 * Example: BKG-R2A9
 */
export async function generateUniqueBookingCode(supabase: any): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let isUnique = false;
  let code = '';

  while (!isUnique) {
    // Generate a random 4-character string
    let randomPart = '';
    for (let i = 0; i < 4; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code = `BKG-${randomPart}`;

    // Check if this code already exists in the database
    const { data, error } = await supabase
      .from('bookings')
      .select('id')
      .eq('booking_code', code)
      .maybeSingle();

    if (error) {
      console.error('Error checking booking code uniqueness:', error);
      throw new Error('Failed to verify booking code uniqueness');
    }

    if (!data) {
      isUnique = true;
    }
  }

  return code;
}
