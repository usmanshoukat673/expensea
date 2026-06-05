-- Member ledger and individual expense assignment support.

DO $$ BEGIN
  CREATE TYPE expense_assignment_type AS ENUM ('team', 'individual');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE lunch_entries
  ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assignment_type expense_assignment_type NOT NULL DEFAULT 'team';

UPDATE lunch_entries
SET assignment_type = 'team'
WHERE assignment_type IS NULL;

ALTER TABLE lunch_entries
  DROP CONSTRAINT IF EXISTS lunch_entries_assignment_consistency,
  ADD CONSTRAINT lunch_entries_assignment_consistency CHECK (
    (assignment_type = 'team' AND assigned_user_id IS NULL)
    OR (assignment_type = 'individual' AND assigned_user_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_lunch_entries_assigned_user
  ON lunch_entries(team_id, assigned_user_id, lunch_date DESC);
CREATE INDEX IF NOT EXISTS idx_lunch_entries_assignment_type
  ON lunch_entries(team_id, assignment_type, lunch_date DESC);

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
  WHERE team_id = p_team_id
    AND approval_status IN ('approved', 'reimbursed')
    AND date_trunc('month', lunch_date) = v_month_start
    AND (
      user_id = p_user_id
      OR assigned_user_id = p_user_id
    );

  INSERT INTO monthly_summaries (user_id, team_id, month, total_amount, paid_amount, pending_amount)
  VALUES (p_user_id, p_team_id, v_month_start, v_total, v_paid, v_pending)
  ON CONFLICT (user_id, team_id, month)
  DO UPDATE SET
    total_amount = EXCLUDED.total_amount,
    paid_amount = EXCLUDED.paid_amount,
    pending_amount = EXCLUDED.pending_amount,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION lunch_entries_summary_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_new_users UUID[];
  v_old_users UUID[];
  v_uid UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old_users := ARRAY(SELECT DISTINCT unnest(ARRAY[OLD.user_id, OLD.assigned_user_id]));
    FOREACH v_uid IN ARRAY v_old_users LOOP
      IF v_uid IS NOT NULL THEN
        PERFORM refresh_monthly_summary(v_uid, OLD.team_id, OLD.lunch_date);
      END IF;
    END LOOP;
    RETURN OLD;
  END IF;

  v_new_users := ARRAY(SELECT DISTINCT unnest(ARRAY[NEW.user_id, NEW.assigned_user_id]));
  FOREACH v_uid IN ARRAY v_new_users LOOP
    IF v_uid IS NOT NULL THEN
      PERFORM refresh_monthly_summary(v_uid, NEW.team_id, NEW.lunch_date);
    END IF;
  END LOOP;

  IF TG_OP = 'UPDATE' AND (
    OLD.user_id <> NEW.user_id
    OR COALESCE(OLD.assigned_user_id, '00000000-0000-0000-0000-000000000000'::UUID) <> COALESCE(NEW.assigned_user_id, '00000000-0000-0000-0000-000000000000'::UUID)
    OR OLD.team_id <> NEW.team_id
    OR OLD.lunch_date <> NEW.lunch_date
    OR OLD.approval_status <> NEW.approval_status
    OR OLD.payment_status <> NEW.payment_status
    OR OLD.amount <> NEW.amount
  ) THEN
    v_old_users := ARRAY(SELECT DISTINCT unnest(ARRAY[OLD.user_id, OLD.assigned_user_id]));
    FOREACH v_uid IN ARRAY v_old_users LOOP
      IF v_uid IS NOT NULL THEN
        PERFORM refresh_monthly_summary(v_uid, OLD.team_id, OLD.lunch_date);
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS lunch_entries_after_change ON lunch_entries;
CREATE TRIGGER lunch_entries_after_change
  AFTER INSERT OR UPDATE OR DELETE ON lunch_entries
  FOR EACH ROW EXECUTE FUNCTION lunch_entries_summary_trigger();

DROP POLICY IF EXISTS "Members view lunch entries" ON lunch_entries;
CREATE POLICY "Members view lunch entries" ON lunch_entries FOR SELECT
  USING (
    can_edit_team(team_id, auth.uid())
    OR user_id = auth.uid()
    OR created_by = auth.uid()
    OR assigned_user_id = auth.uid()
    OR submitted_by = auth.uid()
  );
