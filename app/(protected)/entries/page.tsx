import { Suspense } from "react"
import { requireTeam, canEdit } from "@/lib/auth/session"
import { getDashboardData, getLunchEntries } from "@/lib/data/dashboard"
import { getTeamCategories } from "@/lib/data/categories"
import { formatDateYMD } from "@/lib/budget/engine"
import { EntriesPageContent } from "@/components/entries/entries-page-content"
import { EntriesPageSkeleton } from "@/components/entries/entries-page-skeleton"
import { getDateRange } from "@/lib/date-ranges"

export const metadata = { title: "Entries" }

export default async function EntriesPage({
  searchParams,
}: {
  searchParams?: Promise<{ dateRange?: string; from?: string; to?: string }>
}) {
  const params = await searchParams
  const range = getDateRange(params?.dateRange, params?.from, params?.to)
  const session = await requireTeam()
  const [{ entries }, { members }, { categories }] = await Promise.all([
    getLunchEntries(session.teamId, { limit: 200, from: range.from, to: range.to }),
    getDashboardData(session.teamId, range),
    getTeamCategories(session.teamId),
  ])

  const recentCategoryIds = [
    ...new Set(
      entries
        .map((e) => e.category_id)
        .filter((id): id is string => !!id),
    ),
  ].slice(0, 5)

  const memberList = members.map((m) => ({
    user_id: m.user_id,
    name: m.profiles?.full_name ?? m.profiles?.email ?? "Member",
    avatar_url: m.profiles?.avatar_url ?? null,
  }))

  const defaultLunchDate = formatDateYMD(new Date())
  const canManageEntries = canEdit(session.role)

  return (
    <Suspense fallback={<EntriesPageSkeleton />}>
      <EntriesPageContent
        entries={entries}
        members={memberList}
        categories={categories}
        recentCategoryIds={recentCategoryIds}
        canCreateEntry
        canManageEntries={canManageEntries}
        currentUserId={session.user.id}
        defaultLunchDate={defaultLunchDate}
        dateRange={range}
      />
    </Suspense>
  )
}
