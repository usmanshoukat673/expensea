import { Suspense } from "react"
import { requireTeam, canEdit } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import { AppLayout } from "@/components/app-layout"
import { RealtimeProvider } from "@/components/providers/realtime-provider"
import { CurrencyProvider } from "@/components/providers/currency-provider"
import { TeamProvider } from "@/components/providers/team-provider"
import { CommandPalette } from "@/components/command-palette"
import { NotificationsBell } from "@/components/notifications/notifications-bell"
import { getNotifications } from "@/lib/data/dashboard"
import { NavigationProgress } from "@/components/layout/navigation-progress"
import { normalizeCurrencyCode } from "@/lib/currency"
import { listUserTeams } from "@/lib/auth/teams"

export const dynamic = "force-dynamic"

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireTeam()
  const supabase = await createClient()
  const [teams, teamRes, notifications] = await Promise.all([
    listUserTeams(supabase, session.user.id),
    supabase
      .from("teams")
      .select("name, slug, currency")
      .eq("id", session.teamId)
      .single(),
    getNotifications(session.user.id),
  ])
  const team = teamRes.data

  const userCanEdit = canEdit(session.role)
  const currencyCode = normalizeCurrencyCode(team?.currency)

  return (
    <TeamProvider
      initialTeams={teams}
      initialActiveTeamId={session.teamId}
      initialRole={session.role}
    >
      <CurrencyProvider initialCode={currencyCode} canEdit={userCanEdit}>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <AppLayout
          user={{
            name: session.profile.full_name ?? "User",
            email: session.profile.email ?? "",
            avatar: session.profile.avatar_url,
          }}
          teamName={team?.name ?? "Team"}
          role={session.role}
          teamId={session.teamId}
          teamSlug={team?.slug}
        >
          <RealtimeProvider teamId={session.teamId} />
          <div className="fixed top-4 right-4 z-30 hidden md:block">
            <NotificationsBell initialNotifications={notifications} />
          </div>
          <CommandPalette canEdit={userCanEdit} />
          {children}
        </AppLayout>
      </CurrencyProvider>
    </TeamProvider>
  )
}
