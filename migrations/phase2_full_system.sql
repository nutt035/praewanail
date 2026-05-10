-- ============================================================
-- MIGRATION: Phase 2 — Full Booking System
-- รันใน Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- [P2-1] เพิ่ม booking_code + ฟิลด์ใหม่ในตาราง bookings
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS booking_code TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS deposit_required NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS design_image_url TEXT,
    ADD COLUMN IF NOT EXISTS final_price NUMERIC,
    ADD COLUMN IF NOT EXISTS has_line_linked BOOLEAN DEFAULT FALSE;

-- [P2-2] สร้างตาราง payments (ระบบชำระเงิน)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    payment_type TEXT DEFAULT 'deposit',        -- 'deposit' | 'final'
    payment_status TEXT DEFAULT 'pending',      -- 'pending' | 'verified' | 'failed'
    slip_verified BOOLEAN DEFAULT FALSE,
    transaction_id TEXT,                        -- จาก SlipOK
    bank_info JSONB DEFAULT '{}'::jsonb,        -- ข้อมูลธนาคารจาก SlipOK
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- [P2-3] สร้างตาราง line_accounts (ผูก LINE กับลูกค้า)
CREATE TABLE IF NOT EXISTS line_accounts (
    line_user_id TEXT PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    display_name TEXT,
    picture_url TEXT,
    linked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- [P2-4] Indexes
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_line_accounts_customer ON line_accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_code ON bookings(booking_code);

-- [P2-5] เพิ่ม SlipOK settings
INSERT INTO shop_settings (key, value) VALUES
    ('slipok_branch_id', ''),
    ('slipok_api_key', ''),
    ('admin_password', 'praewa1234')
ON CONFLICT (key) DO NOTHING;

-- [P2-6] เพิ่ม email ใน customers (optional)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email TEXT;
