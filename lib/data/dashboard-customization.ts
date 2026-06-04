import { createClient } from '@/lib/supabase/server';
import type { TeamRole } from '@/lib/database.types';
import {
  defaultHiddenWidgets,
  normalizeHiddenWidgets,
  normalizeWidgetOrder,
  roleAwareWidgetOrder,
  type DashboardCustomizationPayload,
  type DashboardFavoritePayload,
  type DashboardFilters,
  type DashboardPinnedWidget,
  type DashboardSavedViewPayload,
  type DashboardWidgetId,
} from '@/lib/dashboard-customization';

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function mapSavedView(row: Record<string, unknown>, role: TeamRole): DashboardSavedViewPayload {
  const layout = asObject(row.layout_json);
  return {
    id: String(row.id),
    name: String(row.name),
    layout: { widgets: normalizeWidgetOrder(layout.widgets, role) },
    hiddenWidgets: normalizeHiddenWidgets(row.hidden_widgets, role),
    pinnedWidgets: asStringArray(row.pinned_widgets) as DashboardPinnedWidget[],
    filters: asObject(row.filters_json) as DashboardFilters,
    isDefault: Boolean(row.is_default),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function getDashboardCustomization(
  teamId: string,
  userId: string,
  role: TeamRole,
): Promise<DashboardCustomizationPayload> {
  const supabase = await createClient();
  const [preferenceResult, viewsResult, favoritesResult] = await Promise.all([
    supabase
      .from('user_dashboard_preferences')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('dashboard_saved_views')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false }),
    supabase
      .from('dashboard_favorites')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(12),
  ]);

  const pref = preferenceResult.data;
  const layout = asObject(pref?.layout_json);
  const savedViews = ((viewsResult.data ?? []) as Record<string, unknown>[]).map((row) =>
    mapSavedView(row, role),
  );
  const defaultView = savedViews.find((view) => view.id === pref?.default_view_id || view.isDefault);

  const favorites: DashboardFavoritePayload[] = ((favoritesResult.data ?? []) as Record<string, unknown>[]).map(
    (row) => ({
      id: String(row.id),
      favoriteType: row.favorite_type as DashboardFavoritePayload['favoriteType'],
      favoriteId: row.favorite_id ? String(row.favorite_id) : null,
      label: String(row.label),
      href: row.href ? String(row.href) : null,
      metadata: asObject(row.metadata),
    }),
  );

  return {
    preference: {
      id: pref?.id,
      layout: {
        widgets: defaultView?.layout.widgets ?? normalizeWidgetOrder(layout.widgets, role),
      },
      hiddenWidgets: defaultView?.hiddenWidgets ?? normalizeHiddenWidgets(pref?.hidden_widgets, role),
      pinnedWidgets: (defaultView?.pinnedWidgets ?? asStringArray(pref?.pinned_widgets)) as DashboardPinnedWidget[],
      defaultViewId: pref?.default_view_id ?? defaultView?.id ?? null,
    },
    savedViews,
    favorites,
  };
}

export function buildDefaultCustomization(role: TeamRole): DashboardCustomizationPayload {
  return {
    preference: {
      layout: { widgets: roleAwareWidgetOrder(role) },
      hiddenWidgets: defaultHiddenWidgets(role) as DashboardWidgetId[],
      pinnedWidgets: [],
      defaultViewId: null,
    },
    savedViews: [],
    favorites: [],
  };
}
