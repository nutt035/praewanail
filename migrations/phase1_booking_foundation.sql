-- PHASE 1: Booking Foundation Migration
-- This script evolves the prototype schema to a production-ready booking system.

BEGIN;

-- 1. Create booking_statuses lookup table
CREATE TABLE booking_statuses (
    id INT PRIMARY KEY,
    status_name TEXT UNIQUE NOT NULL,
    description TEXT
);

INSERT INTO booking_statuses (id, status_name, description) VALUES
(1, 'Pending Deposit', 'Booking created, waiting for deposit payment'),
(2, 'Deposit Paid', 'Deposit received, waiting for nail design reference'),
(3, 'Waiting Design', 'Customer notified to send design via LINE'),
(4, 'Price Confirmed', 'Admin reviewed design and set final price'),
(5, 'Confirmed', 'Booking fully confirmed and scheduled'),
(6, 'Completed', 'Service provided and final payment settled'),
(7, 'Cancelled', 'Booking cancelled');

-- 2. Create line_accounts table
CREATE TABLE line_accounts (
    line_user_id TEXT PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    display_name TEXT,
    picture_url TEXT,
    linked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    CONSTRAINT unique_customer_line UNIQUE (customer_id)
);

-- 3. Create payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    payment_type TEXT CHECK (payment_type IN ('deposit', 'final_payment')),
    payment_status TEXT CHECK (payment_status IN ('pending', 'completed', 'failed')),
    transaction_id TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 4. Update services table
ALTER TABLE services ADD COLUMN IF NOT EXISTS description TEXT;

-- 5. Update customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email TEXT;

-- 6. Evolve bookings table
-- We need to change 'status' from TEXT to INT to reference booking_statuses.
-- Since we cannot change type directly if data exists, we add a new column,
-- migrate data, and then drop the old one.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status_id INT REFERENCES booking_statuses(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_code TEXT UNIQUE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_required NUMERIC DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS design_image_url TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS design_notes TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now());

-- Remove the old prototype service_id as it is now handled by booking_services
ALTER TABLE bookings DROP COLUMN IF EXISTS service_id;

-- 7. Standardize booking_services
-- Ensure price_at_booking is present for historical accuracy
ALTER TABLE booking_services ADD COLUMN IF NOT EXISTS price_at_booking NUMERIC;

-- Update trigger for updated_at on bookings
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

COMMIT;
