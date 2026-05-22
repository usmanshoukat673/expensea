import { Suspense } from "react"
import { requireTeam, canEdit } from "@/lib/auth/session"
import { getDashboardData, getLunchEntries } from "@/lib/data/dashboard"
import { EntriesPageContent } from "@/components/entries/entries-page-content"
import { EntriesPageSkeleton } from "@/components/entries/entries-page-skeleton"

export const metadata = { title: "Entries" }

export default async function EntriesPage() {
  const session = await requireTeam()
  const [{ entries }, { members }] = await Promise.all([
    getLunchEntries(session.teamId, { limit: 200 }),
    getDashboardData(session.teamId),
  ])

  const memberList = members.map((m) => ({
    user_id: m.user_id,
    name: m.profiles?.full_name ?? m.profiles?.email ?? "Member",
  }))

  const defaultLunchDate = new Date().toISOString().slice(0, 10)

  return (
    <Suspense fallback={<EntriesPageSkeleton />}>
      <EntriesPageContent
        entries={entries}
        members={memberList}
        canEdit={canEdit(session.role)}
        defaultLunchDate={defaultLunchDate}
      />
    </Suspense>
  )
}
