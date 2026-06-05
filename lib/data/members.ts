import { createClient } from "@/lib/supabase/server"
import { canEdit, type SessionContext } from "@/lib/auth/session"
import { getBalanceContext } from "@/lib/data/settlements"
import { getTeamBudgets } from "@/lib/data/budgets"
import { getMonthEnd, getMonthStart } from "@/lib/budget/engine"
import type { ExpenseCategory, LunchEntryWithProfile, Profile } from "@/lib/database.types"

const FINANCIAL_APPROVAL_STATUSES = ["approved", "reimbursed"] as const

type MemberEntry = LunchEntryWithProfile & {
  expense_categories?: Pick<ExpenseCategory, "id" | "name" | "icon" | "color" | "slug"> | null
}

function assertMemberAccess(session: SessionContext & { teamId: string }, memberId: string) {
  if (!canEdit(session.role) && session.user.id !== memberId) {
    throw new Error("You can only view your own member workspace")
  }
}

async function attachProfiles(entries: MemberEntry[]) {
  if (!entries.length) return entries
  const supabase = await createClient()
  const ids = [
    ...new Set(entries.flatMap((entry) => [entry.user_id, entry.assigned_user_id]).filter(Boolean) as string[]),
  ]
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .in("id", ids)
  const map = new Map((data ?? []).map((profile) => [profile.id, profile]))
  return entries.map((entry) => ({
    ...entry,
    profiles: map.get(entry.user_id) ?? null,
    assigned_profile: entry.assigned_user_id ? map.get(entry.assigned_user_id) ?? null : null,
  }))
}

function monthKey(date: string) {
  return getMonthStart(new Date(date))
}

function sum(entries: Pick<MemberEntry, "amount">[]) {
  return entries.reduce((total, entry) => total + Number(entry.amount), 0)
}

function summarizeMonthly(entries: MemberEntry[]) {
  const map = new Map<string, number>()
  entries.forEach((entry) => {
    const month = monthKey(entry.lunch_date)
    map.set(month, (map.get(month) ?? 0) + Number(entry.amount))
  })
  return Array.from(map.entries())
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => a.month.localeCompare(b.month))
}

function summarizeCategories(entries: MemberEntry[]) {
  const map = new Map<string, { id: string; name: string; color: string; total: number; count: number }>()
  entries.forEach((entry) => {
    const id = entry.category_id ?? "uncategorized"
    const current = map.get(id) ?? {
      id,
      name: entry.expense_categories?.name ?? "Uncategorized",
      color: entry.expense_categories?.color ?? "hsl(var(--muted-foreground))",
      total: 0,
      count: 0,
    }
    current.total += Number(entry.amount)
    current.count += 1
    map.set(id, current)
  })
  return Array.from(map.values()).sort((a, b) => b.total - a.total)
}

export async function getMemberWorkspaceData(
  session: SessionContext & { teamId: string },
  memberId: string,
) {
  assertMemberAccess(session, memberId)
  const supabase = await createClient()
  const now = new Date()
  const currentMonth = getMonthStart(now)

  const [memberRes, entriesRes, settlementsRes, activityRes, budgets, recurringRes] = await Promise.all([
    supabase
      .from("team_members")
      .select("*, profiles(id, full_name, email, avatar_url)")
      .eq("team_id", session.teamId)
      .eq("user_id", memberId)
      .maybeSingle(),
    supabase
      .from("lunch_entries")
      .select("*, expense_categories(id, name, icon, color, slug), lunch_entry_participants(user_id, share_amount)")
      .eq("team_id", session.teamId)
      .or(`user_id.eq.${memberId},assigned_user_id.eq.${memberId},created_by.eq.${memberId},submitted_by.eq.${memberId}`)
      .order("lunch_date", { ascending: false })
      .limit(250),
    supabase
      .from("settlements")
      .select("*")
      .eq("team_id", session.teamId)
      .or(`payer_user_id.eq.${memberId},receiver_user_id.eq.${memberId},created_by.eq.${memberId}`)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("activity_logs")
      .select("*")
      .eq("team_id", session.teamId)
      .or(`user_id.eq.${memberId},metadata->>assigned_user_id.eq.${memberId}`)
      .order("created_at", { ascending: false })
      .limit(80),
    getTeamBudgets(session.teamId),
    supabase
      .from("recurring_expenses")
      .select("*, expense_categories(id, name, icon, color, slug)")
      .eq("team_id", session.teamId)
      .eq("created_by", memberId)
      .order("next_run_date", { ascending: true })
      .limit(20),
  ])

  if (!memberRes.data) throw new Error("Member not found")

  const entries = await attachProfiles((entriesRes.data ?? []) as unknown as MemberEntry[])
  const financialEntries = entries.filter((entry) => FINANCIAL_APPROVAL_STATUSES.includes(entry.approval_status as (typeof FINANCIAL_APPROVAL_STATUSES)[number]))
  const assignedExpenses = entries.filter((entry) => entry.assigned_user_id === memberId)
  const monthlyEntries = financialEntries.filter(
    (entry) => entry.lunch_date >= currentMonth && entry.lunch_date <= getMonthEnd(currentMonth),
  )
  const categoryBreakdown = summarizeCategories(financialEntries)
  const monthlyTrend = summarizeMonthly(financialEntries)
  const averageMonthlySpend = monthlyTrend.length
    ? monthlyTrend.reduce((total, row) => total + row.total, 0) / monthlyTrend.length
    : 0
  const impactedCategoryIds = new Set(financialEntries.map((entry) => entry.category_id).filter(Boolean) as string[])
  const impactedBudgets = budgets.filter((budget) => budget.type === "monthly" || (budget.category_id && impactedCategoryIds.has(budget.category_id)))
  const balance = await getBalanceContext(session.teamId, memberId)
  const settlements = settlementsRes.data ?? []

  return {
    member: memberRes.data as typeof memberRes.data & { profiles: Pick<Profile, "id" | "full_name" | "email" | "avatar_url"> | null },
    entries,
    assignedExpenses,
    settlements,
    activity: activityRes.data ?? [],
    recurringExpenses: recurringRes.data ?? [],
    impactedBudgets,
    analytics: {
      monthlyTrend,
      categoryBreakdown,
      averageMonthlySpend,
      totalExpenses: sum(financialEntries),
      monthlySpending: sum(monthlyEntries),
      pendingApprovals: entries.filter((entry) => entry.approval_status === "pending_approval").length,
      budgetImpact: sum(financialEntries.filter((entry) => entry.category_id && impactedCategoryIds.has(entry.category_id))),
      categoriesUsed: categoryBreakdown.length,
    },
    ledger: {
      credits: financialEntries.filter((entry) => entry.user_id === memberId).reduce((total, entry) => total + Number(entry.amount), 0),
      debits: assignedExpenses.reduce((total, entry) => total + Number(entry.amount), 0) + balance.personal.youOwe,
      paidByMember: financialEntries.filter((entry) => entry.user_id === memberId),
      owedByMember: assignedExpenses,
      netBalance: balance.personal.youReceive - balance.personal.youOwe,
      youOwe: balance.personal.youOwe,
      youReceive: balance.personal.youReceive,
    },
  }
}
