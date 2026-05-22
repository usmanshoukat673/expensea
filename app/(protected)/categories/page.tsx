import { requireTeam, canEdit } from '@/lib/auth/session';
import { getTeamCategories, getCategoryUsageCounts } from '@/lib/data/categories';
import { CategoriesContent } from '@/components/categories/categories-content';

export const metadata = { title: 'Categories' };

export default async function CategoriesPage() {
  const session = await requireTeam();
  const [{ categories }, usageMap] = await Promise.all([
    getTeamCategories(session.teamId),
    getCategoryUsageCounts(session.teamId),
  ]);

  const usageCounts: Record<string, number> = {};
  usageMap.forEach((count, id) => {
    usageCounts[id] = count;
  });

  return (
    <CategoriesContent
      categories={categories}
      usageCounts={usageCounts}
      canEdit={canEdit(session.role)}
    />
  );
}
