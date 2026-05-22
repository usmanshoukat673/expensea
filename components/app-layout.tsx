"use client"

import { Sidebar } from "./sidebar"
import { Navbar } from "./navbar"
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav"
import { FloatingActionButton } from "@/components/layout/floating-action-button"
import { PageTransition } from "@/components/layout/page-transition"
import type { TeamRole } from "@/lib/database.types"

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
}: {
  children: React.ReactNode
  user: AppLayoutUser
  teamName: string
  role: TeamRole | null
  teamId: string
  teamSlug?: string
}) {
  const canEdit = role === "owner" || role === "admin"

  return (
    <div className="flex min-h-screen bg-background">
      <Navbar user={user} teamName={teamName} />
      <Sidebar role={role} teamSlug={teamSlug} teamId={teamId} />
      <main className="relative flex-1 md:ml-64 mt-16 md:mt-0 p-4 md:p-6 pb-24 md:pb-6 max-w-[1600px]">
        <PageTransition>{children}</PageTransition>
      </main>
      <MobileBottomNav />
      <FloatingActionButton canEdit={canEdit} />
    </div>
  )
}
