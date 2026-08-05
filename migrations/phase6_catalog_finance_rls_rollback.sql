-- Emergency rollback for Phase 6A. This changes access controls only; it does not delete data.

BEGIN;

ALTER TABLE public.shop_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.services DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public can read approved shop settings" ON public.shop_settings;
DROP POLICY IF EXISTS "office users manage shop settings" ON public.shop_settings;
DROP POLICY IF EXISTS "public can read services" ON public.services;
DROP POLICY IF EXISTS "office users manage services" ON public.services;
DROP POLICY IF EXISTS "public can read current promotions" ON public.promotions;
DROP POLICY IF EXISTS "office users manage promotions" ON public.promotions;
DROP POLICY IF EXISTS "public can read active rewards" ON public.rewards;
DROP POLICY IF EXISTS "office users manage rewards" ON public.rewards;
DROP POLICY IF EXISTS "office users manage transactions" ON public.transactions;

COMMIT;
