-- Phase 6A: protect public catalog settings and finance data.
-- Apply only after exporting these five tables and confirming the owner profile exists.

BEGIN;

CREATE OR REPLACE FUNCTION public.is_active_office_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.office_profiles AS profile
    WHERE profile.user_id = auth.uid()
      AND profile.is_active = TRUE
      AND profile.role IN ('owner', 'staff')
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_office_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_office_user() TO anon, authenticated;

DO $$
BEGIN
  IF NOT public.is_active_office_user() THEN
    -- SQL Editor runs as postgres and has no auth.uid(), so verify the owner directly.
    IF NOT EXISTS (
      SELECT 1
      FROM public.office_profiles
      WHERE lower(email) = lower('nuttakankhu@gmail.com')
        AND role = 'owner'
        AND is_active = TRUE
    ) THEN
      RAISE EXCEPTION 'Active owner profile is missing';
    END IF;
  END IF;
END
$$;

ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public can read approved shop settings" ON public.shop_settings;
CREATE POLICY "public can read approved shop settings"
ON public.shop_settings
FOR SELECT
TO anon
USING (
  key = ANY (ARRAY[
    'open_time', 'close_time',
    'weekday_open_time', 'weekday_close_time',
    'weekend_open_time', 'weekend_close_time',
    'closed_weekdays', 'closed_dates',
    'weekday_max_bookings', 'weekend_max_bookings', 'max_bookings_per_day',
    'deposit_amount', 'booking_policy', 'cancellation_policy', 'walk_in_policy', 'repair_policy',
    'shop_name', 'shop_phone', 'shop_line_id', 'shop_ig', 'shop_fb',
    'points_per_booking', 'points_rate_amount', 'membership_tiers',
    'redeem_5_points_value', 'redeem_10_points_value',
    'ai_pricing_rules', 'promptpay_id', 'gallery_images'
  ]::text[])
);

DROP POLICY IF EXISTS "office users manage shop settings" ON public.shop_settings;
CREATE POLICY "office users manage shop settings"
ON public.shop_settings
FOR ALL
TO authenticated
USING (public.is_active_office_user())
WITH CHECK (public.is_active_office_user());

DROP POLICY IF EXISTS "public can read services" ON public.services;
CREATE POLICY "public can read services"
ON public.services
FOR SELECT
TO anon
USING (TRUE);

DROP POLICY IF EXISTS "office users manage services" ON public.services;
CREATE POLICY "office users manage services"
ON public.services
FOR ALL
TO authenticated
USING (public.is_active_office_user())
WITH CHECK (public.is_active_office_user());

DROP POLICY IF EXISTS "public can read current promotions" ON public.promotions;
CREATE POLICY "public can read current promotions"
ON public.promotions
FOR SELECT
TO anon
USING (
  is_active = TRUE
  AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
  AND (valid_to IS NULL OR valid_to >= CURRENT_DATE)
);

DROP POLICY IF EXISTS "office users manage promotions" ON public.promotions;
CREATE POLICY "office users manage promotions"
ON public.promotions
FOR ALL
TO authenticated
USING (public.is_active_office_user())
WITH CHECK (public.is_active_office_user());

DROP POLICY IF EXISTS "public can read active rewards" ON public.rewards;
CREATE POLICY "public can read active rewards"
ON public.rewards
FOR SELECT
TO anon
USING (is_active = TRUE);

DROP POLICY IF EXISTS "office users manage rewards" ON public.rewards;
CREATE POLICY "office users manage rewards"
ON public.rewards
FOR ALL
TO authenticated
USING (public.is_active_office_user())
WITH CHECK (public.is_active_office_user());

DROP POLICY IF EXISTS "office users manage transactions" ON public.transactions;
CREATE POLICY "office users manage transactions"
ON public.transactions
FOR ALL
TO authenticated
USING (public.is_active_office_user())
WITH CHECK (public.is_active_office_user());

REVOKE ALL ON TABLE public.shop_settings, public.services, public.promotions, public.rewards, public.transactions
FROM anon, authenticated;

GRANT SELECT ON TABLE public.shop_settings, public.services, public.promotions, public.rewards
TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON TABLE public.shop_settings, public.services, public.promotions, public.rewards
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.transactions
TO authenticated;

COMMIT;
