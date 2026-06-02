import { createClient } from "@/lib/supabase/server"
import type { DateRangeValue } from "@/lib/date-ranges"
import { getPreviousComparableRange, monthStartFromYMD, shiftMonth } from "@/lib/date-ranges"
import type { ExpenseCategory, Profile, Settlement, TeamBudget } from "@/lib/database.types"
import { getHistoricalBudgetData, getTeamBudgets } from "@/lib/data/budgets"
import { getMonthEnd, getMonthStart } from "@/lib/budget/engine"

const FINANCIAL_APPROVAL_STATUSES = ["approved", "reimbursed"] as const

type ReportEntry = {
  amount: number
  lunch_date: string
  payment_status: string
  approval_status?: string
  reimbursement_status?: string
  amount_reimbursed?: number
  user_id: string
  category_id?: string | null
  notes?: string | null
  expense_categories?: { id: string; name: string; icon: string; color: string } | null
  profiles?: Pick<Profile, "id" | "full_name" | "email"> | null
}

function sum(entries: Pick<ReportEntry, "amount">[]) {
  return entries.reduce((total, entry) => total + Number(entry.amount), 0)
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

async function attachProfiles(entries: ReportEntry[]) {
  if (!entries.length) return entries
  const supabase = await createClient()
  const ids = [...new Set(entries.map((entry) => entry.user_id))]
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", ids)
  const profiles = new Map((data ?? []).map((profile) => [profile.id, profile]))
  return entries.map((entry) => ({
    ...entry,
    profiles: profiles.get(entry.user_id) ?? null,
  }))
}

function summarizeByCategory(entries: ReportEntry[]) {
  const map = new Map<string, { id: string; name: string; color: string; total: number; count: number }>()
  entries.forEach((entry) => {
    const id = entry.category_id ?? "uncategorized"
    const category = entry.expense_categories
    const current = map.get(id) ?? {
      id,
      name: category?.name ?? "Uncategorized",
      color: category?.color ?? "hsl(var(--muted-foreground))",
      total: 0,
      count: 0,
    }
    current.total += Number(entry.amount)
    current.count += 1
    map.set(id, current)
  })
  return Array.from(map.values()).sort((a, b) => b.total - a.total)
}

function summarizeByMember(entries: ReportEntry[]) {
  const map = new Map<string, { userId: string; name: string; total: number; count: number; paid: number; pending: number }>()
  entries.forEach((entry) => {
    const current = map.get(entry.user_id) ?? {
      userId: entry.user_id,
      name: entry.profiles?.full_name ?? entry.profiles?.email ?? "Member",
      total: 0,
      count: 0,
      paid: 0,
      pending: 0,
    }
    const amount = Number(entry.amount)
    current.total += amount
    current.count += 1
    if (entry.payment_status === "paid") current.paid += amount
    else current.pending += amount
    map.set(entry.user_id, current)
  })
  return Array.from(map.values()).sort((a, b) => b.total - a.total)
}

function summarizeByMonth(entries: ReportEntry[]) {
  const map = new Map<string, number>()
  entries.forEach((entry) => {
    const month = monthStartFromYMD(entry.lunch_date)
    map.set(month, (map.get(month) ?? 0) + Number(entry.amount))
  })
  return Array.from(map.entries())
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => a.month.localeCompare(b.month))
}

export async function getReportsData(teamId: string, range: DateRangeValue) {
  const supabase = await createClient()
  const previousRange = getPreviousComparableRange(range)
  const currentMonth = getMonthStart(new Date())
  const previousMonth = shiftMonth(currentMonth, -1)

  const [entriesRes, previousEntriesRes, currentMonthRes, previousMonthRes, settlementsRes, budgets, budgetHistory] =
    await Promise.all([
      supabase
        .from("lunch_entries")
        .select("amount, lunch_date, payment_status, approval_status, reimbursement_status, amount_reimbursed, user_id, category_id, notes, expense_categories(id, name, icon, color)")
        .eq("team_id", teamId)
        .in("approval_status", FINANCIAL_APPROVAL_STATUSES)
        .gte("lunch_date", range.from)
        .lte("lunch_date", range.to)
        .order("lunch_date", { ascending: false }),
      supabase
        .from("lunch_entries")
        .select("amount, lunch_date, payment_status, approval_status, reimbursement_status, amount_reimbursed, user_id, category_id, notes, expense_categories(id, name, icon, color)")
        .eq("team_id", teamId)
        .in("approval_status", FINANCIAL_APPROVAL_STATUSES)
        .gte("lunch_date", previousRange.from)
        .lte("lunch_date", previousRange.to),
      supabase
        .from("lunch_entries")
        .select("amount, lunch_date, payment_status, approval_status, reimbursement_status, amount_reimbursed, user_id, category_id, notes, expense_categories(id, name, icon, color)")
        .eq("team_id", teamId)
        .in("approval_status", FINANCIAL_APPROVAL_STATUSES)
        .gte("lunch_date", currentMonth)
        .lte("lunch_date", getMonthEnd(currentMonth)),
      supabase
        .from("lunch_entries")
        .select("amount, lunch_date, payment_status, approval_status, reimbursement_status, amount_reimbursed, user_id, category_id, notes, expense_categories(id, name, icon, color)")
        .eq("team_id", teamId)
        .in("approval_status", FINANCIAL_APPROVAL_STATUSES)
        .gte("lunch_date", previousMonth)
        .lte("lunch_date", getMonthEnd(previousMonth)),
      supabase
        .from("settlements")
        .select("*")
        .eq("team_id", teamId)
        .gte("created_at", `${range.from}T00:00:00`)
        .lte("created_at", `${range.to}T23:59:59`),
      getTeamBudgets(teamId),
      getHistoricalBudgetData(teamId, range.from, range.to),
    ])

  const { data: workflowRows } = await supabase
    .from("lunch_entries")
    .select("amount, lunch_date, approval_status, reimbursement_status, amount_reimbursed")
    .eq("team_id", teamId)
    .gte("lunch_date", range.from)
    .lte("lunch_date", range.to)

  const entries = await attachProfiles((entriesRes.data ?? []) as ReportEntry[])
  const previousEntries = await attachProfiles((previousEntriesRes.data ?? []) as ReportEntry[])
  const currentMonthEntries = (currentMonthRes.data ?? []) as ReportEntry[]
  const previousMonthEntries = (previousMonthRes.data ?? []) as ReportEntry[]
  const settlements = (settlementsRes.data ?? []) as Settlement[]

  const total = sum(entries)
  const paid = sum(entries.filter((entry) => entry.payment_status === "paid"))
  const pending = total - paid
  const previousTotal = sum(previousEntries)
  const currentMonthTotal = sum(currentMonthEntries)
  const previousMonthTotal = sum(previousMonthEntries)

  const categoryBreakdown = summarizeByCategory(entries)
  const previousCategories = new Map(summarizeByCategory(previousEntries).map((category) => [category.id, category.total]))
  const categoryComparison = categoryBreakdown.map((category) => {
    const previous = previousCategories.get(category.id) ?? 0
    return {
      ...category,
      current: category.total,
      previous,
      difference: category.total - previous,
      changePercent: percentChange(category.total, previous),
    }
  })

  const teamSummary = summarizeByMember(entries)
  const monthlyTrend = summarizeByMonth(entries)
  const settlementSummary = {
    total: settlements.reduce((acc, settlement) => acc + Number(settlement.amount), 0),
    completed: settlements.filter((settlement) => settlement.status === "completed").reduce((acc, settlement) => acc + Number(settlement.amount), 0),
    pending: settlements.filter((settlement) => settlement.status === "pending").reduce((acc, settlement) => acc + Number(settlement.amount), 0),
    count: settlements.length,
  }
  const activeBudgets = (budgets as TeamBudget[]).length
  const overspendingHistory = budgetHistory.filter((month) => month.exceeded)
  const workflow = workflowRows ?? []
  const approvedCount = workflow.filter((entry) => ["approved", "reimbursed"].includes(entry.approval_status)).length
  const rejectedCount = workflow.filter((entry) => entry.approval_status === "rejected").length
  const pendingCount = workflow.filter((entry) => entry.approval_status === "pending_approval").length
  const decidedCount = approvedCount + rejectedCount
  const reimbursementOutstanding = workflow
    .filter((entry) => ["approved", "reimbursed"].includes(entry.approval_status))
    .reduce((total, entry) => total + Math.max(0, Number(entry.amount) - Number(entry.amount_reimbursed ?? 0)), 0)
  const reimbursementTrend = summarizeByMonth(
    workflow
      .filter((entry) => Number(entry.amount_reimbursed ?? 0) > 0)
      .map((entry) => ({
        amount: Number(entry.amount_reimbursed ?? 0),
        lunch_date: entry.lunch_date,
        payment_status: "paid",
        user_id: "",
      })),
  )

  return {
    range,
    entries,
    monthlySummary: {
      total,
      paid,
      pending,
      count: entries.length,
      previousTotal,
      changePercent: percentChange(total, previousTotal),
      currentMonthTotal,
      previousMonthTotal,
      currentVsLastMonthPercent: percentChange(currentMonthTotal, previousMonthTotal),
    },
    categoryBreakdown,
    categoryComparison,
    teamSummary,
    topSpenders: teamSummary.slice(0, 5),
    monthlyTrend,
    settlementSummary,
    budgetSummary: {
      activeBudgets,
      history: budgetHistory,
      overspendingHistory,
    },
    approvalMetrics: {
      approvalRate: decidedCount ? (approvedCount / decidedCount) * 100 : 0,
      rejectionRate: decidedCount ? (rejectedCount / decidedCount) * 100 : 0,
      pendingApprovals: pendingCount,
      approvedCount,
      rejectedCount,
      reimbursementOutstanding,
      reimbursementTrend,
    },
  }
}
