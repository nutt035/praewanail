-- Audit foundation and payment idempotency.
-- Apply only after confirming the owner exists in auth.users.

BEGIN;

CREATE TABLE IF NOT EXISTS public.office_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'staff')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.office_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "office users can read own profile" ON public.office_profiles;
CREATE POLICY "office users can read own profile"
ON public.office_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id AND is_active = TRUE);

REVOKE ALL ON TABLE public.office_profiles FROM anon, authenticated;
GRANT SELECT ON TABLE public.office_profiles TO authenticated;

INSERT INTO public.office_profiles (user_id, email, role)
SELECT id, email, 'owner'
FROM auth.users
WHERE lower(email) = lower('nuttakankhu@gmail.com')
ON CONFLICT (user_id) DO UPDATE
SET email = EXCLUDED.email,
    role = 'owner',
    is_active = TRUE,
    updated_at = now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.office_profiles
    WHERE lower(email) = lower('nuttakankhu@gmail.com')
      AND role = 'owner'
      AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Owner profile was not created';
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('owner', 'staff', 'agent', 'system', 'customer')),
  actor_email TEXT,
  action TEXT NOT NULL CHECK (length(action) BETWEEN 1 AND 120),
  entity_type TEXT CHECK (entity_type IS NULL OR length(entity_type) BETWEEN 1 AND 80),
  entity_id TEXT,
  before_data JSONB,
  after_data JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  correlation_id UUID NOT NULL DEFAULT gen_random_uuid(),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx
  ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx
  ON public.audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx
  ON public.audit_logs (actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_correlation_idx
  ON public.audit_logs (correlation_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "active office users can read audit logs" ON public.audit_logs;
CREATE POLICY "active office users can read audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.office_profiles profile
    WHERE profile.user_id = auth.uid()
      AND profile.is_active = TRUE
  )
);

REVOKE ALL ON TABLE public.audit_logs FROM anon, authenticated;
GRANT SELECT ON TABLE public.audit_logs TO authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS payments_transaction_id_unique_idx
  ON public.payments (transaction_id)
  WHERE transaction_id IS NOT NULL AND btrim(transaction_id) <> '';

COMMIT;
