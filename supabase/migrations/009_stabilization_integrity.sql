-- Stabilization integrity guards for cross-team references and party settlement updates.

CREATE OR REPLACE FUNCTION enforce_lunch_entry_integrity()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = NEW.team_id
      AND user_id = NEW.user_id
      AND COALESCE(status, 'active') = 'active'
  ) THEN
    RAISE EXCEPTION 'Selected payer is not an active member of this team';
  END IF;

  IF NEW.category_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM expense_categories
    WHERE id = NEW.category_id
      AND team_id = NEW.team_id
  ) THEN
    RAISE EXCEPTION 'Selected category does not belong to this team';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS lunch_entries_integrity ON lunch_entries;
CREATE TRIGGER lunch_entries_integrity
  BEFORE INSERT OR UPDATE ON lunch_entries
  FOR EACH ROW EXECUTE FUNCTION enforce_lunch_entry_integrity();

CREATE OR REPLACE FUNCTION enforce_lunch_entry_participant_integrity()
RETURNS TRIGGER AS $$
DECLARE
  v_team_id UUID;
BEGIN
  SELECT team_id INTO v_team_id FROM lunch_entries WHERE id = NEW.entry_id;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Entry not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = v_team_id
      AND user_id = NEW.user_id
      AND COALESCE(status, 'active') = 'active'
  ) THEN
    RAISE EXCEPTION 'Participant is not an active member of this team';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS lunch_entry_participants_integrity ON lunch_entry_participants;
CREATE TRIGGER lunch_entry_participants_integrity
  BEFORE INSERT OR UPDATE ON lunch_entry_participants
  FOR EACH ROW EXECUTE FUNCTION enforce_lunch_entry_participant_integrity();

CREATE OR REPLACE FUNCTION enforce_team_budget_integrity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'category' AND NOT EXISTS (
    SELECT 1 FROM expense_categories
    WHERE id = NEW.category_id
      AND team_id = NEW.team_id
  ) THEN
    RAISE EXCEPTION 'Selected category does not belong to this team';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS team_budgets_integrity ON team_budgets;
CREATE TRIGGER team_budgets_integrity
  BEFORE INSERT OR UPDATE ON team_budgets
  FOR EACH ROW EXECUTE FUNCTION enforce_team_budget_integrity();

CREATE OR REPLACE FUNCTION enforce_settlement_integrity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payer_user_id = NEW.receiver_user_id THEN
    RAISE EXCEPTION 'Payer and receiver must be different';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = NEW.team_id
      AND user_id = NEW.payer_user_id
      AND COALESCE(status, 'active') = 'active'
  ) OR NOT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = NEW.team_id
      AND user_id = NEW.receiver_user_id
      AND COALESCE(status, 'active') = 'active'
  ) THEN
    RAISE EXCEPTION 'Settlement users must be active members of this team';
  END IF;

  IF TG_OP = 'UPDATE'
    AND NOT can_edit_team(OLD.team_id, auth.uid())
    AND (
      OLD.team_id IS DISTINCT FROM NEW.team_id
      OR OLD.payer_user_id IS DISTINCT FROM NEW.payer_user_id
      OR OLD.receiver_user_id IS DISTINCT FROM NEW.receiver_user_id
      OR OLD.amount IS DISTINCT FROM NEW.amount
      OR OLD.note IS DISTINCT FROM NEW.note
      OR OLD.proof_url IS DISTINCT FROM NEW.proof_url
      OR OLD.created_by IS DISTINCT FROM NEW.created_by
      OR OLD.status <> 'pending'
      OR NEW.status NOT IN ('completed', 'cancelled')
    )
  THEN
    RAISE EXCEPTION 'Settlement parties may only complete or cancel pending settlements';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS settlements_integrity ON settlements;
CREATE TRIGGER settlements_integrity
  BEFORE INSERT OR UPDATE ON settlements
  FOR EACH ROW EXECUTE FUNCTION enforce_settlement_integrity();

CREATE INDEX IF NOT EXISTS idx_lunch_entries_team_category
  ON lunch_entries(team_id, category_id);
CREATE INDEX IF NOT EXISTS idx_settlements_team_parties
  ON settlements(team_id, payer_user_id, receiver_user_id);
