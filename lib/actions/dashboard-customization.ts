'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireTeam } from '@/lib/auth/session';
import {
  DASHBOARD_WIDGETS,
  normalizeHiddenWidgets,
  normalizeWidgetOrder,
  toJson,
  type DashboardFilters,
  type DashboardPinnedWidget,
  type DashboardWidgetId,
} from '@/lib/dashboard-customization';

type ActionResult = { success?: boolean; error?: string; id?: string };

type DashboardStateInput = {
  widgets: DashboardWidgetId[];
  hiddenWidgets: DashboardWidgetId[];
  pinnedWidgets?: DashboardPinnedWidget[];
};

function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, 80);
}

function cleanState(input: DashboardStateInput, role: NonNullable<Awaited<ReturnType<typeof requireTeam>>['role']>) {
  const pinned = Array.isArray(input.pinnedWidgets) ? input.pinnedWidgets.filter((item) => typeof item === 'string') : [];
  return {
    layout_json: toJson({ widgets: normalizeWidgetOrder(input.widgets, role) }),
    hidden_widgets: toJson(normalizeHiddenWidgets(input.hiddenWidgets, role)),
    pinned_widgets: toJson(pinned),
  };
}

export async function saveDashboardPreference(input: DashboardStateInput): Promise<ActionResult> {
  const session = await requireTeam();
  const role = session.role ?? 'viewer';
  const supabase = await createClient();
  const { error } = await supabase.from('user_dashboard_preferences').upsert(
    {
      user_id: session.user.id,
      team_id: session.teamId,
      ...cleanState(input, role),
    },
    { onConflict: 'user_id,team_id' },
  );

  if (error) return { error: error.message };
  revalidatePath('/');
  return { success: true };
}

export async function createDashboardView(
  name: string,
  input: DashboardStateInput & { filters?: DashboardFilters },
): Promise<ActionResult> {
  const session = await requireTeam();
  const role = session.role ?? 'viewer';
  const viewName = cleanName(name);
  if (!viewName) return { error: 'Name the saved view first.' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('dashboard_saved_views')
    .insert({
      user_id: session.user.id,
      team_id: session.teamId,
      name: viewName,
      ...cleanState(input, role),
      filters_json: toJson(input.filters ?? {}),
    })
    .select('id')
    .single();

  if (error) return { error: error.message };
  revalidatePath('/');
  return { success: true, id: data.id };
}

export async function renameDashboardView(id: string, name: string): Promise<ActionResult> {
  const session = await requireTeam();
  const viewName = cleanName(name);
  if (!viewName) return { error: 'Name the saved view first.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('dashboard_saved_views')
    .update({ name: viewName })
    .eq('id', id)
    .eq('user_id', session.user.id)
    .eq('team_id', session.teamId);

  if (error) return { error: error.message };
  revalidatePath('/');
  return { success: true };
}

export async function deleteDashboardView(id: string): Promise<ActionResult> {
  const session = await requireTeam();
  const supabase = await createClient();
  await supabase
    .from('user_dashboard_preferences')
    .update({ default_view_id: null })
    .eq('default_view_id', id)
    .eq('user_id', session.user.id)
    .eq('team_id', session.teamId);

  const { error } = await supabase
    .from('dashboard_saved_views')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id)
    .eq('team_id', session.teamId);

  if (error) return { error: error.message };
  revalidatePath('/');
  return { success: true };
}

export async function duplicateDashboardView(id: string): Promise<ActionResult> {
  const session = await requireTeam();
  const supabase = await createClient();
  const { data: view, error: fetchError } = await supabase
    .from('dashboard_saved_views')
    .select('*')
    .eq('id', id)
    .eq('user_id', session.user.id)
    .eq('team_id', session.teamId)
    .single();

  if (fetchError) return { error: fetchError.message };

  const { data, error } = await supabase
    .from('dashboard_saved_views')
    .insert({
      user_id: session.user.id,
      team_id: session.teamId,
      name: `${view.name} copy`,
      layout_json: view.layout_json,
      hidden_widgets: view.hidden_widgets,
      pinned_widgets: view.pinned_widgets,
      filters_json: view.filters_json,
      is_default: false,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };
  revalidatePath('/');
  return { success: true, id: data.id };
}

export async function setDefaultDashboardView(id: string | null): Promise<ActionResult> {
  const session = await requireTeam();
  const supabase = await createClient();

  if (id) {
    const { data: view } = await supabase
      .from('dashboard_saved_views')
      .select('id')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .eq('team_id', session.teamId)
      .maybeSingle();
    if (!view) return { error: 'Saved view not found.' };
  }

  await supabase
    .from('dashboard_saved_views')
    .update({ is_default: false })
    .eq('user_id', session.user.id)
    .eq('team_id', session.teamId);

  if (id) {
    await supabase
      .from('dashboard_saved_views')
      .update({ is_default: true })
      .eq('id', id)
      .eq('user_id', session.user.id)
      .eq('team_id', session.teamId);
  }

  const { error } = await supabase.from('user_dashboard_preferences').upsert(
    {
      user_id: session.user.id,
      team_id: session.teamId,
      default_view_id: id,
    },
    { onConflict: 'user_id,team_id' },
  );

  if (error) return { error: error.message };
  revalidatePath('/');
  return { success: true };
}

export async function importDashboardSettings(payload: {
  widgets?: string[];
  hiddenWidgets?: string[];
  pinnedWidgets?: string[];
  filters?: DashboardFilters;
  name?: string;
}): Promise<ActionResult> {
  const widgets = (payload.widgets ?? []).filter((item): item is DashboardWidgetId =>
    DASHBOARD_WIDGETS.includes(item as DashboardWidgetId),
  );
  const hiddenWidgets = (payload.hiddenWidgets ?? []).filter((item): item is DashboardWidgetId =>
    DASHBOARD_WIDGETS.includes(item as DashboardWidgetId),
  );

  if (payload.name) {
    return createDashboardView(payload.name, {
      widgets,
      hiddenWidgets,
      pinnedWidgets: payload.pinnedWidgets as DashboardPinnedWidget[],
      filters: payload.filters,
    });
  }

  return saveDashboardPreference({
    widgets,
    hiddenWidgets,
    pinnedWidgets: payload.pinnedWidgets as DashboardPinnedWidget[],
  });
}

export async function toggleDashboardFavorite(input: {
  favoriteType: 'report' | 'category' | 'team' | 'dashboard';
  favoriteId?: string | null;
  label: string;
  href?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<ActionResult> {
  const session = await requireTeam();
  const label = cleanName(input.label);
  if (!label) return { error: 'Favorite needs a label.' };

  const supabase = await createClient();
  const base = supabase
    .from('dashboard_favorites')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('team_id', session.teamId)
    .eq('favorite_type', input.favoriteType)
    .eq('label', label);

  const { data: existing } = input.favoriteId
    ? await base.eq('favorite_id', input.favoriteId).maybeSingle()
    : await base.is('favorite_id', null).maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from('dashboard_favorites')
      .delete()
      .eq('id', existing.id)
      .eq('user_id', session.user.id)
      .eq('team_id', session.teamId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from('dashboard_favorites').insert({
      user_id: session.user.id,
      team_id: session.teamId,
      favorite_type: input.favoriteType,
      favorite_id: input.favoriteId ?? null,
      label,
      href: input.href ?? null,
      metadata: input.metadata ?? {},
    });
    if (error) return { error: error.message };
  }

  revalidatePath('/');
  return { success: true };
}
