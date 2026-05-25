import { requireTeam, canEdit } from '@/lib/auth/session';
import { getBudgetPageData } from '@/lib/data/budgets';
import { BudgetsContent } from '@/components/budgets/budgets-content';

export const metadata = { title: 'Budgets' };

export default async function BudgetsPage() {
  const session = await requireTeam();
  const { budgets, usages, categories, monthStart } = await getBudgetPageData(
    session.teamId,
  );

  return (
    <BudgetsContent
      budgets={budgets}
      usages={usages}
      categories={categories}
      canEdit={canEdit(session.role)}
      monthStart={monthStart}
    />
  );
}
