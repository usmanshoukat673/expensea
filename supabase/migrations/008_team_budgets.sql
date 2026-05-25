-- Team budgets: monthly team limits and per-category caps

DO $$ BEGIN
  CREATE TYPE budget_type AS ENUM ('monthly', 'category');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS team_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  category_id UUID REFERENCES expense_categories(id) ON DELETE CASCADE,
  type budget_type NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'PKR',
  month DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT team_budgets_type_category CHECK (
    (type = 'category' AND category_id IS NOT NULL)
    OR (type = 'monthly' AND category_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_team_budgets_team ON team_budgets(team_id);
CREATE INDEX IF NOT EXISTS idx_team_budgets_category ON team_budgets(category_id);
CREATE INDEX IF NOT EXISTS idx_team_budgets_month ON team_budgets(team_id, month);

-- One monthly team budget per month slot (specific month or recurring null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_budgets_monthly_unique
  ON team_budgets (team_id, COALESCE(month, '1970-01-01'::date))
  WHERE type = 'monthly';

-- One category budget per category per month slot
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_budgets_category_unique
  ON team_budgets (team_id, category_id, COALESCE(month, '1970-01-01'::date))
  WHERE type = 'category';

ALTER TABLE team_budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members view team budgets" ON team_budgets;
CREATE POLICY "Members view team budgets" ON team_budgets FOR SELECT
  USING (is_team_member(team_id, auth.uid()));

DROP POLICY IF EXISTS "Public view team budgets" ON team_budgets;
CREATE POLICY "Public view team budgets" ON team_budgets FOR SELECT
  USING (EXISTS (SELECT 1 FROM teams t WHERE t.id = team_id AND t.is_public = true));

DROP POLICY IF EXISTS "Editors manage team budgets" ON team_budgets;
CREATE POLICY "Editors manage team budgets" ON team_budgets FOR ALL
  USING (can_edit_team(team_id, auth.uid()))
  WITH CHECK (can_edit_team(team_id, auth.uid()));

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE team_budgets;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
