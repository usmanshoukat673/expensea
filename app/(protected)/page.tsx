import { requireTeam } from "@/lib/auth/session"
import { getDashboardData, getDashboardBalance, getDashboardHistoricalStats } from "@/lib/data/dashboard"
import { getDashboardBudgetSummary } from "@/lib/data/budgets"
import { getUpcomingRecurringExpenses } from "@/lib/data/recurring-expenses"
import { getDashboardCustomization } from "@/lib/data/dashboard-customization"
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
  const [data, balance, budgetSummary, historicalStats, upcomingRecurringExpenses, customization] = await Promise.all([
    getDashboardData(session.teamId, range, session.user.id),
    getDashboardBalance(session.teamId, session.user.id, range),
    getDashboardBudgetSummary(session.teamId, monthStartFromYMD(range.from)),
    getDashboardHistoricalStats(session.teamId),
    getUpcomingRecurringExpenses(session.teamId, 5),
    getDashboardCustomization(session.teamId, session.user.id, session.role ?? "viewer"),
  ])

  const categoryEntries = data.monthlyEntries.map((e) => {
    const category = (e as { expense_categories?: { id: string; name: string; color: string } | { id: string; name: string; color: string }[] | null }).expense_categories
    return {
    amount: e.amount,
    lunch_date: e.lunch_date,
    category_id: (e as { category_id?: string }).category_id,
    expense_categories: Array.isArray(category) ? category[0] ?? null : category ?? null,
  }})
  const myEntries = data.monthlyEntries.filter((entry) => {
    const row = entry as { user_id?: string; assigned_user_id?: string | null; submitted_by?: string | null; approval_status?: string }
    return row.user_id === session.user.id || row.assigned_user_id === session.user.id || row.submitted_by === session.user.id
  })
  const myAssignedEntries = data.monthlyEntries.filter((entry) => {
    const row = entry as { assigned_user_id?: string | null }
    return row.assigned_user_id === session.user.id
  })

  return (
    <DashboardContent
      stats={data.stats}
      recentEntries={data.recentEntries}
      monthlyEntries={data.monthlyEntries}
      categoryEntries={categoryEntries}
      activity={data.activity}
      notificationSummary={data.notificationSummary}
      leaderboard={data.leaderboard}
      mostActiveMembers={data.mostActiveMembers}
      highestAssignedExpenses={data.highestAssignedExpenses}
      personalDashboard={{
        monthlyExpenses: myEntries.reduce((sum, entry) => sum + Number(entry.amount), 0),
        assignedExpenses: myAssignedEntries.reduce((sum, entry) => sum + Number(entry.amount), 0),
        settlements: balance.personal.youOwe + balance.personal.youReceive,
        pendingApprovals: myEntries.filter((entry) => (entry as { approval_status?: string }).approval_status === "pending_approval").length,
        budgetImpact: myEntries.reduce((sum, entry) => sum + Number(entry.amount), 0),
      }}
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
      customization={customization}
    />
  )
}
