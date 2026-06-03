-- Complete notifications and activity center.

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS link TEXT,
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

UPDATE notifications
SET is_read = COALESCE(read_at IS NOT NULL, read, false)
WHERE is_read IS DISTINCT FROM COALESCE(read_at IS NOT NULL, read, false);

CREATE INDEX IF NOT EXISTS idx_notifications_user_team_read
  ON notifications(user_id, team_id, is_read, created_at DESC)
  WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_team_archive
  ON notifications(user_id, team_id, archived_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_search
  ON notifications USING gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(message, '') || ' ' || coalesce(body, '')));

CREATE OR REPLACE FUNCTION sync_notification_compat_columns()
RETURNS TRIGGER AS $$
BEGIN
  NEW.message := COALESCE(NEW.message, NEW.body);
  NEW.body := COALESCE(NEW.body, NEW.message);

  IF TG_OP = 'UPDATE'
    AND NEW.is_read IS DISTINCT FROM OLD.is_read
    AND NEW.is_read = false
  THEN
    NEW.read_at := NULL;
    NEW.read := false;
  ELSIF TG_OP = 'UPDATE'
    AND NEW.read IS DISTINCT FROM OLD.read
    AND NEW.read = false
  THEN
    NEW.read_at := NULL;
    NEW.is_read := false;
  ELSIF NEW.read_at IS NOT NULL OR NEW.read = true OR NEW.is_read = true THEN
    NEW.read_at := COALESCE(NEW.read_at, now());
    NEW.read := true;
    NEW.is_read := true;
  ELSE
    NEW.read := false;
    NEW.is_read := false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS notifications_compat_sync ON notifications;
CREATE TRIGGER notifications_compat_sync
  BEFORE INSERT OR UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION sync_notification_compat_columns();

DROP POLICY IF EXISTS "Users delete own notifications" ON notifications;
CREATE POLICY "Users delete own notifications" ON notifications FOR DELETE
  USING (auth.uid() = user_id);

ALTER TABLE activity_logs
  ADD COLUMN IF NOT EXISTS description TEXT;

UPDATE activity_logs
SET description = COALESCE(description, message)
WHERE description IS NULL;

ALTER TABLE activity_logs
  ALTER COLUMN description SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_logs_team_type_search
  ON activity_logs(team_id, entity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_search
  ON activity_logs USING gin (to_tsvector('english', coalesce(description, '') || ' ' || coalesce(message, '') || ' ' || coalesce(action_type, '')));

CREATE OR REPLACE FUNCTION sync_activity_description_columns()
RETURNS TRIGGER AS $$
BEGIN
  NEW.description := COALESCE(NEW.description, NEW.message);
  NEW.message := COALESCE(NEW.message, NEW.description);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS activity_description_sync ON activity_logs;
CREATE TRIGGER activity_description_sync
  BEFORE INSERT OR UPDATE ON activity_logs
  FOR EACH ROW EXECUTE FUNCTION sync_activity_description_columns();

CREATE OR REPLACE FUNCTION mirror_team_activity_log()
RETURNS TRIGGER AS $$
DECLARE
  v_entity_type TEXT := COALESCE(NEW.metadata->>'entity_type', split_part(NEW.action, '_', 1), 'team');
  v_entity_id UUID := NULLIF(NEW.metadata->>'entity_id', '')::UUID;
  v_description TEXT := COALESCE(NEW.metadata->>'description', NEW.metadata->>'message', replace(NEW.action, '_', ' '));
BEGIN
  INSERT INTO activity_logs (
    team_id,
    user_id,
    action_type,
    entity_type,
    entity_id,
    message,
    description,
    metadata,
    created_at
  )
  VALUES (
    NEW.team_id,
    NEW.user_id,
    NEW.action,
    v_entity_type,
    v_entity_id,
    v_description,
    v_description,
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
