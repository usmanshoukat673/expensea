"use client"

import { Sidebar } from "./sidebar"
import { Navbar } from "./navbar"
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav"
import { FloatingActionButton } from "@/components/layout/floating-action-button"
import { PageTransition } from "@/components/layout/page-transition"
import { NotificationsBell } from "@/components/notifications/notifications-bell"
import { useTeam } from "@/hooks/use-team"
import type { Notification, TeamRole } from "@/lib/database.types"

export type AppLayoutUser = {
  name: string
  email: string
  avatar: string | null
}

export function AppLayout({
  children,
  user,
  teamName,
  role,
  teamId,
  teamSlug,
  initialNotifications,
  userId,
}: {
  children: React.ReactNode
  user: AppLayoutUser
  teamName: string
  role: TeamRole | null
  teamId: string
  teamSlug?: string
  initialNotifications: Notification[]
  userId: string
}) {
  const { role: activeRole, switching } = useTeam()
  const effectiveRole = activeRole ?? role
  const canEdit = effectiveRole === "owner" || effectiveRole === "admin"

  return (
    <div
      className="flex min-h-dvh w-full overflow-x-hidden bg-background"
      data-team-switching={switching ? "true" : undefined}
    >
      <Navbar
        user={user}
        teamName={teamName}
        role={effectiveRole}
        notificationBell={
          <NotificationsBell
            initialNotifications={initialNotifications}
            teamId={teamId}
            userId={userId}
          />
        }
      />
      <Sidebar role={effectiveRole} teamSlug={teamSlug} teamId={teamId} />
      <main
        className={`relative mt-16 min-w-0 flex-1 overflow-x-hidden p-4 pb-24 transition-opacity duration-200 md:ml-64 md:mt-0 md:py-6 md:pl-6 md:pr-20 ${switching ? "opacity-60 pointer-events-none" : ""}`}
      >
        <div className="fixed right-5 top-4 z-30 hidden md:block">
          <NotificationsBell
            initialNotifications={initialNotifications}
            teamId={teamId}
            userId={userId}
          />
        </div>
        <PageTransition>{children}</PageTransition>
      </main>
      <MobileBottomNav role={effectiveRole} />
      <FloatingActionButton canEdit={canEdit} />
    </div>
  )
}
