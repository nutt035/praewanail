import { createClient } from '@supabase/supabase-js';
import { generateUniqueBookingCode } from './utils/booking-code';

export interface BookingServiceInput {
  customerId?: string;
  customerDetails: {
    name: string;
    phone: string;
    email?: string;
  };
  services: {
    serviceId: string;
    quantity: number;
  }[];
  startTime: string;
  endTime: string;
  notes?: string;
  initialStatusId?: number;
  depositRequired?: number;
}

export interface BookingResult {
  bookingId: string;
  bookingCode: string;
  totalPrice: number;
  depositRequired: number;
  statusId: number;
}

export class BookingService {
  private supabase: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  async createBooking(input: BookingServiceInput): Promise<BookingResult> {
    const customerId = await this.resolveCustomer(input);
    const { servicesWithPrices, totalPrice } = await this.calculateBookingTotal(input.services);
    const bookingCode = await generateUniqueBookingCode(this.supabase);

    const { data: booking, error: bookingError } = await this.supabase
      .from('bookings')
      .insert({
        customer_id: customerId,
        booking_code: bookingCode,
        start_time: input.startTime,
        end_time: input.endTime,
        status_id: input.initialStatusId || 1,
        total_price: totalPrice,
        deposit_required: input.depositRequired || this.calculateDefaultDeposit(totalPrice),
        notes: input.notes,
      })
      .select()
      .single();

    if (bookingError) throw new Error(`Booking creation failed: ${bookingError.message}`);

    const bookingServicesData = servicesWithPrices.map((s: any) => ({
      booking_id: booking.id,
      service_id: s.id,
      unit_price: s.price,
      line_total: s.price * (input.services.find((os: any) => os.serviceId === s.id)?.quantity || 1),
      finger_count: input.services.find((os: any) => os.serviceId === s.id)?.quantity || null,
    }));

    const { error: servicesError } = await this.supabase
      .from('booking_services')
      .insert(bookingServicesData);

    if (servicesError) throw new Error(`Failed to map services to booking: ${servicesError.message}`);

    return {
      bookingId: booking.id,
      bookingCode: booking.booking_code,
      totalPrice: totalPrice,
      depositRequired: booking.deposit_required,
      statusId: booking.status_id,
    };
  }

  async linkLineAccount(lineUserId: string, bookingCode: string, profile: { displayName: string; pictureUrl: string }): Promise<{
    success: boolean;
    customerName: string;
    bookingId: string;
  }> {
    const { data: booking, error: fetchError } = await this.supabase
      .from('bookings')
      .select('id, customer_id, status_id')
      .eq('booking_code', bookingCode)
      .single();

    if (fetchError || !booking) throw new Error(`Booking code ${bookingCode} not found or invalid.`);
    if (booking.status_id !== 2) throw new Error(`This booking is not eligible for LINE linking.`);

    const { error: lineError } = await this.supabase
      .from('line_accounts')
      .upsert({
        line_user_id: lineUserId,
        customer_id: booking.customer_id,
        display_name: profile.displayName,
        picture_url: profile.pictureUrl,
        linked_at: new Date().toISOString(),
      });

    if (lineError) throw new Error(`Failed to link LINE account: ${lineError.message}`);

    await this.supabase.from('customers').update({ line_id: lineUserId }).eq('id', booking.customer_id);
    await this.supabase.from('bookings').update({ status_id: 3 }).eq('id', booking.id);

    const { data: customer } = await this.supabase.from('customers').select('name').eq('id', booking.customer_id).single();

    return {
      success: true,
      customerName: customer?.name || 'คุณลูกค้า',
      bookingId: booking.id,
    };
  }

  async processDepositPayment(bookingCode: string, transactionId: string, amount: number): Promise<{
    success: boolean;
    triggerLineNotification: boolean;
    bookingId: string;
  }> {
    const { data: booking, error: fetchError } = await this.supabase
      .from('bookings')
      .select('id, status_id, deposit_required')
      .eq('booking_code', bookingCode)
      .single();

    if (fetchError || !booking) throw new Error(`Booking not found with code: ${bookingCode}`);
    if (booking.status_id === 2) return { success: true, triggerLineNotification: false, bookingId: booking.id };
    if (booking.status_id !== 1) throw new Error(`Booking cannot be paid in current status.`);
    if (amount < booking.deposit_required) throw new Error(`Insufficient payment amount.`);

    const { error: paymentError } = await this.supabase.from('payments').insert({
      booking_id: booking.id,
      amount: amount,
      payment_type: 'deposit',
      payment_status: 'completed',
      transaction_id: transactionId,
      paid_at: new Date().toISOString(),
    });

    if (paymentError) throw new Error(`Payment recording failed: ${paymentError.message}`);

    const { error: updateError } = await this.supabase.from('bookings').update({
      status_id: 2,
      deposit_paid: true,
    }).eq('id', booking.id);

    if (updateError) throw new Error(`Status update failed: ${updateError.message}`);

    return { success: true, triggerLineNotification: true, bookingId: booking.id };
  }

  async updateDesignReference(bookingId: string, imageUrl: string): Promise<void> {
    const { error } = await this.supabase.from('bookings').update({
      design_image_url: imageUrl,
      status_id: 4
    }).eq('id', bookingId);
    if (error) throw new Error(`Failed to update design reference: ${error.message}`);
  }

  /**
   * Admin: Finalizes the price after reviewing the nail design.
   */
  async confirmFinalPrice(bookingId: string, finalPrice: number, adminNotes?: string): Promise<void> {
    const { data: booking, error: fetchError } = await this.supabase
      .from('bookings')
      .select('status_id')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) throw new Error('Booking not found');
    if (![2, 3].includes(booking.status_id)) throw new Error(`Cannot confirm price for current status.`);

    const { error: updateError } = await this.supabase
      .from('bookings')
      .update({
        final_price: finalPrice,
        status_id: 4,
        design_notes: adminNotes,
      })
      .eq('id', bookingId);

    if (updateError) throw new Error(`Failed to confirm final price: ${updateError.message}`);
  }

  /**
   * Admin: Updates booking status with strict transition rules.
   */
  async updateBookingStatus(bookingId: string, newStatusId: number): Promise<void> {
    const { data: booking, error: fetchError } = await this.supabase
      .from('bookings')
      .select('status_id')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) throw new Error('Booking not found');

    const currentStatus = booking.status_id;
    const rules: Record<number, number[]> = {
      1: [2, 7], 2: [3, 7], 3: [4, 7], 4: [5, 7], 5: [6, 7], 6: [], 7: [],
    };

    if (! (rules[currentStatus] || []).includes(newStatusId)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatusId}`);
    }

    const { error: updateError } = await this.supabase
      .from('bookings')
      .update({ status_id: newStatusId })
      .eq('id', bookingId);

    if (updateError) throw new Error(`Failed to update status: ${updateError.message}`);
  }

  private async resolveCustomer(input: BookingServiceInput): Promise<string> {
    const { data: existing = [], error } = await this.supabase.from('customers').select('id').eq('phone', input.customerDetails.phone).limit(1);
    if (error) throw new Error(`Customer lookup failed: ${error.message}`);
    if (existing.length > 0) return existing[0].id;

    const { data: newCustomer, error: createError } = await this.supabase.from('customers').insert({
      name: input.customerDetails.name,
      phone: input.customerDetails.phone,
      email: input.customerDetails.email,
    }).select().single();
    if (createError) throw new Error(`Customer creation failed: ${createError.message}`);
    return newCustomer.id;
  }

  private async calculateBookingTotal(selectedServices: { serviceId: string, quantity: number }[]) {
    const serviceIds = selectedServices.map(s => s.serviceId);
    const { data: services = [], error } = await this.supabase.from('services').select('id, price').in('id', serviceIds);
    if (error) throw new Error(`Service price lookup failed: ${error.message}`);

    let totalPrice = 0;
    const servicesWithPrices = services.map((s: any) => {
      const selection = selectedServices.find((ss: any) => ss.serviceId === s.id);
      const qty = selection?.quantity || 1;
      totalPrice += (s.price * qty);
      return { ...s, quantity: qty };
    });

    return { servicesWithPrices, totalPrice };
  }

  private calculateDefaultDeposit(total: number): number {
    const deposit = total * 0.2;
    return Math.max(100, Math.ceil(deposit / 10) * 10);
  }
}
