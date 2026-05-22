export const DEFAULT_CATEGORY_TEMPLATES = [
  { name: 'Food', slug: 'food', icon: 'utensils', color: '#f97316', description: 'Meals, groceries, and dining' },
  { name: 'Travel', slug: 'travel', icon: 'plane', color: '#0ea5e9', description: 'Transport and trips' },
  { name: 'Office', slug: 'office', icon: 'briefcase', color: '#8b5cf6', description: 'Office supplies and workspace' },
  { name: 'Internet', slug: 'internet', icon: 'wifi', color: '#06b6d4', description: 'Internet and connectivity' },
  { name: 'Utilities', slug: 'utilities', icon: 'zap', color: '#eab308', description: 'Bills and utilities' },
  { name: 'Entertainment', slug: 'entertainment', icon: 'tv', color: '#ec4899', description: 'Events and leisure' },
  { name: 'Miscellaneous', slug: 'miscellaneous', icon: 'layers', color: '#64748b', description: 'Other expenses' },
] as const;

export function categorySlugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return base || 'category';
}
