import { requireTeam } from "@/lib/auth/session"
import { getDashboardData, getDashboardBalance } from "@/lib/data/dashboard"
import { DashboardContent } from "@/components/dashboard-content"

export default async function DashboardPage() {
  const session = await requireTeam()
  const [data, balance] = await Promise.all([
    getDashboardData(session.teamId),
    getDashboardBalance(session.teamId, session.user.id),
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
    />
  )
}
