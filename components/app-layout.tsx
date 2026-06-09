"use client"

import { useCallback, useEffect, useState } from "react"
import { Sidebar } from "./sidebar"
import { DesktopHeader, Navbar } from "./navbar"
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav"
import { FloatingActionButton } from "@/components/layout/floating-action-button"
import { PageTransition } from "@/components/layout/page-transition"
import { NotificationsBell } from "@/components/notifications/notifications-bell"
import { useTeam } from "@/hooks/use-team"
import type { Notification, TeamRole } from "@/lib/database.types"

const SIDEBAR_COLLAPSED_KEY = "expensea:sidebar-collapsed"
const HEADER_ICON_BUTTON_CLASS =
  "text-foreground hover:bg-accent/10 hover:text-foreground dark:hover:bg-muted/50 dark:hover:text-foreground"

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const effectiveRole = activeRole ?? role
  const canEdit = effectiveRole === "owner" || effectiveRole === "admin"

  useEffect(() => {
    setSidebarCollapsed(
      window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true",
    )
  }, [])

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((current) => {
      const next = !current
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
      return next
    })
  }, [])

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
      <Sidebar
        role={effectiveRole}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebar}
      />
      <DesktopHeader
        user={user}
        teamSlug={teamSlug}
        teamId={teamId}
        notificationBell={
          <NotificationsBell
            initialNotifications={initialNotifications}
            teamId={teamId}
            userId={userId}
            className={HEADER_ICON_BUTTON_CLASS}
          />
        }
        className={sidebarCollapsed ? "md:left-20" : "md:left-64"}
      />
      <main
        className={`relative mt-16 min-w-0 flex-1 overflow-x-hidden p-4 pb-24 transition-[margin,opacity] duration-200 md:mt-0 md:pb-8 md:pl-6 md:pr-6 md:pt-24 ${sidebarCollapsed ? "md:ml-20" : "md:ml-64"} ${switching ? "opacity-60 pointer-events-none" : ""}`}
      >
        <PageTransition>{children}</PageTransition>
      </main>
      <MobileBottomNav role={effectiveRole} />
      <FloatingActionButton canEdit={canEdit} />
    </div>
  )
}
