import { requireTeam } from "@/lib/auth/session"
import { getDashboardData } from "@/lib/data/dashboard"
import { DashboardContent } from "@/components/dashboard-content"

export default async function DashboardPage() {
  const session = await requireTeam()
  const data = await getDashboardData(session.teamId)
  return (
    <DashboardContent
      stats={data.stats}
      recentEntries={data.recentEntries}
      monthlyEntries={data.monthlyEntries}
      activity={data.activity}
      leaderboard={data.leaderboard}
    />
  )
}
