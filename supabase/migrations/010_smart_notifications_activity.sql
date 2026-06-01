-- Smart notifications and activity audit trail.

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_team_created
  ON activity_logs(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_team_entity
  ON activity_logs(team_id, entity_type, created_at DESC);

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS message TEXT,
  ADD COLUMN IF NOT EXISTS read BOOLEAN NOT NULL DEFAULT false;

UPDATE notifications
SET
  message = COALESCE(message, body),
  read = COALESCE(read_at IS NOT NULL, false)
WHERE message IS NULL OR read IS DISTINCT FROM COALESCE(read_at IS NOT NULL, false);

CREATE OR REPLACE FUNCTION sync_notification_compat_columns()
RETURNS TRIGGER AS $$
BEGIN
  NEW.message := COALESCE(NEW.message, NEW.body);
  NEW.body := COALESCE(NEW.body, NEW.message);

  IF TG_OP = 'UPDATE'
    AND NEW.read IS DISTINCT FROM OLD.read
    AND NEW.read = false
  THEN
    NEW.read_at := NULL;
  ELSIF NEW.read_at IS NOT NULL THEN
    NEW.read := true;
  ELSIF NEW.read = true AND NEW.read_at IS NULL THEN
    NEW.read_at := now();
  ELSE
    NEW.read := false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS notifications_compat_sync ON notifications;
CREATE TRIGGER notifications_compat_sync
  BEFORE INSERT OR UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION sync_notification_compat_columns();

CREATE OR REPLACE FUNCTION mirror_team_activity_log()
RETURNS TRIGGER AS $$
DECLARE
  v_entity_type TEXT := COALESCE(NEW.metadata->>'entity_type', split_part(NEW.action, '_', 1), 'team');
  v_entity_id UUID := NULLIF(NEW.metadata->>'entity_id', '')::UUID;
  v_message TEXT := COALESCE(NEW.metadata->>'message', replace(NEW.action, '_', ' '));
BEGIN
  INSERT INTO activity_logs (
    team_id,
    user_id,
    action_type,
    entity_type,
    entity_id,
    message,
    metadata,
    created_at
  )
  VALUES (
    NEW.team_id,
    NEW.user_id,
    NEW.action,
    v_entity_type,
    v_entity_id,
    v_message,
    COALESCE(NEW.metadata, '{}'),
    NEW.created_at
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS team_activity_log_mirror ON team_activity_log;
CREATE TRIGGER team_activity_log_mirror
  AFTER INSERT ON team_activity_log
  FOR EACH ROW EXECUTE FUNCTION mirror_team_activity_log();

INSERT INTO activity_logs (
  team_id,
  user_id,
  action_type,
  entity_type,
  entity_id,
  message,
  metadata,
  created_at
)
SELECT
  t.team_id,
  t.user_id,
  t.action,
  COALESCE(t.metadata->>'entity_type', split_part(t.action, '_', 1), 'team'),
  NULLIF(t.metadata->>'entity_id', '')::UUID,
  COALESCE(t.metadata->>'message', replace(t.action, '_', ' ')),
  COALESCE(t.metadata, '{}'),
  t.created_at
FROM team_activity_log t
WHERE NOT EXISTS (
  SELECT 1
  FROM activity_logs a
  WHERE a.team_id = t.team_id
    AND a.user_id IS NOT DISTINCT FROM t.user_id
    AND a.action_type = t.action
    AND a.created_at = t.created_at
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members view activity logs" ON activity_logs;
CREATE POLICY "Members view activity logs" ON activity_logs FOR SELECT
  USING (is_team_member(team_id, auth.uid()));

DROP POLICY IF EXISTS "Members insert activity logs" ON activity_logs;
CREATE POLICY "Members insert activity logs" ON activity_logs FOR INSERT
  WITH CHECK (is_team_member(team_id, auth.uid()));

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
