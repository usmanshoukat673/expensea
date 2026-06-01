import { requireTeam, canEdit } from '@/lib/auth/session';
import { getBudgetPageData } from '@/lib/data/budgets';
import { BudgetsContent } from '@/components/budgets/budgets-content';
import { getDateRange, monthStartFromYMD } from '@/lib/date-ranges';

export const metadata = { title: 'Budgets' };

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams?: Promise<{ dateRange?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const range = getDateRange(params?.dateRange, params?.from, params?.to);
  const session = await requireTeam();
  const { budgets, usages, categories, monthStart } = await getBudgetPageData(
    session.teamId,
    monthStartFromYMD(range.from),
  );

  return (
    <BudgetsContent
      budgets={budgets}
      usages={usages}
      categories={categories}
      canEdit={canEdit(session.role)}
      monthStart={monthStart}
      dateRange={range}
    />
  );
}
