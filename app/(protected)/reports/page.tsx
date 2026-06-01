import { requireTeam } from "@/lib/auth/session"
import { getReportsData } from "@/lib/data/reports"
import { getDateRange } from "@/lib/date-ranges"
import { ReportsContent } from "@/components/reports/reports-content"

export const metadata = { title: "Reports" }

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ dateRange?: string; from?: string; to?: string }>
}) {
  const params = await searchParams
  const range = getDateRange(params?.dateRange ?? "this_month", params?.from, params?.to)
  const session = await requireTeam()
  const data = await getReportsData(session.teamId, range)

  return <ReportsContent data={data} />
}
