import { createClient } from "@/lib/supabase/server"
import type { Notification, Profile } from "@/lib/database.types"

export type NotificationStatus = "all" | "unread" | "read" | "archived"

export type NotificationQuery = {
  status?: NotificationStatus
  search?: string
  page?: number
  limit?: number
}

export async function getNotificationsPage(
  userId: string,
  teamId: string,
  opts: NotificationQuery = {},
) {
  const supabase = await createClient()
  const page = opts.page ?? 1
  const limit = opts.limit ?? 20
  const from = (page - 1) * limit

  let query = supabase
    .from("notifications")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .eq("team_id", teamId)
    .order("created_at", { ascending: false })

  if (opts.status === "unread") query = query.eq("is_read", false).is("archived_at", null)
  else if (opts.status === "read") query = query.eq("is_read", true).is("archived_at", null)
  else if (opts.status === "archived") query = query.not("archived_at", "is", null)
  else query = query.is("archived_at", null)

  if (opts.search?.trim()) {
    const q = opts.search.trim()
    query = query.or(`title.ilike.%${q}%,message.ilike.%${q}%,body.ilike.%${q}%`)
  }

  const { data, count, error } = await query.range(from, from + limit - 1)

  return {
    notifications: (data ?? []) as Notification[],
    total: count ?? 0,
    page,
    limit,
    error,
  }
}

export async function getNotificationSummary(userId: string, teamId: string) {
  const supabase = await createClient()
  const [unreadRes, pendingRes, latestRes] = await Promise.all([
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("team_id", teamId)
      .eq("is_read", false)
      .is("archived_at", null),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("team_id", teamId)
      .eq("is_read", false)
      .is("archived_at", null)
      .not("link", "is", null),
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .eq("team_id", teamId)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  return {
    unreadCount: unreadRes.count ?? 0,
    pendingActions: pendingRes.count ?? 0,
    latest: (latestRes.data ?? []) as Notification[],
  }
}

export async function attachActivityProfiles<T extends { user_id: string | null }>(
  rows: T[],
): Promise<(T & { profiles?: Pick<Profile, "id" | "full_name" | "avatar_url"> | null })[]> {
  if (!rows.length) return []
  const supabase = await createClient()
  const ids = [...new Set(rows.map((row) => row.user_id).filter(Boolean))] as string[]
  if (!ids.length) return rows.map((row) => ({ ...row, profiles: null }))

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", ids)
  const profiles = new Map((data ?? []).map((profile) => [profile.id, profile]))

  return rows.map((row) => ({
    ...row,
    profiles: row.user_id ? (profiles.get(row.user_id) ?? null) : null,
  }))
}
