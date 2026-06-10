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
import { attachActivityProfiles, getNotificationSummary } from "@/lib/data/notifications"
import type { DebtEdge, UserBalance } from "@/lib/balance/engine"

const FINANCIAL_APPROVAL_STATUSES = ["approved", "reimbursed"] as const

type PublicMember = {
  key: string
  name: string
  avatarUrl: string | null
  role: string
  joinedAt: string | null
  totalPaid: number
  totalOwed: number
  netBalance: number
  recentExpenses: PublicExpense[]
  settlementSummary: PublicDebtEdge[]
}

type PublicExpense = {
  amount: number
  lunch_date: string
  payment_status: string
  payerKey: string
  payerName: string
  title: string
  category_id?: string | null
  expense_categories?: { id: string; name: string; icon: string; color: string } | null
}

type PublicDebtEdge = {
  fromKey: string
  fromName: string
  toKey: string
  toName: string
  amount: number
}

type PublicSettlement = PublicDebtEdge & {
  status: string
}

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

async function attachPublicProfiles<T extends { user_id: string }>(
  items: T[],
): Promise<(T & { profiles: Pick<Profile, "id" | "full_name" | "avatar_url"> | null })[]> {
  if (!items.length) return []
  const supabase = await createClient()
  const ids = [...new Set(items.map((i) => i.user_id))]
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", ids)
  const map = new Map((profiles ?? []).map((p) => [p.id, p]))
  return items.map((item) => ({
    ...item,
    profiles: map.get(item.user_id) ?? null,
  }))
}

async function attachEntryProfiles<T extends { user_id: string; assigned_user_id?: string | null }>(
  items: T[],
): Promise<(T & {
  profiles: Pick<Profile, "id" | "full_name" | "email" | "avatar_url"> | null
  assigned_profile: Pick<Profile, "id" | "full_name" | "email" | "avatar_url"> | null
})[]> {
  if (!items.length) return []
  const supabase = await createClient()
  const ids = [
    ...new Set(
      items.flatMap((item) => [item.user_id, item.assigned_user_id]).filter(Boolean) as string[],
    ),
  ]
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .in("id", ids)
  const map = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
  return items.map((item) => ({
    ...item,
    profiles: map.get(item.user_id) ?? null,
    assigned_profile: item.assigned_user_id ? map.get(item.assigned_user_id) ?? null : null,
  }))
}

export async function getDashboardData(teamId: string, range?: Pick<DateRangeValue, "from" | "to">, userId?: string) {
  const supabase = await createClient()
  const now = new Date()
  const monthStart = range?.from ?? getMonthStart(now)
  const monthEnd = range?.to ?? getMonthEnd(monthStart)

  const [entriesRes, rangeEntriesRes, workflowRowsRes, membersRes, activityRes] =
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
        .select("amount, lunch_date, payment_status, reimbursement_status, amount_reimbursed, user_id, assigned_user_id, assignment_type, category_id, expense_categories(id, name, icon, color)")
        .eq("team_id", teamId)
        .in("approval_status", FINANCIAL_APPROVAL_STATUSES)
        .gte("lunch_date", monthStart)
        .lte("lunch_date", monthEnd)
        .order("lunch_date", { ascending: true }),
      supabase
        .from("lunch_entries")
        .select("amount, lunch_date, approval_status, reimbursement_status, amount_reimbursed, user_id, assigned_user_id, submitted_by")
        .eq("team_id", teamId)
        .gte("lunch_date", monthStart)
        .lte("lunch_date", monthEnd),
      supabase.from("team_members").select("*").eq("team_id", teamId),
      supabase
        .from("activity_logs")
        .select("*")
        .eq("team_id", teamId)
        .order("created_at", { ascending: false })
        .limit(10),
    ])

  const entriesRaw = entriesRes.data ?? []
  const membersRaw = membersRes.data ?? []
  const [recentEntries, members] = await Promise.all([
    attachEntryProfiles(entriesRaw),
    attachProfiles(membersRaw),
  ])

  const rangeEntries = rangeEntriesRes.data ?? []
  const workflowRows = workflowRowsRes.data ?? []
  const pendingApprovals = workflowRows.filter((e) => e.approval_status === "pending_approval").length
  const approvedThisMonth = rangeEntries.length
  const rejectedExpenses = workflowRows.filter((e) => e.approval_status === "rejected").length
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
  const assignedByUser = new Map<string, number>()
  rangeEntries.forEach((entry) => {
    const memberId = entry.assigned_user_id ?? entry.user_id
    const row = byUser.get(memberId) ?? { total: 0, pending: 0, paid: 0 }
    const amount = Number(entry.amount)
    row.total += amount
    if (entry.payment_status === "paid") row.paid += amount
    else row.pending += amount
    byUser.set(memberId, row)
    if (entry.assigned_user_id) {
      assignedByUser.set(entry.assigned_user_id, (assignedByUser.get(entry.assigned_user_id) ?? 0) + amount)
    }
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

  const mostActiveMembers = members
    .map((member) => ({
      userId: member.user_id,
      name: member.profiles?.full_name ?? member.profiles?.email ?? "Member",
      count: rangeEntries.filter((entry) =>
        entry.user_id === member.user_id ||
        entry.assigned_user_id === member.user_id ||
        (entry as { submitted_by?: string | null }).submitted_by === member.user_id,
      ).length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const highestAssignedExpenses = Array.from(assignedByUser.entries())
    .map(([userId, total]) => {
      const member = members.find((m) => m.user_id === userId)
      return {
        userId,
        name: member?.profiles?.full_name ?? member?.profiles?.email ?? "Member",
        total,
      }
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  const [activity, notificationSummary] = await Promise.all([
    attachActivityProfiles(activityRes.data ?? []),
    userId ? getNotificationSummary(userId, teamId) : Promise.resolve({
      unreadCount: 0,
      pendingActions: 0,
      latest: [],
    }),
  ])

  return {
    recentEntries: recentEntries as LunchEntryWithProfile[],
    monthlyEntries: rangeEntriesRes.data ?? [],
    summaries: [] as MonthlySummary[],
    members: members as TeamMemberWithProfile[],
    activity,
    notificationSummary,
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
    mostActiveMembers,
    highestAssignedExpenses,
    personalPendingApprovals: userId
      ? workflowRows.filter((entry) =>
          entry.approval_status === "pending_approval" &&
          (entry.user_id === userId || entry.assigned_user_id === userId || entry.submitted_by === userId),
        ).length
      : 0,
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
    memberId?: string
    assignedUserId?: string
    categoryIds?: string[]
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
  if (opts?.categoryIds?.length) {
    query = query.in("category_id", opts.categoryIds)
  }
  if (opts?.assignedUserId) {
    query = query.eq("assigned_user_id", opts.assignedUserId)
  }
  if (opts?.memberId) {
    query = query.or(`user_id.eq.${opts.memberId},assigned_user_id.eq.${opts.memberId},created_by.eq.${opts.memberId},submitted_by.eq.${opts.memberId}`)
  }

  const { data, count, error } = await query.range(fromIdx, fromIdx + limit - 1)
  let entries = (data ?? []) as unknown as LunchEntryWithProfile[]

  if (opts?.search) {
    const q = opts.search.toLowerCase()
    const withProfiles = await attachEntryProfiles(entries)
    entries = withProfiles.filter(
      (e) =>
        e.notes?.toLowerCase().includes(q) ||
        e.profiles?.full_name?.toLowerCase().includes(q) ||
        e.assigned_profile?.full_name?.toLowerCase().includes(q) ||
        e.expense_categories?.name?.toLowerCase().includes(q),
    ) as LunchEntryWithProfile[]
  } else {
    entries = (await attachEntryProfiles(entries)) as LunchEntryWithProfile[]
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

function monthTotal(entries: { lunch_date: string; amount: number }[], month: string) {
  return entries.reduce((sum, entry) => {
    return getMonthStart(new Date(entry.lunch_date)) === month ? sum + Number(entry.amount) : sum
  }, 0)
}

function percentDifference(current: number, previous: number) {
  if (previous > 0) return ((current - previous) / previous) * 100
  return current > 0 ? 100 : 0
}

function safeExpenseTitle(entry: {
  expense_categories?: { name: string } | null
}) {
  return entry.expense_categories?.name ? `${entry.expense_categories.name} expense` : "Team expense"
}

function publicDebtEdges(
  edges: DebtEdge[],
  memberKeys: Map<string, string>,
  memberNames: Map<string, string>,
): PublicDebtEdge[] {
  return edges
    .map((edge) => {
      const fromKey = memberKeys.get(edge.from)
      const toKey = memberKeys.get(edge.to)
      if (!fromKey || !toKey || edge.amount <= 0.01) return null
      return {
        fromKey,
        fromName: memberNames.get(edge.from) ?? "Member",
        toKey,
        toName: memberNames.get(edge.to) ?? "Member",
        amount: edge.amount,
      }
    })
    .filter(Boolean) as PublicDebtEdge[]
}

function publicBalances(
  balances: UserBalance[],
  memberKeys: Map<string, string>,
): Map<string, Pick<PublicMember, "totalPaid" | "totalOwed" | "netBalance">> {
  return new Map(
    balances.flatMap((balance) => {
      const key = memberKeys.get(balance.userId)
      if (!key) return []
      return [
        [
          key,
          {
            totalPaid: balance.totalPaid,
            totalOwed: balance.totalOwed,
            netBalance: balance.netBalance,
          },
        ],
      ]
    }),
  )
}

async function getPublicTeam(teamFilter: "id" | "slug", value: string) {
  const supabase = await createClient()
  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq(teamFilter, value)
    .eq("is_public", true)
    .single()

  if (!team) return null

  const now = new Date()
  const currentMonth = getMonthStart(now)
  const previousMonthDate = new Date(now)
  previousMonthDate.setMonth(previousMonthDate.getMonth() - 1)
  const previousMonth = getMonthStart(previousMonthDate)
  const yearAgo = new Date(now)
  yearAgo.setMonth(yearAgo.getMonth() - 11)
  const historyFrom = getMonthStart(yearAgo)

  const [entries, allEntries, summaries, membersRes, categories, settlementsRes] = await Promise.all([
    supabase
      .from("lunch_entries")
      .select("amount, lunch_date, payment_status, user_id, category_id, expense_categories(id, name, icon, color)")
      .eq("team_id", team.id)
      .in("approval_status", FINANCIAL_APPROVAL_STATUSES)
      .order("lunch_date", { ascending: false })
      .limit(100),
    supabase
      .from("lunch_entries")
      .select("amount, lunch_date, payment_status, user_id, category_id, expense_categories(id, name, icon, color)")
      .eq("team_id", team.id)
      .in("approval_status", FINANCIAL_APPROVAL_STATUSES)
      .gte("lunch_date", historyFrom)
      .order("lunch_date", { ascending: false }),
    supabase.from("monthly_summaries").select("*").eq("team_id", team.id),
    supabase.from("team_members").select("user_id, role, joined_at").eq("team_id", team.id).order("joined_at"),
    team.show_category_analytics_on_public !== false
      ? supabase.from("expense_categories").select("*").eq("team_id", team.id)
      : Promise.resolve({ data: [] }),
    supabase.from("settlements").select("payer_user_id, receiver_user_id, amount, status").eq("team_id", team.id),
  ])

  const membersWithProfiles = await attachPublicProfiles(membersRes.data ?? [])
  const memberKeys = new Map(membersWithProfiles.map((member, index) => [member.user_id, `member-${index + 1}`]))
  const memberNames = new Map(
    membersWithProfiles.map((member) => [
      member.user_id,
      member.profiles?.full_name?.trim() || "Member",
    ]),
  )

  const safeEntries: PublicExpense[] = (entries.data ?? []).map((entry) => {
    const payerKey = memberKeys.get(entry.user_id) ?? "member"
    const payerName = memberNames.get(entry.user_id) ?? "Member"
    return {
      amount: Number(entry.amount),
      lunch_date: entry.lunch_date,
      payment_status: entry.payment_status,
      payerKey,
      payerName,
      title: safeExpenseTitle(entry),
      category_id: entry.category_id,
      expense_categories: entry.expense_categories,
    }
  })

  const safeAllEntries: PublicExpense[] = (allEntries.data ?? []).map((entry) => {
    const payerKey = memberKeys.get(entry.user_id) ?? "member"
    const payerName = memberNames.get(entry.user_id) ?? "Member"
    return {
      amount: Number(entry.amount),
      lunch_date: entry.lunch_date,
      payment_status: entry.payment_status,
      payerKey,
      payerName,
      title: safeExpenseTitle(entry),
      category_id: entry.category_id,
      expense_categories: entry.expense_categories,
    }
  })

  const total = (allEntries.data ?? []).reduce((s, e) => s + Number(e.amount), 0)
  const pending = (summaries.data ?? []).reduce(
    (s, r) => s + Number(r.pending_amount),
    0,
  )
  const currentMonthSpend = monthTotal(allEntries.data ?? [], currentMonth)
  const lastMonthSpend = monthTotal(allEntries.data ?? [], previousMonth)

  let debtEdges: PublicDebtEdge[] = []
  let balancesByKey = new Map<string, Pick<PublicMember, "totalPaid" | "totalOwed" | "netBalance">>()
  if (team.show_balances_on_public) {
    const { getBalanceContext } = await import("@/lib/data/settlements")
    const balanceSummary = await getBalanceContext(team.id)
    debtEdges = publicDebtEdges(balanceSummary.debtSummary.edges, memberKeys, memberNames)
    balancesByKey = publicBalances(balanceSummary.userBalances, memberKeys)
  }

  const members: PublicMember[] = membersWithProfiles.map((member) => {
    const key = memberKeys.get(member.user_id) ?? "member"
    const balance = balancesByKey.get(key) ?? { totalPaid: 0, totalOwed: 0, netBalance: 0 }
    const recentExpenses = safeEntries.filter((entry) => entry.payerKey === key).slice(0, 5)
    const settlementSummary = debtEdges.filter((edge) => edge.fromKey === key || edge.toKey === key)
    return {
      key,
      name: member.profiles?.full_name?.trim() || "Member",
      avatarUrl: member.profiles?.avatar_url ?? null,
      role: member.role ?? "member",
      joinedAt: member.joined_at ?? null,
      ...balance,
      recentExpenses,
      settlementSummary,
    }
  })

  const outstandingSettlements: PublicSettlement[] = team.show_balances_on_public
    ? (settlementsRes.data ?? [])
        .filter((settlement) => settlement.status === "pending" && Number(settlement.amount) > 0.01)
        .map((settlement) => {
          const fromKey = memberKeys.get(settlement.payer_user_id)
          const toKey = memberKeys.get(settlement.receiver_user_id)
          if (!fromKey || !toKey) return null
          return {
            fromKey,
            fromName: memberNames.get(settlement.payer_user_id) ?? "Member",
            toKey,
            toName: memberNames.get(settlement.receiver_user_id) ?? "Member",
            amount: Number(settlement.amount),
            status: settlement.status,
          }
        })
        .filter(Boolean) as PublicSettlement[]
    : []

  const leaderboard = members
    .map((member) => ({
      key: member.key,
      name: member.name,
      avatarUrl: member.avatarUrl,
      total: safeAllEntries
        .filter((entry) => entry.payerKey === member.key)
        .reduce((sum, entry) => sum + Number(entry.amount), 0),
    }))
    .filter((member) => member.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  return {
    team: {
      name: team.name,
      brand_name: team.brand_name,
      logo_url: team.logo_url,
      currency: team.currency,
      show_balances_on_public: team.show_balances_on_public,
      show_category_analytics_on_public: team.show_category_analytics_on_public,
    },
    entries: safeEntries,
    analyticsEntries: safeAllEntries,
    summaries: summaries.data ?? [],
    members,
    categories: categories.data ?? [],
    total,
    pending,
    currentMonthSpend,
    lastMonthSpend,
    monthlyDifferencePercent: percentDifference(currentMonthSpend, lastMonthSpend),
    settlementCount: settlementsRes.data?.length ?? 0,
    debtEdges,
    outstandingSettlements,
    leaderboard,
  }
}

export async function getPublicTeamById(teamId: string) {
  return getPublicTeam("id", teamId)
}

export async function getPublicTeamBySlug(slug: string) {
  return getPublicTeam("slug", slug)
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
  opts?: { type?: string; page?: number; limit?: number; search?: string },
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

  if (opts?.type === "approval") {
    query = query.in("action_type", [
      "expense_submitted",
      "expense_approved",
      "expense_rejected",
      "expense_reimbursed",
      "reimbursement_completed",
    ])
  } else if (opts?.type && opts.type !== "all") {
    query = query.eq("entity_type", opts.type)
  }
  if (opts?.search?.trim()) {
    const q = opts.search.trim()
    query = query.or(`description.ilike.%${q}%,message.ilike.%${q}%,action_type.ilike.%${q}%`)
  }

  const { data, count } = await query.range(from, from + limit - 1)
  const rows = (data ?? []) as ActivityLog[]
  const activity = await attachActivityProfiles(rows)

  return {
    activity,
    total: count ?? 0,
    page,
    limit,
  }
}
