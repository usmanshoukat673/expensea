-- Shareable team invites (email + link). Complements legacy team_invitations.

CREATE TABLE IF NOT EXISTS team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  invited_email TEXT,
  role team_role NOT NULL DEFAULT 'viewer',
  expires_at TIMESTAMPTZ,
  usage_limit INT,
  usage_count INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT team_invites_role_check CHECK (role IN ('admin', 'viewer'))
);

CREATE INDEX IF NOT EXISTS idx_team_invites_team ON team_invites(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_token ON team_invites(token);
CREATE INDEX IF NOT EXISTS idx_team_invites_active ON team_invites(team_id, is_active) WHERE is_active = true;

ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_team_invite_valid(
  p_is_active BOOLEAN,
  p_expires_at TIMESTAMPTZ,
  p_usage_limit INT,
  p_usage_count INT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT p_is_active
    AND (p_expires_at IS NULL OR p_expires_at > now())
    AND (p_usage_limit IS NULL OR p_usage_count < p_usage_limit);
$$;

CREATE OR REPLACE FUNCTION get_team_invite_preview(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite team_invites%ROWTYPE;
  v_team teams%ROWTYPE;
  v_inviter profiles%ROWTYPE;
  v_valid BOOLEAN;
BEGIN
  SELECT * INTO v_invite FROM team_invites WHERE token = p_token LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_found');
  END IF;

  v_valid := is_team_invite_valid(
    v_invite.is_active,
    v_invite.expires_at,
    v_invite.usage_limit,
    v_invite.usage_count
  );

  SELECT * INTO v_team FROM teams WHERE id = v_invite.team_id;
  SELECT * INTO v_inviter FROM profiles WHERE id = v_invite.created_by;

  RETURN jsonb_build_object(
    'valid', v_valid,
    'reason', CASE WHEN NOT v_valid THEN
      CASE
        WHEN NOT v_invite.is_active THEN 'disabled'
        WHEN v_invite.expires_at IS NOT NULL AND v_invite.expires_at <= now() THEN 'expired'
        WHEN v_invite.usage_limit IS NOT NULL AND v_invite.usage_count >= v_invite.usage_limit THEN 'usage_exceeded'
        ELSE 'invalid'
      END
    ELSE NULL END,
    'team_id', v_invite.team_id,
    'team_name', v_team.name,
    'role', v_invite.role,
    'invited_email', v_invite.invited_email,
    'expires_at', v_invite.expires_at,
    'inviter_name', COALESCE(v_inviter.full_name, v_inviter.email, 'Team admin')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_team_invite_preview(TEXT) TO anon, authenticated;

DROP POLICY IF EXISTS "Admins manage team_invites" ON team_invites;
CREATE POLICY "Admins manage team_invites" ON team_invites
  FOR ALL
  USING (can_edit_team(team_id, auth.uid()))
  WITH CHECK (can_edit_team(team_id, auth.uid()));
