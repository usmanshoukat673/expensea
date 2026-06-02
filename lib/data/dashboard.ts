import { createClient } from "@/lib/supabase/server"
import type { DateRangeValue } from "@/lib/date-ranges"
import type {
  ActivityLog,
  LunchEntry,
  LunchEntryWithProfile,
  MonthlySummary,
  Profile,
  TeamMemberWithProfile,
} from "@/lib/database.types"
import { getMonthEnd, getMonthStart } from "@/lib/budget/engine"

const FINANCIAL_APPROVAL_STATUSES = ["approved", "reimbursed"] as const

async function attachProfiles<T extends { user_id: string }>(
  items: T[],
): Promise<(T & { profiles: Pick<Profile, "id" | "full_name" | "email" | "avatar_url"> | null })[]> {
  if (!items.length) return []
  const supabase = await createClient()
  const ids = [...new Set(items.map((i) => i.user_id))]
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .in("id", ids)
  const map = new Map((profiles ?? []).map((p) => [p.id, p]))
  return items.map((item) => ({
    ...item,
    profiles: map.get(item.user_id) ?? null,
  }))
}

export async function getDashboardData(teamId: string, range?: Pick<DateRangeValue, "from" | "to">) {
  const supabase = await createClient()
  const now = new Date()
  const monthStart = range?.from ?? getMonthStart(now)
  const monthEnd = range?.to ?? getMonthEnd(monthStart)

  const [entriesRes, rangeEntriesRes, membersRes, activityRes] =
    await Promise.all([
      supabase
        .from("lunch_entries")
        .select("*, expense_categories(id, name, icon, color, slug)")
        .eq("team_id", teamId)
        .gte("lunch_date", monthStart)
        .lte("lunch_date", monthEnd)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("lunch_entries")
        .select("amount, lunch_date, payment_status, reimbursement_status, amount_reimbursed, user_id, category_id, expense_categories(id, name, icon, color)")
        .eq("team_id", teamId)
        .in("approval_status", FINANCIAL_APPROVAL_STATUSES)
        .gte("lunch_date", monthStart)
        .lte("lunch_date", monthEnd)
        .order("lunch_date", { ascending: true }),
      supabase.from("team_members").select("*").eq("team_id", teamId),
      supabase
        .from("team_activity_log")
        .select("*")
        .eq("team_id", teamId)
        .order("created_at", { ascending: false })
        .limit(10),
    ])

  const entriesRaw = entriesRes.data ?? []
  const membersRaw = membersRes.data ?? []
  const [recentEntries, members] = await Promise.all([
    attachProfiles(entriesRaw),
    attachProfiles(membersRaw),
  ])

  const rangeEntries = rangeEntriesRes.data ?? []
  const pendingApprovals = entriesRaw.filter((e) => e.approval_status === "pending_approval").length
  const approvedThisMonth = rangeEntries.length
  const rejectedExpenses = entriesRaw.filter((e) => e.approval_status === "rejected").length
  const reimbursementsOutstanding = rangeEntries
    .filter((e) => e.reimbursement_status !== "fully_reimbursed")
    .reduce((s, r) => s + Math.max(0, Number(r.amount) - Number((r as { amount_reimbursed?: number }).amount_reimbursed ?? 0)), 0)
  const totalPending = rangeEntries
    .filter((e) => e.payment_status === "unpaid")
    .reduce((s, r) => s + Number(r.amount), 0)
  const totalPaid = rangeEntries
    .filter((e) => e.payment_status === "paid")
    .reduce((s, r) => s + Number(r.amount), 0)
  const totalAmount = rangeEntries.reduce((s, r) => s + Number(r.amount), 0)

  const byUser = new Map<string, { total: number; pending: number; paid: number }>()
  rangeEntries.forEach((entry) => {
    const row = byUser.get(entry.user_id) ?? { total: 0, pending: 0, paid: 0 }
    const amount = Number(entry.amount)
    row.total += amount
    if (entry.payment_status === "paid") row.paid += amount
    else row.pending += amount
    byUser.set(entry.user_id, row)
  })

  const leaderboard = Array.from(byUser.entries())
    .map(([userId, row]) => {
      const member = members.find((m) => m.user_id === userId)
      return {
        userId,
        name: member?.profiles?.full_name ?? "Member",
        total: row.total,
        pending: row.pending,
        paid: row.paid,
      }
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  const activityIds = (activityRes.data ?? [])
    .map((a) => a.user_id)
    .filter(Boolean) as string[]
  let activity = activityRes.data ?? []
  if (activityIds.length) {
    const { data: actProfiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", activityIds)
    const pmap = new Map((actProfiles ?? []).map((p) => [p.id, p]))
    activity = activity.map((a) => ({
      ...a,
      profiles: a.user_id ? (pmap.get(a.user_id) ?? null) : null,
    }))
  }

  return {
    recentEntries: recentEntries as LunchEntryWithProfile[],
    monthlyEntries: rangeEntriesRes.data ?? [],
    summaries: [] as MonthlySummary[],
    members: members as TeamMemberWithProfile[],
    activity,
    stats: {
      totalAmount,
      totalPaid,
      totalPending,
      memberCount: members.length,
      pendingApprovals,
      approvedThisMonth,
      rejectedExpenses,
      reimbursementsOutstanding,
    },
    leaderboard,
  }
}

export async function getLunchEntries(
  teamId: string,
  opts?: {
    search?: string
    status?: string
    from?: string
    to?: string
    page?: number
    limit?: number
  },
) {
  const supabase = await createClient()
  const page = opts?.page ?? 1
  const limit = opts?.limit ?? 50
  const fromIdx = (page - 1) * limit

  let query = supabase
    .from("lunch_entries")
    .select("*, expense_categories(id, name, icon, color, slug), lunch_entry_participants(user_id, share_amount)", { count: "exact" })
    .eq("team_id", teamId)
    .order("lunch_date", { ascending: false })

  if (opts?.status && opts.status !== "all") {
    query = query.eq("payment_status", opts.status as "paid" | "unpaid")
  }
  if (opts?.from) query = query.gte("lunch_date", opts.from)
  if (opts?.to) query = query.lte("lunch_date", opts.to)
  if ((opts as { categoryIds?: string[] })?.categoryIds?.length) {
    query = query.in("category_id", (opts as { categoryIds: string[] }).categoryIds)
  }

  const { data, count, error } = await query.range(fromIdx, fromIdx + limit - 1)
  let entries = (data ?? []) as unknown as LunchEntryWithProfile[]

  if (opts?.search) {
    const q = opts.search.toLowerCase()
    const withProfiles = await attachProfiles(entries)
    entries = withProfiles.filter(
      (e) =>
        e.notes?.toLowerCase().includes(q) ||
        e.profiles?.full_name?.toLowerCase().includes(q),
    ) as LunchEntryWithProfile[]
  } else {
    entries = (await attachProfiles(entries)) as LunchEntryWithProfile[]
  }

  return {
    entries: entries as LunchEntryWithProfile[],
    total: count ?? 0,
    error,
  }
}

export async function getTeamData(teamId: string) {
  const supabase = await createClient()
  const [team, membersRes, invitesRes, legacyInvitesRes, activityRes] =
    await Promise.all([
      supabase.from("teams").select("*").eq("id", teamId).single(),
      supabase
        .from("team_members")
        .select("*")
        .eq("team_id", teamId)
        .order("joined_at"),
      supabase
        .from("team_invites")
        .select("*")
        .eq("team_id", teamId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("team_invitations")
        .select("*")
        .eq("team_id", teamId)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase
        .from("team_activity_log")
        .select("*")
        .eq("team_id", teamId)
        .order("created_at", { ascending: false })
        .limit(20),
    ])

  const members = await attachProfiles(membersRes.data ?? [])
  const now = new Date()
  const monthStart = getMonthStart(now)
  const { data: monthSummaries } = await supabase
    .from("monthly_summaries")
    .select("user_id, total_amount, pending_amount")
    .eq("team_id", teamId)
    .eq("month", monthStart)

  const summaryByUser = new Map(
    (monthSummaries ?? []).map((s) => [
      s.user_id,
      { total: Number(s.total_amount), pending: Number(s.pending_amount) },
    ]),
  )

  const membersWithStats = members.map((m) => ({
    ...m,
    lunchStats: summaryByUser.get(m.user_id) ?? { total: 0, pending: 0 },
  }))

  const activityRaw = activityRes.data ?? []
  const actUserIds = activityRaw
    .map((a) => a.user_id)
    .filter(Boolean) as string[]
  let profileMap = new Map<
    string,
    { full_name: string | null; avatar_url?: string | null }
  >()
  if (actUserIds.length) {
    const { data: actProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", actUserIds)
    profileMap = new Map((actProfiles ?? []).map((p) => [p.id, p]))
  }

  return {
    team: team.data,
    members: membersWithStats,
    invites: invitesRes.data ?? [],
    invitations: legacyInvitesRes.data ?? [],
    activity: activityRaw.map((a) => ({
      ...a,
      profiles: a.user_id ? (profileMap.get(a.user_id) ?? null) : null,
    })),
  }
}

export async function getPublicTeamById(teamId: string) {
  const supabase = await createClient()
  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .eq("is_public", true)
    .single()

  if (!team) return null

  const [entries, summaries, membersRes, categories] = await Promise.all([
    supabase
      .from("lunch_entries")
      .select("amount, lunch_date, payment_status, user_id, category_id, expense_categories(id, name, icon, color)")
      .eq("team_id", team.id)
      .in("approval_status", FINANCIAL_APPROVAL_STATUSES)
      .order("lunch_date", { ascending: false })
      .limit(100),
    supabase.from("monthly_summaries").select("*").eq("team_id", team.id),
    supabase.from("team_members").select("user_id").eq("team_id", team.id),
    team.show_category_analytics_on_public !== false
      ? supabase.from("expense_categories").select("*").eq("team_id", team.id)
      : Promise.resolve({ data: [] }),
  ])

  const members = await attachProfiles(
    (membersRes.data ?? []).map((m) => ({ user_id: m.user_id })),
  )

  const total = (entries.data ?? []).reduce((s, e) => s + Number(e.amount), 0)
  const pending = (summaries.data ?? []).reduce(
    (s, r) => s + Number(r.pending_amount),
    0,
  )

  let balanceSummary = null
  if (team.show_balances_on_public) {
    const { getBalanceContext } = await import("@/lib/data/settlements")
    balanceSummary = await getBalanceContext(team.id)
  }

  return {
    team,
    entries: entries.data ?? [],
    summaries: summaries.data ?? [],
    members,
    categories: categories.data ?? [],
    total,
    pending,
    balanceSummary,
  }
}

export async function getPublicTeamBySlug(slug: string) {
  const supabase = await createClient()
  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("slug", slug)
    .eq("is_public", true)
    .single()

  if (!team) return null

  const [entries, summaries, membersRes, categories] = await Promise.all([
    supabase
      .from("lunch_entries")
      .select("amount, lunch_date, payment_status, user_id, category_id, expense_categories(id, name, icon, color)")
      .eq("team_id", team.id)
      .in("approval_status", FINANCIAL_APPROVAL_STATUSES)
      .order("lunch_date", { ascending: false })
      .limit(100),
    supabase.from("monthly_summaries").select("*").eq("team_id", team.id),
    supabase.from("team_members").select("user_id").eq("team_id", team.id),
    team.show_category_analytics_on_public !== false
      ? supabase.from("expense_categories").select("*").eq("team_id", team.id)
      : Promise.resolve({ data: [] }),
  ])

  const members = await attachProfiles(
    (membersRes.data ?? []).map((m) => ({ user_id: m.user_id })),
  )

  const total = (entries.data ?? []).reduce((s, e) => s + Number(e.amount), 0)
  const pending = (summaries.data ?? []).reduce(
    (s, r) => s + Number(r.pending_amount),
    0,
  )

  let balanceSummary = null
  if (team.show_balances_on_public) {
    const { getBalanceContext } = await import("@/lib/data/settlements")
    balanceSummary = await getBalanceContext(team.id)
  }

  return {
    team,
    entries: entries.data ?? [],
    summaries: summaries.data ?? [],
    members,
    categories: categories.data ?? [],
    total,
    pending,
    balanceSummary,
  }
}

export async function getPublicUserSummary(userId: string) {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, team_id")
    .eq("id", userId)
    .single()

  if (!profile?.team_id) return null

  const { data: team } = await supabase
    .from("teams")
    .select("id, name, slug, is_public, currency")
    .eq("id", profile.team_id)
    .eq("is_public", true)
    .single()

  if (!team) return null

  const { data: summaries } = await supabase
    .from("monthly_summaries")
    .select("*")
    .eq("user_id", userId)
    .eq("team_id", team.id)
    .order("month", { ascending: false })
    .limit(12)

  const { data: entries } = await supabase
    .from("lunch_entries")
    .select("amount, lunch_date, payment_status, notes")
    .eq("user_id", userId)
    .eq("team_id", team.id)
    .in("approval_status", FINANCIAL_APPROVAL_STATUSES)
    .order("lunch_date", { ascending: false })
    .limit(20)

  return { profile, team, summaries: summaries ?? [], entries: entries ?? [] }
}

export async function getAnalyticsData(
  teamId: string,
  opts?: { categoryIds?: string[]; from?: string; to?: string },
) {
  const supabase = await createClient()
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
  const from = opts?.from ?? getMonthStart(sixMonthsAgo)

  let query = supabase
    .from("lunch_entries")
    .select("amount, lunch_date, payment_status, user_id, category_id, expense_categories(id, name, icon, color)")
    .eq("team_id", teamId)
    .in("approval_status", FINANCIAL_APPROVAL_STATUSES)
    .gte("lunch_date", from)

  if (opts?.to) query = query.lte("lunch_date", opts.to)

  if (opts?.categoryIds?.length) {
    query = query.in("category_id", opts.categoryIds)
  }

  const { data: entries } = await query

  const { data: summaries } = await supabase
    .from("monthly_summaries")
    .select("*")
    .eq("team_id", teamId)
    .gte("month", from)

  const { data: categories } = await supabase
    .from("expense_categories")
    .select("*")
    .eq("team_id", teamId)

  return {
    entries: entries ?? [],
    summaries: summaries ?? [],
    categories: categories ?? [],
  }
}

export async function getDashboardBalance(
  teamId: string,
  userId: string,
  range?: { from: string; to: string },
) {
  const { getBalanceContext } = await import("@/lib/data/settlements")
  return getBalanceContext(teamId, userId, range)
}

export async function getDashboardHistoricalStats(teamId: string) {
  const supabase = await createClient()
  const now = new Date()
  const currentMonth = getMonthStart(now)
  const lastMonthDate = new Date(now)
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1)
  const lastMonth = getMonthStart(lastMonthDate)
  const yearAgo = new Date(now)
  yearAgo.setMonth(yearAgo.getMonth() - 11)
  const from = getMonthStart(yearAgo)

  const { data } = await supabase
    .from("lunch_entries")
    .select("amount, lunch_date")
    .eq("team_id", teamId)
    .in("approval_status", FINANCIAL_APPROVAL_STATUSES)
    .gte("lunch_date", from)
    .lte("lunch_date", getMonthEnd(currentMonth))

  const totals = new Map<string, number>()
  ;(data ?? []).forEach((entry) => {
    const month = getMonthStart(new Date(entry.lunch_date))
    totals.set(month, (totals.get(month) ?? 0) + Number(entry.amount))
  })

  const currentMonthTotal = totals.get(currentMonth) ?? 0
  const lastMonthTotal = totals.get(lastMonth) ?? 0
  const monthsWithSpend = Array.from(totals.values()).filter((v) => v > 0)
  const averageMonthlySpend =
    monthsWithSpend.length > 0
      ? monthsWithSpend.reduce((sum, value) => sum + value, 0) / monthsWithSpend.length
      : 0
  const differencePercent =
    lastMonthTotal > 0
      ? ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
      : currentMonthTotal > 0
        ? 100
        : 0

  return {
    currentMonthTotal,
    lastMonthTotal,
    differencePercent,
    averageMonthlySpend,
  }
}

export async function getNotifications(userId: string, teamId?: string, limit = 8) {
  const supabase = await createClient()
  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (teamId) query = query.eq("team_id", teamId)
  const { data } = await query
  return data ?? []
}

export async function getActivityLogs(
  teamId: string,
  opts?: { type?: string; page?: number; limit?: number },
) {
  const supabase = await createClient()
  const page = opts?.page ?? 1
  const limit = opts?.limit ?? 20
  const from = (page - 1) * limit

  let query = supabase
    .from("activity_logs")
    .select("*", { count: "exact" })
    .eq("team_id", teamId)
    .order("created_at", { ascending: false })

  if (opts?.type && opts.type !== "all") {
    query = query.eq("entity_type", opts.type)
  }

  const { data, count } = await query.range(from, from + limit - 1)
  const rows = (data ?? []) as ActivityLog[]
  const userIds = [...new Set(rows.map((a) => a.user_id).filter(Boolean))] as string[]
  let profiles = new Map<string, Pick<Profile, "full_name" | "avatar_url">>()

  if (userIds.length) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", userIds)
    profiles = new Map((profileRows ?? []).map((p) => [p.id, p]))
  }

  return {
    activity: rows.map((a) => ({
      ...a,
      profiles: a.user_id ? (profiles.get(a.user_id) ?? null) : null,
    })),
    total: count ?? 0,
    page,
    limit,
  }
}
