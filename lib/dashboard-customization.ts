import type { Json, TeamRole } from '@/lib/database.types';

export const DASHBOARD_WIDGETS = [
  'summary',
  'workflow',
  'historical',
  'quick_actions',
  'balance',
  'budget',
  'monthly_overview',
  'categories',
  'recent_entries',
  'leaderboard',
  'recurring',
  'activity',
  'notifications',
] as const;

export type DashboardWidgetId = (typeof DASHBOARD_WIDGETS)[number];

export type DashboardLayout = {
  widgets: DashboardWidgetId[];
};

export type DashboardFilters = {
  dateRange?: string;
  from?: string;
  to?: string;
  category?: string;
  budget?: string;
  status?: string;
  team?: string;
};

export type DashboardPinnedWidget = DashboardWidgetId | 'reports' | 'categories' | 'teams' | 'dashboards';

export type DashboardPreferencePayload = {
  id?: string;
  layout: DashboardLayout;
  hiddenWidgets: DashboardWidgetId[];
  pinnedWidgets: DashboardPinnedWidget[];
  defaultViewId: string | null;
};

export type DashboardSavedViewPayload = {
  id: string;
  name: string;
  layout: DashboardLayout;
  hiddenWidgets: DashboardWidgetId[];
  pinnedWidgets: DashboardPinnedWidget[];
  filters: DashboardFilters;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DashboardFavoritePayload = {
  id: string;
  favoriteType: 'report' | 'category' | 'team' | 'dashboard';
  favoriteId: string | null;
  label: string;
  href: string | null;
  metadata: Record<string, unknown>;
};

export type DashboardCustomizationPayload = {
  preference: DashboardPreferencePayload;
  savedViews: DashboardSavedViewPayload[];
  favorites: DashboardFavoritePayload[];
};

export const WIDGET_LABELS: Record<DashboardWidgetId, string> = {
  summary: 'Summary',
  workflow: 'Approvals',
  historical: 'Analytics',
  quick_actions: 'Quick actions',
  balance: 'Settlements',
  budget: 'Budget',
  monthly_overview: 'Monthly overview',
  categories: 'Categories',
  recent_entries: 'Expenses',
  leaderboard: 'Leaderboard',
  recurring: 'Recurring expenses',
  activity: 'Activity',
  notifications: 'Notifications',
};

export function roleAwareWidgetOrder(role: TeamRole): DashboardWidgetId[] {
  if (role === 'owner') {
    return [
      'summary',
      'budget',
      'monthly_overview',
      'workflow',
      'quick_actions',
      'balance',
      'categories',
      'recent_entries',
      'leaderboard',
      'recurring',
      'activity',
      'notifications',
      'historical',
    ];
  }

  if (role === 'admin') {
    return [
      'summary',
      'workflow',
      'activity',
      'recent_entries',
      'quick_actions',
      'budget',
      'balance',
      'monthly_overview',
      'categories',
      'leaderboard',
      'recurring',
      'notifications',
      'historical',
    ];
  }

  return [
    'summary',
    'recent_entries',
    'activity',
    'quick_actions',
    'balance',
    'monthly_overview',
    'categories',
    'leaderboard',
    'recurring',
    'notifications',
    'budget',
    'workflow',
    'historical',
  ];
}

export function defaultHiddenWidgets(role: TeamRole): DashboardWidgetId[] {
  return role === 'viewer' ? ['workflow'] : [];
}

export function normalizeWidgetOrder(value: unknown, role: TeamRole): DashboardWidgetId[] {
  const defaults = roleAwareWidgetOrder(role);
  const input = Array.isArray(value) ? value : [];
  const seen = new Set<string>();
  const ordered = input.filter((item): item is DashboardWidgetId => {
    if (!DASHBOARD_WIDGETS.includes(item as DashboardWidgetId) || seen.has(String(item))) return false;
    seen.add(String(item));
    return true;
  });
  for (const widget of defaults) {
    if (!seen.has(widget)) ordered.push(widget);
  }
  return ordered;
}

export function normalizeHiddenWidgets(value: unknown, role: TeamRole): DashboardWidgetId[] {
  const input = Array.isArray(value) ? value : defaultHiddenWidgets(role);
  return input.filter((item): item is DashboardWidgetId => DASHBOARD_WIDGETS.includes(item as DashboardWidgetId));
}

export function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}
