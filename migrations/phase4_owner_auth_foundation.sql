-- Owner authentication foundation. Review and back up production before applying.

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

-- Insert the owner profile only after the Auth user has been created:
-- INSERT INTO public.office_profiles (user_id, email, role)
-- SELECT id, email, 'owner'
-- FROM auth.users
-- WHERE lower(email) = lower('nuttakankhu@gmail.com')
-- ON CONFLICT (user_id) DO UPDATE
-- SET email = EXCLUDED.email, role = 'owner', is_active = TRUE, updated_at = now();
