-- Team create failed: INSERT + RETURNING checks SELECT policy before team_members row exists.
-- Allow owners to read their team (including immediately after insert).

DROP POLICY IF EXISTS "Members can view their teams" ON teams;
CREATE POLICY "Members can view their teams" ON teams FOR SELECT
  USING (
    owner_id = auth.uid()
    OR is_team_member(id, auth.uid())
    OR is_public = true
  );
