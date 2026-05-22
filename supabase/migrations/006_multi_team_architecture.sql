-- Multi-team architecture: team-scoped member status, shared profile visibility, active team helpers

DO $$ BEGIN
  CREATE TYPE member_status AS ENUM ('active', 'invited', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS status member_status NOT NULL DEFAULT 'active';

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE teams SET created_by = owner_id WHERE created_by IS NULL;

CREATE INDEX IF NOT EXISTS idx_team_members_user_status ON team_members(user_id, status);

-- Teammates in any shared team (not tied to profiles.team_id)
CREATE OR REPLACE FUNCTION shares_team_with(p_viewer UUID, p_target UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM team_members a
    INNER JOIN team_members b ON a.team_id = b.team_id
    WHERE a.user_id = p_viewer
      AND b.user_id = p_target
      AND a.status = 'active'
      AND b.status = 'active'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION user_has_team_membership(p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE user_id = p_user_id AND status = 'active'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION can_set_active_team(p_user_id UUID, p_team_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE user_id = p_user_id
      AND team_id = p_team_id
      AND status = 'active'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Profiles: view teammates across all shared teams
DROP POLICY IF EXISTS "Team members can view teammate profiles" ON profiles;
CREATE POLICY "Team members can view teammate profiles" ON profiles FOR SELECT
  USING (auth.uid() = id OR shares_team_with(auth.uid(), id));

-- Admins may update teammate status when they share an editable team
DROP POLICY IF EXISTS "Admins update teammate status" ON profiles;
CREATE POLICY "Admins update teammate status" ON profiles FOR UPDATE
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = profiles.id
        AND is_team_member(tm.team_id, auth.uid())
        AND can_edit_team(tm.team_id, auth.uid())
    )
  );

-- Own profile updates: active team must be a membership (profiles.team_id = active team)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (team_id IS NULL OR can_set_active_team(auth.uid(), team_id))
  );

-- Admins update member status on team_members
DROP POLICY IF EXISTS "Admins update team member status" ON team_members;
CREATE POLICY "Admins update team member status" ON team_members FOR UPDATE
  USING (can_edit_team(team_id, auth.uid()));

GRANT EXECUTE ON FUNCTION shares_team_with(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_team_membership(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_set_active_team(UUID, UUID) TO authenticated;
