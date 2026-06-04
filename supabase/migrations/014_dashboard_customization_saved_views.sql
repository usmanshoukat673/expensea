-- Dashboard customization, saved views, and favorites.

CREATE TABLE IF NOT EXISTS user_dashboard_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  layout_json JSONB NOT NULL DEFAULT '{"widgets":[]}'::jsonb,
  hidden_widgets JSONB NOT NULL DEFAULT '[]'::jsonb,
  pinned_widgets JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_view_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_dashboard_preferences_unique UNIQUE (user_id, team_id),
  CONSTRAINT user_dashboard_preferences_layout_object CHECK (jsonb_typeof(layout_json) = 'object'),
  CONSTRAINT user_dashboard_preferences_hidden_array CHECK (jsonb_typeof(hidden_widgets) = 'array'),
  CONSTRAINT user_dashboard_preferences_pinned_array CHECK (jsonb_typeof(pinned_widgets) = 'array')
);

CREATE TABLE IF NOT EXISTS dashboard_saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  layout_json JSONB NOT NULL DEFAULT '{"widgets":[]}'::jsonb,
  hidden_widgets JSONB NOT NULL DEFAULT '[]'::jsonb,
  pinned_widgets JSONB NOT NULL DEFAULT '[]'::jsonb,
  filters_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dashboard_saved_views_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT dashboard_saved_views_layout_object CHECK (jsonb_typeof(layout_json) = 'object'),
  CONSTRAINT dashboard_saved_views_hidden_array CHECK (jsonb_typeof(hidden_widgets) = 'array'),
  CONSTRAINT dashboard_saved_views_pinned_array CHECK (jsonb_typeof(pinned_widgets) = 'array'),
  CONSTRAINT dashboard_saved_views_filters_object CHECK (jsonb_typeof(filters_json) = 'object')
);

CREATE TABLE IF NOT EXISTS dashboard_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  favorite_type TEXT NOT NULL CHECK (favorite_type IN ('report', 'category', 'team', 'dashboard')),
  favorite_id UUID,
  label TEXT NOT NULL,
  href TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dashboard_favorites_label_not_blank CHECK (length(trim(label)) > 0),
  CONSTRAINT dashboard_favorites_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

ALTER TABLE user_dashboard_preferences
  DROP CONSTRAINT IF EXISTS user_dashboard_preferences_default_view_id_fkey;
ALTER TABLE user_dashboard_preferences
  ADD CONSTRAINT user_dashboard_preferences_default_view_id_fkey
  FOREIGN KEY (default_view_id) REFERENCES dashboard_saved_views(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_saved_views_one_default
  ON dashboard_saved_views(user_id, team_id)
  WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_dashboard_saved_views_user_team
  ON dashboard_saved_views(user_id, team_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_dashboard_favorites_user_team
  ON dashboard_favorites(user_id, team_id, favorite_type, created_at DESC);

CREATE OR REPLACE FUNCTION touch_dashboard_customization_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS user_dashboard_preferences_touch_updated_at ON user_dashboard_preferences;
CREATE TRIGGER user_dashboard_preferences_touch_updated_at
  BEFORE UPDATE ON user_dashboard_preferences
  FOR EACH ROW EXECUTE FUNCTION touch_dashboard_customization_updated_at();

DROP TRIGGER IF EXISTS dashboard_saved_views_touch_updated_at ON dashboard_saved_views;
CREATE TRIGGER dashboard_saved_views_touch_updated_at
  BEFORE UPDATE ON dashboard_saved_views
  FOR EACH ROW EXECUTE FUNCTION touch_dashboard_customization_updated_at();

ALTER TABLE user_dashboard_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_saved_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own dashboard preferences" ON user_dashboard_preferences
  FOR ALL USING (auth.uid() = user_id AND is_team_member(team_id, auth.uid()))
  WITH CHECK (auth.uid() = user_id AND is_team_member(team_id, auth.uid()));

CREATE POLICY "Users manage own dashboard saved views" ON dashboard_saved_views
  FOR ALL USING (auth.uid() = user_id AND is_team_member(team_id, auth.uid()))
  WITH CHECK (auth.uid() = user_id AND is_team_member(team_id, auth.uid()));

CREATE POLICY "Users manage own dashboard favorites" ON dashboard_favorites
  FOR ALL USING (auth.uid() = user_id AND is_team_member(team_id, auth.uid()))
  WITH CHECK (auth.uid() = user_id AND is_team_member(team_id, auth.uid()));
