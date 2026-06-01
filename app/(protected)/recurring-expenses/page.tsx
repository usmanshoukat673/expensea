import { Suspense } from 'react';
import { requireTeam, canEdit } from '@/lib/auth/session';
import { getTeamCategories } from '@/lib/data/categories';
import { getRecurringExpenses } from '@/lib/data/recurring-expenses';
import { formatDateYMD } from '@/lib/budget/engine';
import { EntriesPageSkeleton } from '@/components/entries/entries-page-skeleton';
import { RecurringExpensesContent } from '@/components/recurring-expenses/recurring-expenses-content';

export const metadata = { title: 'Recurring expenses' };

export default async function RecurringExpensesPage() {
  const session = await requireTeam();
  const [{ recurringExpenses }, { categories }] = await Promise.all([
    getRecurringExpenses(session.teamId),
    getTeamCategories(session.teamId),
  ]);

  return (
    <Suspense fallback={<EntriesPageSkeleton />}>
      <RecurringExpensesContent
        recurringExpenses={recurringExpenses}
        categories={categories}
        canEdit={canEdit(session.role)}
        defaultStartDate={formatDateYMD(new Date())}
      />
    </Suspense>
  );
}
