import { Suspense } from "react"
import { requireTeam, canEdit } from "@/lib/auth/session"
import { getDashboardData, getLunchEntries } from "@/lib/data/dashboard"
import { getTeamCategories } from "@/lib/data/categories"
import { formatDateYMD } from "@/lib/budget/engine"
import { EntriesPageContent } from "@/components/entries/entries-page-content"
import { EntriesPageSkeleton } from "@/components/entries/entries-page-skeleton"

export const metadata = { title: "Entries" }

export default async function EntriesPage() {
  const session = await requireTeam()
  const [{ entries }, { members }, { categories }] = await Promise.all([
    getLunchEntries(session.teamId, { limit: 200 }),
    getDashboardData(session.teamId),
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
  }))

  const defaultLunchDate = formatDateYMD(new Date())

  return (
    <Suspense fallback={<EntriesPageSkeleton />}>
      <EntriesPageContent
        entries={entries}
        members={memberList}
        categories={categories}
        recentCategoryIds={recentCategoryIds}
        canEdit={canEdit(session.role)}
        defaultLunchDate={defaultLunchDate}
      />
    </Suspense>
  )
}
