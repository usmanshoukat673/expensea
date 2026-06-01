import { Suspense } from "react"
import { requireTeam } from "@/lib/auth/session"
import { getAnalyticsData } from "@/lib/data/dashboard"
import { getAnalyticsBudgetData } from "@/lib/data/budgets"
import { AnalyticsContent } from "@/components/analytics/analytics-content"
import { AnalyticsSkeleton } from "@/components/loaders/analytics-skeleton"
import { getDateRange } from "@/lib/date-ranges"

export const metadata = { title: "Analytics" }

async function AnalyticsData({
  searchParams,
}: {
  searchParams?: Promise<{ dateRange?: string; from?: string; to?: string }>
}) {
  const params = await searchParams
  const range = getDateRange(params?.dateRange, params?.from, params?.to)
  const session = await requireTeam()
  const [{ entries, categories }, budgetData] = await Promise.all([
    getAnalyticsData(session.teamId, { from: range.from, to: range.to }),
    getAnalyticsBudgetData(session.teamId, range),
  ])
  return (
    <AnalyticsContent
      entries={entries}
      categories={categories}
      dateRange={range}
      budgetComparison={budgetData.comparison}
      budgetCategoryBreakdown={budgetData.categoryBreakdown}
      hasMonthlyBudget={budgetData.hasMonthlyBudget}
    />
  )
}

export default function AnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<{ dateRange?: string; from?: string; to?: string }>
}) {
  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <AnalyticsData searchParams={searchParams} />
    </Suspense>
  )
}
