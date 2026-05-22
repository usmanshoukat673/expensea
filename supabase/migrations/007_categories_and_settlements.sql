-- Expense categories, expense splitting, settlements, notifications

DO $$ BEGIN
  CREATE TYPE settlement_status AS ENUM ('pending', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE expense_split_type AS ENUM ('none', 'equal', 'selected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'circle',
  color TEXT NOT NULL DEFAULT '#6366f1',
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_team ON expense_categories(team_id);

ALTER TABLE lunch_entries
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS split_type expense_split_type NOT NULL DEFAULT 'none';

CREATE INDEX IF NOT EXISTS idx_lunch_entries_category ON lunch_entries(category_id);

CREATE TABLE IF NOT EXISTS lunch_entry_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES lunch_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_amount DECIMAL(12, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entry_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_lunch_entry_participants_entry ON lunch_entry_participants(entry_id);

CREATE TABLE IF NOT EXISTS settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  payer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  status settlement_status NOT NULL DEFAULT 'pending',
  note TEXT,
  proof_url TEXT,
  settled_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_settlements_team ON settlements(team_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(team_id, status);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  metadata JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS show_balances_on_public BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_category_analytics_on_public BOOLEAN NOT NULL DEFAULT true;

-- Default category templates (seeded per team)
CREATE OR REPLACE FUNCTION seed_team_expense_categories(p_team_id UUID, p_created_by UUID DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
  cat RECORD;
BEGIN
  FOR cat IN
    SELECT * FROM (VALUES
      ('Food', 'food', 'utensils', '#f97316', 'Meals, groceries, and dining'),
      ('Travel', 'travel', 'plane', '#0ea5e9', 'Transport and trips'),
      ('Office', 'office', 'briefcase', '#8b5cf6', 'Office supplies and workspace'),
      ('Internet', 'internet', 'wifi', '#06b6d4', 'Internet and connectivity'),
      ('Utilities', 'utilities', 'zap', '#eab308', 'Bills and utilities'),
      ('Entertainment', 'entertainment', 'tv', '#ec4899', 'Events and leisure'),
      ('Miscellaneous', 'miscellaneous', 'layers', '#64748b', 'Other expenses')
    ) AS t(name, slug, icon, color, description)
  LOOP
    INSERT INTO expense_categories (team_id, name, slug, icon, color, description, created_by)
    VALUES (p_team_id, cat.name, cat.slug, cat.icon, cat.color, cat.description, p_created_by)
    ON CONFLICT (team_id, slug) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Backfill existing teams
DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN SELECT id, COALESCE(created_by, owner_id) AS creator FROM teams LOOP
    PERFORM seed_team_expense_categories(t.id, t.creator);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION teams_seed_categories_trigger()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM seed_team_expense_categories(NEW.id, NEW.created_by);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS teams_seed_categories ON teams;
CREATE TRIGGER teams_seed_categories
  AFTER INSERT ON teams
  FOR EACH ROW EXECUTE FUNCTION teams_seed_categories_trigger();

-- RLS
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE lunch_entry_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members view expense categories" ON expense_categories;
CREATE POLICY "Members view expense categories" ON expense_categories FOR SELECT
  USING (is_team_member(team_id, auth.uid()));
DROP POLICY IF EXISTS "Public view expense categories" ON expense_categories;
CREATE POLICY "Public view expense categories" ON expense_categories FOR SELECT
  USING (EXISTS (SELECT 1 FROM teams t WHERE t.id = team_id AND t.is_public = true));
DROP POLICY IF EXISTS "Editors manage expense categories" ON expense_categories;
CREATE POLICY "Editors manage expense categories" ON expense_categories FOR ALL
  USING (can_edit_team(team_id, auth.uid()))
  WITH CHECK (can_edit_team(team_id, auth.uid()));

DROP POLICY IF EXISTS "Members view entry participants" ON lunch_entry_participants;
CREATE POLICY "Members view entry participants" ON lunch_entry_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lunch_entries e
      WHERE e.id = entry_id AND is_team_member(e.team_id, auth.uid())
    )
  );
DROP POLICY IF EXISTS "Public view entry participants" ON lunch_entry_participants;
CREATE POLICY "Public view entry participants" ON lunch_entry_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lunch_entries e
      JOIN teams t ON t.id = e.team_id
      WHERE e.id = entry_id AND t.is_public = true
    )
  );
DROP POLICY IF EXISTS "Editors manage entry participants" ON lunch_entry_participants;
CREATE POLICY "Editors manage entry participants" ON lunch_entry_participants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM lunch_entries e
      WHERE e.id = entry_id AND can_edit_team(e.team_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Members view settlements" ON settlements;
CREATE POLICY "Members view settlements" ON settlements FOR SELECT
  USING (is_team_member(team_id, auth.uid()));
DROP POLICY IF EXISTS "Public view settlements" ON settlements;
CREATE POLICY "Public view settlements" ON settlements FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM teams t WHERE t.id = team_id AND t.is_public = true AND t.show_balances_on_public = true)
  );
DROP POLICY IF EXISTS "Editors manage settlements" ON settlements;
CREATE POLICY "Editors manage settlements" ON settlements FOR INSERT
  WITH CHECK (can_edit_team(team_id, auth.uid()));
DROP POLICY IF EXISTS "Editors update settlements" ON settlements;
CREATE POLICY "Editors update settlements" ON settlements FOR UPDATE
  USING (can_edit_team(team_id, auth.uid()));
DROP POLICY IF EXISTS "Editors delete settlements" ON settlements;
CREATE POLICY "Editors delete settlements" ON settlements FOR DELETE
  USING (can_edit_team(team_id, auth.uid()));
DROP POLICY IF EXISTS "Parties update own settlement status" ON settlements;
CREATE POLICY "Parties update own settlement status" ON settlements FOR UPDATE
  USING (
    auth.uid() IN (payer_user_id, receiver_user_id)
    OR can_edit_team(team_id, auth.uid())
  );

DROP POLICY IF EXISTS "Users view own notifications" ON notifications;
CREATE POLICY "Users view own notifications" ON notifications FOR SELECT
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own notifications" ON notifications;
CREATE POLICY "Users update own notifications" ON notifications FOR UPDATE
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Members insert notifications" ON notifications;
CREATE POLICY "Members insert notifications" ON notifications FOR INSERT
  WITH CHECK (is_team_member(team_id, auth.uid()));

GRANT EXECUTE ON FUNCTION seed_team_expense_categories(UUID, UUID) TO authenticated;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE settlements;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
