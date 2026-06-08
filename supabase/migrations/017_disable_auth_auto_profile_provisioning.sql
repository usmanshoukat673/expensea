-- Authentication hardening: Expensea accounts must be created explicitly by signup.
-- Do not auto-provision application profiles from arbitrary auth.users inserts.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Deprecated for Expensea login/session flows. Profiles are created explicitly by the signup server action.';
