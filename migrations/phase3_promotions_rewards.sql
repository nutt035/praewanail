-- ============================================================
-- MIGRATION: Phase 3 — Flexible Rewards & Promotion Buffets
-- Run this in Supabase SQL Editor
-- ============================================================

BEGIN;

-- 1. Update Rewards table for flexible reward types
-- Rename discount_value to value to be more generic (can be %, amount, or service name)
ALTER TABLE rewards RENAME COLUMN discount_value TO value;

-- Add reward_type: 'amount' | 'percent' | 'free_service' | 'points'
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS reward_type TEXT DEFAULT 'amount';

-- Add category for better organization (e.g., 'Birthday', 'Welcome', 'Loyalty')
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS category TEXT;

-- 2. Update Promotions table for Buffet/Bundle system
-- Rename discount_type to promotion_type: 'buffet' | 'bundle' | 'discount'
ALTER TABLE promotions RENAME COLUMN discount_type TO promotion_type;

-- Rename discount_value to price (The fixed price of the buffet/bundle)
ALTER TABLE promotions RENAME COLUMN discount_value TO price;

-- Update default for promotion_type
ALTER TABLE promotions ALTER COLUMN promotion_type SET DEFAULT 'buffet';

-- 3. Update Bookings table to link to a promotion
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS promotion_id UUID REFERENCES promotions(id) ON DELETE SET NULL;

-- Create index for faster lookup
CREATE INDEX IF NOT EXISTS idx_bookings_promotion_id ON bookings(promotion_id);

COMMIT;
