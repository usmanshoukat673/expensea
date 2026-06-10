import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { resolveWorkspace, sessionHasWorkspace } from "@/lib/auth/workspace"
import type { TeamRole } from "@/lib/database.types"

export type SessionContext = {
  user: { id: string; email?: string }
  profile: import("@/lib/database.types").Profile
  teamId: string | null
  role: TeamRole | null
  hasMembership?: boolean
}

export type CurrentUserValidation =
  | { valid: true; session: SessionContext }
  | {
      valid: false
      reason:
        | "no_session"
        | "session_expired"
        | "profile_missing"
        | "account_deleted"
        | "team_access_invalid"
    }

export const AUTH_STATUS_MESSAGES = {
  session_expired: "Your session has expired. Please sign in again.",
  profile_missing:
    "Your account is not registered in Expensea. Please create an account or contact your administrator.",
  account_deleted: "Your account no longer exists. Please create a new account.",
  team_access_invalid: "Your team access is no longer valid. Please join or create a team.",
} as const

export async function validateCurrentUser(): Promise<CurrentUserValidation> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (!user) {
    return { valid: false, reason: error ? "session_expired" : "no_session" }
  }

  const workspace = await resolveWorkspace(supabase, user.id)
  if (!workspace.profile) {
    return { valid: false, reason: "profile_missing" }
  }
  if (workspace.profile.status !== "active") {
    return { valid: false, reason: "account_deleted" }
  }

  return {
    valid: true,
    session: {
      user: { id: user.id, email: user.email },
      profile: workspace.profile,
      teamId: workspace.teamId,
      role: workspace.role,
      hasMembership: workspace.hasMembership,
    },
  }
}

export async function invalidateCurrentSession() {
  const supabase = await createClient()
  await supabase.auth.signOut()
}

export async function getSession(): Promise<SessionContext | null> {
  const validation = await validateCurrentUser()
  return validation.valid ? validation.session : null
}

export async function requireAuth(): Promise<SessionContext> {
  const validation = await validateCurrentUser()
  if (!validation.valid) {
    if (validation.reason !== "no_session") {
      await invalidateCurrentSession()
    }
    redirect(`/login?authStatus=${validation.reason}`)
  }
  return validation.session
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
