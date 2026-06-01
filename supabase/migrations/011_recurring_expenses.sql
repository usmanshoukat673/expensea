-- Recurring expense rules and idempotent generation.

DO $$ BEGIN
  CREATE TYPE recurring_frequency AS ENUM ('daily', 'weekly', 'monthly', 'yearly');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  category_id UUID NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
  frequency recurring_frequency NOT NULL,
  interval_value INTEGER NOT NULL DEFAULT 1 CHECK (interval_value > 0),
  start_date DATE NOT NULL,
  end_date DATE,
  next_run_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date IS NULL OR end_date >= start_date)
);

ALTER TABLE lunch_entries
  ADD COLUMN IF NOT EXISTS recurring_expense_id UUID REFERENCES recurring_expenses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_recurring_expenses_team
  ON recurring_expenses(team_id);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_due
  ON recurring_expenses(next_run_date)
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_team_due
  ON recurring_expenses(team_id, next_run_date)
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_lunch_entries_recurring
  ON lunch_entries(recurring_expense_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lunch_entries_recurring_occurrence
  ON lunch_entries(recurring_expense_id, lunch_date)
  WHERE recurring_expense_id IS NOT NULL;

DROP TRIGGER IF EXISTS recurring_expenses_updated_at ON recurring_expenses;
CREATE TRIGGER recurring_expenses_updated_at BEFORE UPDATE ON recurring_expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION recurring_next_date(
  p_date DATE,
  p_frequency recurring_frequency,
  p_interval INTEGER
)
RETURNS DATE AS $$
BEGIN
  CASE p_frequency
    WHEN 'daily' THEN
      RETURN p_date + p_interval;
    WHEN 'weekly' THEN
      RETURN p_date + (p_interval * 7);
    WHEN 'monthly' THEN
      RETURN (p_date + make_interval(months => p_interval))::DATE;
    WHEN 'yearly' THEN
      RETURN (p_date + make_interval(years => p_interval))::DATE;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

CREATE OR REPLACE FUNCTION enforce_recurring_expense_integrity()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = NEW.team_id
      AND user_id = NEW.created_by
      AND COALESCE(status, 'active') = 'active'
  ) THEN
    RAISE EXCEPTION 'Creator must be an active member of this team';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM expense_categories
    WHERE id = NEW.category_id
      AND team_id = NEW.team_id
  ) THEN
    RAISE EXCEPTION 'Selected category does not belong to this team';
  END IF;

  IF NEW.next_run_date < NEW.start_date THEN
    RAISE EXCEPTION 'Next run date cannot be before the start date';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS recurring_expenses_integrity ON recurring_expenses;
CREATE TRIGGER recurring_expenses_integrity
  BEFORE INSERT OR UPDATE ON recurring_expenses
  FOR EACH ROW EXECUTE FUNCTION enforce_recurring_expense_integrity();

CREATE OR REPLACE FUNCTION process_due_recurring_expenses(
  p_team_id UUID DEFAULT NULL,
  p_run_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  recurring_expense_id UUID,
  expense_id UUID,
  team_id UUID,
  title TEXT,
  amount DECIMAL(12, 2),
  generated_for DATE
) AS $$
DECLARE
  rule RECORD;
  inserted_id UUID;
  following_date DATE;
  member_ids UUID[];
BEGIN
  FOR rule IN
    SELECT r.*
    FROM recurring_expenses r
    WHERE r.is_active = true
      AND r.next_run_date <= p_run_date
      AND (r.end_date IS NULL OR r.next_run_date <= r.end_date)
      AND (p_team_id IS NULL OR r.team_id = p_team_id)
      AND EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = r.team_id
          AND tm.user_id = r.created_by
          AND COALESCE(tm.status, 'active') = 'active'
      )
    ORDER BY r.next_run_date, r.created_at
    FOR UPDATE SKIP LOCKED
  LOOP
    inserted_id := NULL;

    INSERT INTO lunch_entries (
      team_id,
      user_id,
      amount,
      lunch_date,
      notes,
      payment_status,
      category_id,
      is_shared,
      split_type,
      created_by,
      recurring_expense_id
    )
    VALUES (
      rule.team_id,
      rule.created_by,
      rule.amount,
      rule.next_run_date,
      rule.title,
      'unpaid',
      rule.category_id,
      false,
      'none',
      rule.created_by,
      rule.id
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO inserted_id;

    following_date := recurring_next_date(rule.next_run_date, rule.frequency, rule.interval_value);

    UPDATE recurring_expenses
    SET
      last_generated_at = CASE WHEN inserted_id IS NULL THEN last_generated_at ELSE now() END,
      next_run_date = following_date,
      is_active = CASE
        WHEN end_date IS NOT NULL AND following_date > end_date THEN false
        ELSE is_active
      END
    WHERE id = rule.id;

    IF inserted_id IS NOT NULL THEN
      INSERT INTO team_activity_log (team_id, user_id, action, metadata)
      VALUES (
        rule.team_id,
        rule.created_by,
        'recurring_expense_generated',
        jsonb_build_object(
          'entity_type', 'expense',
          'entity_id', inserted_id,
          'message', 'Recurring expense generated',
          'recurring_expense_id', rule.id,
          'amount', rule.amount
        )
      );

      SELECT array_agg(tm.user_id) INTO member_ids
      FROM team_members tm
      WHERE tm.team_id = rule.team_id
        AND COALESCE(tm.status, 'active') = 'active';

      IF member_ids IS NOT NULL THEN
        INSERT INTO notifications (user_id, team_id, type, title, body, message, metadata)
        SELECT
          unnest(member_ids),
          rule.team_id,
          'info',
          'Recurring expense generated',
          rule.title || ' was added automatically',
          rule.title || ' was added automatically',
          jsonb_build_object('entryId', inserted_id, 'recurringExpenseId', rule.id)
        ON CONFLICT DO NOTHING;
      END IF;

      recurring_expense_id := rule.id;
      expense_id := inserted_id;
      team_id := rule.team_id;
      title := rule.title;
      amount := rule.amount;
      generated_for := rule.next_run_date;
      RETURN NEXT;
    END IF;
  END LOOP;

  INSERT INTO notifications (user_id, team_id, type, title, body, message, metadata)
  SELECT
    tm.user_id,
    r.team_id,
    'warning',
    'Recurring rule expiring soon',
    r.title || ' ends on ' || r.end_date::TEXT,
    r.title || ' ends on ' || r.end_date::TEXT,
    jsonb_build_object('recurringExpenseId', r.id)
  FROM recurring_expenses r
  JOIN team_members tm ON tm.team_id = r.team_id AND COALESCE(tm.status, 'active') = 'active'
  WHERE r.is_active = true
    AND r.end_date IS NOT NULL
    AND r.end_date BETWEEN p_run_date AND (p_run_date + 7)
    AND (p_team_id IS NULL OR r.team_id = p_team_id)
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.team_id = r.team_id
        AND n.user_id = tm.user_id
        AND n.type = 'warning'
        AND n.metadata->>'recurringExpenseId' = r.id::TEXT
        AND n.created_at >= (now() - INTERVAL '1 day')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members view recurring expenses" ON recurring_expenses;
CREATE POLICY "Members view recurring expenses" ON recurring_expenses FOR SELECT
  USING (is_team_member(team_id, auth.uid()));
DROP POLICY IF EXISTS "Editors insert recurring expenses" ON recurring_expenses;
CREATE POLICY "Editors insert recurring expenses" ON recurring_expenses FOR INSERT
  WITH CHECK (can_edit_team(team_id, auth.uid()));
DROP POLICY IF EXISTS "Editors update recurring expenses" ON recurring_expenses;
CREATE POLICY "Editors update recurring expenses" ON recurring_expenses FOR UPDATE
  USING (can_edit_team(team_id, auth.uid()))
  WITH CHECK (can_edit_team(team_id, auth.uid()));
DROP POLICY IF EXISTS "Editors delete recurring expenses" ON recurring_expenses;
CREATE POLICY "Editors delete recurring expenses" ON recurring_expenses FOR DELETE
  USING (can_edit_team(team_id, auth.uid()));

GRANT EXECUTE ON FUNCTION process_due_recurring_expenses(UUID, DATE) TO authenticated;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE recurring_expenses;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
