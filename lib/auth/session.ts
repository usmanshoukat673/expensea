import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ensureUserProfile } from "@/lib/auth/ensure-profile"
import { resolveWorkspace, sessionHasWorkspace } from "@/lib/auth/workspace"
import type { TeamRole } from "@/lib/database.types"

export type SessionContext = {
  user: { id: string; email?: string }
  profile: import("@/lib/database.types").Profile
  teamId: string | null
  role: TeamRole | null
  hasMembership?: boolean
}

export async function getSession(): Promise<SessionContext | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  let workspace = await resolveWorkspace(supabase, user.id)
  if (!workspace.profile) {
    const profile = await ensureUserProfile(supabase, user)
    if (!profile) return null
    workspace = await resolveWorkspace(supabase, user.id)
  }
  if (!workspace.profile) return null

  return {
    user: { id: user.id, email: user.email },
    profile: workspace.profile,
    teamId: workspace.teamId,
    role: workspace.role,
    hasMembership: workspace.hasMembership,
  }
}

export async function requireAuth(): Promise<SessionContext> {
  const session = await getSession()
  if (!session) redirect("/login")
  return session
}

export async function requireTeam(): Promise<
  SessionContext & { teamId: string }
> {
  const session = await requireAuth()
  if (!sessionHasWorkspace(session)) {
    redirect("/onboarding")
  }
  return session as SessionContext & { teamId: string }
}

export function canEdit(role: TeamRole | null): boolean {
  return role === "owner" || role === "admin"
}

export function isOwner(role: TeamRole | null): boolean {
  return role === "owner"
}
