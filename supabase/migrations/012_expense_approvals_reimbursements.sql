-- Expense approval and reimbursement workflow.

DO $$ BEGIN
  CREATE TYPE approval_status AS ENUM ('draft', 'pending_approval', 'approved', 'rejected', 'reimbursed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE reimbursement_status AS ENUM ('not_reimbursed', 'partially_reimbursed', 'fully_reimbursed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE lunch_entries
  ADD COLUMN IF NOT EXISTS approval_status approval_status NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS reimbursement_status reimbursement_status NOT NULL DEFAULT 'not_reimbursed',
  ADD COLUMN IF NOT EXISTS amount_reimbursed DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (amount_reimbursed >= 0),
  ADD COLUMN IF NOT EXISTS reimbursed_at DATE,
  ADD COLUMN IF NOT EXISTS reimbursement_notes TEXT;

UPDATE lunch_entries
SET
  approval_status = 'approved',
  approved_by = COALESCE(approved_by, created_by),
  approved_at = COALESCE(approved_at, created_at)
WHERE approval_status = 'draft'
  AND submitted_by IS NULL
  AND approved_by IS NULL;

CREATE INDEX IF NOT EXISTS idx_lunch_entries_approval_status
  ON lunch_entries(team_id, approval_status, lunch_date DESC);
CREATE INDEX IF NOT EXISTS idx_lunch_entries_submitted_by
  ON lunch_entries(team_id, submitted_by);
CREATE INDEX IF NOT EXISTS idx_lunch_entries_reimbursement_status
  ON lunch_entries(team_id, reimbursement_status);

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
    AND approval_status IN ('approved', 'reimbursed')
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
  IF TG_OP = 'UPDATE' AND (
    OLD.user_id <> NEW.user_id
    OR OLD.team_id <> NEW.team_id
    OR OLD.lunch_date <> NEW.lunch_date
    OR OLD.approval_status <> NEW.approval_status
    OR OLD.payment_status <> NEW.payment_status
    OR OLD.amount <> NEW.amount
  ) THEN
    PERFORM refresh_monthly_summary(OLD.user_id, OLD.team_id, OLD.lunch_date);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS "Editors insert lunch entries" ON lunch_entries;
CREATE POLICY "Members insert lunch entries" ON lunch_entries FOR INSERT
  WITH CHECK (
    is_team_member(team_id, auth.uid())
    AND created_by = auth.uid()
    AND approval_status IN ('draft', 'pending_approval')
  );

DROP POLICY IF EXISTS "Editors update lunch entries" ON lunch_entries;
CREATE POLICY "Approvers update lunch entries" ON lunch_entries FOR UPDATE
  USING (
    can_edit_team(team_id, auth.uid())
    OR (
      created_by = auth.uid()
      AND approval_status IN ('draft', 'rejected')
    )
  )
  WITH CHECK (
    can_edit_team(team_id, auth.uid())
    OR (
      created_by = auth.uid()
      AND approval_status IN ('draft', 'pending_approval')
    )
  );

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
      team_id, user_id, amount, lunch_date, notes, payment_status,
      category_id, is_shared, split_type, created_by, recurring_expense_id,
      approval_status, submitted_by
    )
    VALUES (
      rule.team_id, rule.created_by, rule.amount, rule.next_run_date, rule.title, 'unpaid',
      rule.category_id, false, 'none', rule.created_by, rule.id,
      'pending_approval', rule.created_by
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO inserted_id;

    following_date := recurring_next_date(rule.next_run_date, rule.frequency, rule.interval_value);

    UPDATE recurring_expenses
    SET
      last_generated_at = CASE WHEN inserted_id IS NULL THEN last_generated_at ELSE now() END,
      next_run_date = following_date,
      is_active = CASE WHEN end_date IS NOT NULL AND following_date > end_date THEN false ELSE is_active END
    WHERE id = rule.id;

    IF inserted_id IS NOT NULL THEN
      INSERT INTO team_activity_log (team_id, user_id, action, metadata)
      VALUES (
        rule.team_id,
        rule.created_by,
        'expense_submitted',
        jsonb_build_object(
          'entity_type', 'expense',
          'entity_id', inserted_id,
          'message', 'Recurring expense submitted for approval',
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
          unnest(member_ids), rule.team_id, 'info', 'Expense submitted',
          rule.title || ' is waiting for approval',
          rule.title || ' is waiting for approval',
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
