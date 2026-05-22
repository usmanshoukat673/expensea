import { Suspense } from "react"
import { requireTeam } from "@/lib/auth/session"
import { getAnalyticsData } from "@/lib/data/dashboard"
import { AnalyticsContent } from "@/components/analytics/analytics-content"
import { AnalyticsSkeleton } from "@/components/loaders/analytics-skeleton"

export const metadata = { title: "Analytics" }

async function AnalyticsData() {
  const session = await requireTeam()
  const { entries } = await getAnalyticsData(session.teamId)
  return <AnalyticsContent entries={entries} />
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <AnalyticsData />
    </Suspense>
  )
}
