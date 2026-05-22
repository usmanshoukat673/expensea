-- Expensea — full schema (idempotent). Safe to re-run in SQL Editor or via supabase db push.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
  CREATE TYPE team_role AS ENUM ('owner', 'admin', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('paid', 'unpaid');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE profile_status AS ENUM ('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'PKR',
  ADD COLUMN IF NOT EXISTS brand_name TEXT;

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS status profile_status NOT NULL DEFAULT 'active';

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role team_role NOT NULL DEFAULT 'viewer',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role team_role NOT NULL DEFAULT 'viewer',
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status invitation_status NOT NULL DEFAULT 'pending',
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lunch_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  lunch_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  payment_status payment_status NOT NULL DEFAULT 'unpaid',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monthly_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  pending_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, team_id, month)
);

CREATE TABLE IF NOT EXISTS team_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teams_slug ON teams(slug);
CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_profiles_team ON profiles(team_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_team ON team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_lunch_entries_team ON lunch_entries(team_id);
CREATE INDEX IF NOT EXISTS idx_lunch_entries_user ON lunch_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_lunch_entries_date ON lunch_entries(lunch_date);
CREATE INDEX IF NOT EXISTS idx_lunch_entries_team_date ON lunch_entries(team_id, lunch_date DESC);
CREATE INDEX IF NOT EXISTS idx_monthly_summaries_team_month ON monthly_summaries(team_id, month);
CREATE INDEX IF NOT EXISTS idx_team_activity_team ON team_activity_log(team_id, created_at DESC);

CREATE OR REPLACE FUNCTION get_team_role(p_team_id UUID, p_user_id UUID)
RETURNS team_role AS $$
  SELECT role FROM team_members
  WHERE team_id = p_team_id AND user_id = p_user_id
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_edit_team(p_team_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id
      AND user_id = p_user_id
      AND role IN ('owner', 'admin')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_team_member(p_team_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id AND user_id = p_user_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_public_team_by_id(p_team_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM teams WHERE id = p_team_id AND is_public = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION generate_team_slug(team_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 0;
BEGIN
  base_slug := lower(regexp_replace(trim(team_name), '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  IF base_slug = '' THEN base_slug := 'team'; END IF;
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM teams WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, ''), '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    updated_at = now();
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT INSERT, UPDATE, SELECT ON public.profiles TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS teams_updated_at ON teams;
CREATE TRIGGER teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS lunch_entries_updated_at ON lunch_entries;
CREATE TRIGGER lunch_entries_updated_at BEFORE UPDATE ON lunch_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION refresh_monthly_summary(
  p_user_id UUID,
  p_team_id UUID,
  p_month DATE
)
RETURNS VOID AS $$
DECLARE
  v_total DECIMAL(12, 2);
  v_paid DECIMAL(12, 2);
  v_pending DECIMAL(12, 2);
  v_month_start DATE;
BEGIN
  v_month_start := date_trunc('month', p_month)::DATE;
  SELECT
    COALESCE(SUM(amount), 0),
    COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN payment_status = 'unpaid' THEN amount ELSE 0 END), 0)
  INTO v_total, v_paid, v_pending
  FROM lunch_entries
  WHERE user_id = p_user_id
    AND team_id = p_team_id
    AND date_trunc('month', lunch_date) = v_month_start;

  INSERT INTO monthly_summaries (user_id, team_id, month, total_amount, paid_amount, pending_amount)
  VALUES (p_user_id, p_team_id, v_month_start, v_total, v_paid, v_pending)
  ON CONFLICT (user_id, team_id, month)
  DO UPDATE SET
    total_amount = EXCLUDED.total_amount,
    paid_amount = EXCLUDED.paid_amount,
    pending_amount = EXCLUDED.pending_amount,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION lunch_entries_summary_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_team_id UUID;
  v_date DATE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
    v_team_id := OLD.team_id;
    v_date := OLD.lunch_date;
  ELSE
    v_user_id := NEW.user_id;
    v_team_id := NEW.team_id;
    v_date := NEW.lunch_date;
  END IF;
  PERFORM refresh_monthly_summary(v_user_id, v_team_id, v_date);
  IF TG_OP = 'UPDATE' AND (OLD.user_id <> NEW.user_id OR OLD.team_id <> NEW.team_id OR OLD.lunch_date <> NEW.lunch_date) THEN
    PERFORM refresh_monthly_summary(OLD.user_id, OLD.team_id, OLD.lunch_date);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS lunch_entries_after_change ON lunch_entries;
CREATE TRIGGER lunch_entries_after_change
  AFTER INSERT OR UPDATE OR DELETE ON lunch_entries
  FOR EACH ROW EXECUTE FUNCTION lunch_entries_summary_trigger();

CREATE OR REPLACE FUNCTION log_team_activity(
  p_team_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO team_activity_log (team_id, user_id, action, metadata)
  VALUES (p_team_id, p_user_id, p_action, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lunch_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth admin insert profiles" ON profiles;
CREATE POLICY "Auth admin insert profiles" ON profiles
  FOR INSERT TO supabase_auth_admin WITH CHECK (true);
DROP POLICY IF EXISTS "Auth admin update profiles" ON profiles;
CREATE POLICY "Auth admin update profiles" ON profiles
  FOR UPDATE TO supabase_auth_admin USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Users insert own profile" ON profiles;
CREATE POLICY "Users insert own profile" ON profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Team members can view teammate profiles" ON profiles;
CREATE POLICY "Team members can view teammate profiles" ON profiles FOR SELECT
  USING (team_id IS NOT NULL AND is_team_member(team_id, auth.uid()));
DROP POLICY IF EXISTS "Admins update teammate status" ON profiles;
CREATE POLICY "Admins update teammate status" ON profiles FOR UPDATE
  USING (
    auth.uid() = id
    OR (
      team_id IS NOT NULL
      AND is_team_member(team_id, auth.uid())
      AND can_edit_team(team_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Members can view their teams" ON teams;
CREATE POLICY "Members can view their teams" ON teams FOR SELECT
  USING (
    owner_id = auth.uid()
    OR is_team_member(id, auth.uid())
    OR is_public = true
  );
DROP POLICY IF EXISTS "Owners can update teams" ON teams;
CREATE POLICY "Owners can update teams" ON teams FOR UPDATE
  USING (owner_id = auth.uid() OR can_edit_team(id, auth.uid()));
DROP POLICY IF EXISTS "Authenticated users can create teams" ON teams;
CREATE POLICY "Authenticated users can create teams" ON teams FOR INSERT
  WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "Owners can delete teams" ON teams;
CREATE POLICY "Owners can delete teams" ON teams FOR DELETE
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Members can view team roster" ON team_members;
CREATE POLICY "Members can view team roster" ON team_members FOR SELECT
  USING (is_team_member(team_id, auth.uid()));
DROP POLICY IF EXISTS "Admins can insert members" ON team_members;
CREATE POLICY "Admins can insert members" ON team_members FOR INSERT
  WITH CHECK (can_edit_team(team_id, auth.uid()) OR auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can update roles" ON team_members;
CREATE POLICY "Admins can update roles" ON team_members FOR UPDATE
  USING (can_edit_team(team_id, auth.uid()));
DROP POLICY IF EXISTS "Admins can remove members" ON team_members;
CREATE POLICY "Admins can remove members" ON team_members FOR DELETE
  USING (
    can_edit_team(team_id, auth.uid())
    AND user_id <> (SELECT owner_id FROM teams WHERE id = team_id)
  );

DROP POLICY IF EXISTS "Admins manage invitations" ON team_invitations;
CREATE POLICY "Admins manage invitations" ON team_invitations FOR ALL
  USING (can_edit_team(team_id, auth.uid()));
DROP POLICY IF EXISTS "Invitees can view own invitation by token" ON team_invitations;
CREATE POLICY "Invitees can view own invitation by token" ON team_invitations FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Members view lunch entries" ON lunch_entries;
CREATE POLICY "Members view lunch entries" ON lunch_entries FOR SELECT
  USING (is_team_member(team_id, auth.uid()));
DROP POLICY IF EXISTS "Editors insert lunch entries" ON lunch_entries;
CREATE POLICY "Editors insert lunch entries" ON lunch_entries FOR INSERT
  WITH CHECK (can_edit_team(team_id, auth.uid()));
DROP POLICY IF EXISTS "Editors update lunch entries" ON lunch_entries;
CREATE POLICY "Editors update lunch entries" ON lunch_entries FOR UPDATE
  USING (can_edit_team(team_id, auth.uid()));
DROP POLICY IF EXISTS "Editors delete lunch entries" ON lunch_entries;
CREATE POLICY "Editors delete lunch entries" ON lunch_entries FOR DELETE
  USING (can_edit_team(team_id, auth.uid()));
DROP POLICY IF EXISTS "Public teams lunch entries read" ON lunch_entries;
CREATE POLICY "Public teams lunch entries read" ON lunch_entries FOR SELECT
  USING (EXISTS (SELECT 1 FROM teams t WHERE t.id = team_id AND t.is_public = true));

DROP POLICY IF EXISTS "Members view summaries" ON monthly_summaries;
CREATE POLICY "Members view summaries" ON monthly_summaries FOR SELECT
  USING (is_team_member(team_id, auth.uid()));
DROP POLICY IF EXISTS "Public team summaries read" ON monthly_summaries;
CREATE POLICY "Public team summaries read" ON monthly_summaries FOR SELECT
  USING (EXISTS (SELECT 1 FROM teams t WHERE t.id = team_id AND t.is_public = true));

DROP POLICY IF EXISTS "Members view activity" ON team_activity_log;
CREATE POLICY "Members view activity" ON team_activity_log FOR SELECT
  USING (is_team_member(team_id, auth.uid()));
DROP POLICY IF EXISTS "Members insert activity" ON team_activity_log;
CREATE POLICY "Members insert activity" ON team_activity_log FOR INSERT
  WITH CHECK (is_team_member(team_id, auth.uid()));

DO $$ BEGIN
  ALTER TABLE lunch_entries
    ADD CONSTRAINT lunch_entries_user_id_profiles_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE team_members
    ADD CONSTRAINT team_members_user_id_profiles_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE lunch_entries;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE team_members;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE monthly_summaries;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE team_activity_log;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
