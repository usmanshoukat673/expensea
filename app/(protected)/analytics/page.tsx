import { Suspense } from "react"
import { requireTeam } from "@/lib/auth/session"
import { getAnalyticsData } from "@/lib/data/dashboard"
import { getAnalyticsBudgetData } from "@/lib/data/budgets"
import { AnalyticsContent } from "@/components/analytics/analytics-content"
import { AnalyticsSkeleton } from "@/components/loaders/analytics-skeleton"

export const metadata = { title: "Analytics" }

async function AnalyticsData() {
  const session = await requireTeam()
  const [{ entries, categories }, budgetData] = await Promise.all([
    getAnalyticsData(session.teamId),
    getAnalyticsBudgetData(session.teamId),
  ])
  return (
    <AnalyticsContent
      entries={entries}
      categories={categories}
      budgetComparison={budgetData.comparison}
      budgetCategoryBreakdown={budgetData.categoryBreakdown}
      hasMonthlyBudget={budgetData.hasMonthlyBudget}
    />
  )
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <AnalyticsData />
    </Suspense>
  )
}
