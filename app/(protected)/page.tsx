import { requireTeam } from "@/lib/auth/session"
import { getDashboardData, getDashboardBalance, getDashboardHistoricalStats } from "@/lib/data/dashboard"
import { getDashboardBudgetSummary } from "@/lib/data/budgets"
import { getUpcomingRecurringExpenses } from "@/lib/data/recurring-expenses"
import { DashboardContent } from "@/components/dashboard-content"
import { getDateRange, monthStartFromYMD } from "@/lib/date-ranges"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ dateRange?: string; from?: string; to?: string }>
}) {
  const params = await searchParams
  const range = getDateRange(params?.dateRange, params?.from, params?.to)
  const session = await requireTeam()
  const [data, balance, budgetSummary, historicalStats, upcomingRecurringExpenses] = await Promise.all([
    getDashboardData(session.teamId, range),
    getDashboardBalance(session.teamId, session.user.id, range),
    getDashboardBudgetSummary(session.teamId, monthStartFromYMD(range.from)),
    getDashboardHistoricalStats(session.teamId),
    getUpcomingRecurringExpenses(session.teamId, 5),
  ])

  const categoryEntries = data.monthlyEntries.map((e) => ({
    amount: e.amount,
    lunch_date: e.lunch_date,
    category_id: (e as { category_id?: string }).category_id,
    expense_categories: (e as { expense_categories?: { id: string; name: string; color: string } }).expense_categories,
  }))

  return (
    <DashboardContent
      stats={data.stats}
      recentEntries={data.recentEntries}
      monthlyEntries={data.monthlyEntries}
      categoryEntries={categoryEntries}
      activity={data.activity}
      leaderboard={data.leaderboard}
      balance={{
        pendingTotal: balance.pendingTotal,
        youOwe: balance.personal.youOwe,
        youReceive: balance.personal.youReceive,
        recentSettlements: balance.recentCompleted,
      }}
      budgetSummary={budgetSummary}
      dateRange={range}
      historicalStats={historicalStats}
      upcomingRecurringExpenses={upcomingRecurringExpenses}
    />
  )
}
