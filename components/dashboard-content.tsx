"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { format as formatDate, formatDistanceToNow, parseISO } from "date-fns"
import { motion } from "framer-motion"
import {
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  TrendingUp,
  Users,
  Wallet,
  PiggyBank,
  CalendarDays,
  Bell,
  CheckCheck,
  ClipboardCheck,
  CircleX,
  CircleCheck,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useCurrency } from "@/hooks/use-currency"
import { EmptyState } from "@/components/ui/empty-states"
import type { LunchEntryWithProfile, Notification, SettlementWithProfiles } from "@/lib/database.types"
import type { RecurringExpenseWithCategory } from "@/lib/database.types"
import { getCategoryIcon } from "@/lib/categories/icons"
import { DashboardBalanceWidgets } from "@/components/dashboard/balance-widgets"
import { DashboardBudgetWidgets } from "@/components/budgets/budget-widgets"
import {
  BudgetAlertBanner,
  BudgetAlertToasts,
} from "@/components/budgets/budget-alerts"
import type { DashboardBudgetSummary } from "@/lib/budget/engine"
import type { DateRangeValue } from "@/lib/date-ranges"
import { DateRangeFilter } from "@/components/filters/date-range-filter"

const DashboardMonthlyChart = dynamic(
  () =>
    import("@/components/charts/dashboard-monthly-chart").then(
      (m) => m.DashboardMonthlyChart,
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[220px] w-full rounded-lg" />,
  },
)

const ExpensesByCategoryChart = dynamic(
  () => import("@/components/charts/category-charts").then((m) => m.ExpensesByCategoryChart),
  { ssr: false, loading: () => <Skeleton className="h-[220px] w-full rounded-lg" /> },
)

const TopCategoriesList = dynamic(
  () => import("@/components/charts/category-charts").then((m) => m.TopCategoriesList),
  { ssr: false, loading: () => <Skeleton className="h-[120px] w-full rounded-lg" /> },
)

type Activity = {
  id: string
  action?: string
  action_type?: string
  entity_type?: string
  description?: string
  message?: string
  created_at: string
  profiles?: { full_name: string | null } | null
}

type DashboardProps = {
  stats: {
    totalAmount: number
    totalPaid: number
    totalPending: number
    memberCount: number
    pendingApprovals: number
    approvedThisMonth: number
    rejectedExpenses: number
    reimbursementsOutstanding: number
  }
  recentEntries: LunchEntryWithProfile[]
  monthlyEntries: { amount: number; lunch_date: string }[]
  categoryEntries: {
    amount: number
    lunch_date: string
    category_id?: string | null
    expense_categories?: { id: string; name: string; color: string } | null
  }[]
  activity: Activity[]
  notificationSummary: {
    unreadCount: number
    pendingActions: number
    latest: Notification[]
  }
  balance: {
    pendingTotal: number
    youOwe: number
    youReceive: number
    recentSettlements: SettlementWithProfiles[]
  }
  budgetSummary: DashboardBudgetSummary
  leaderboard: {
    userId: string
    name: string
    total: number
    pending: number
    paid: number
  }[]
  dateRange: DateRangeValue
  historicalStats: {
    currentMonthTotal: number
    lastMonthTotal: number
    differencePercent: number
    averageMonthlySpend: number
  }
  upcomingRecurringExpenses: RecurringExpenseWithCategory[]
}

export function DashboardContent({
  stats,
  recentEntries,
  monthlyEntries,
  categoryEntries,
  activity,
  notificationSummary,
  leaderboard,
  balance,
  budgetSummary,
  dateRange,
  historicalStats,
  upcomingRecurringExpenses,
}: DashboardProps) {
  const { format } = useCurrency()

  const statCards = [
    {
      title: "Total expenses",
      value: format(stats.totalAmount),
      sub: "This month",
      icon: TrendingUp,
    },
    {
      title: "Collected",
      value: format(stats.totalPaid),
      sub: "Paid this month",
      icon: ArrowUpRight,
      className: "text-green-600 dark:text-green-400",
    },
    {
      title: "Pending payments",
      value: format(stats.totalPending),
      sub: "Outstanding balance",
      icon: ArrowDownLeft,
      className: "text-amber-600 dark:text-amber-400",
    },
    {
      title: "Active members",
      value: String(stats.memberCount),
      sub: "On your team",
      icon: Users,
    },
  ]

  const workflowCards = [
    { title: "Pending approvals", value: String(stats.pendingApprovals), icon: ClipboardCheck },
    { title: "Approved this month", value: String(stats.approvedThisMonth), icon: CircleCheck },
    { title: "Rejected expenses", value: String(stats.rejectedExpenses), icon: CircleX },
    { title: "Reimbursements outstanding", value: format(stats.reimbursementsOutstanding), icon: Wallet },
  ]

  const quickActions = [
    { href: "/entries", label: "All entries", icon: BookOpen },
    { href: "/recurring-expenses", label: "Recurring", icon: CalendarDays },
    { href: "/settlements", label: "Settlements", icon: Wallet },
    { href: "/categories", label: "Categories", icon: BookOpen },
    { href: "/budgets", label: "Budgets", icon: PiggyBank },
    { href: "/analytics", label: "Analytics", icon: TrendingUp },
    { href: "/reports", label: "Reports", icon: CalendarDays },
  ]

  return (
    <div className="min-w-0 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">{dateRange.label}</p>
        </div>
        <DateRangeFilter range={dateRange} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="h-full hover-lift soft-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <Icon className="size-4 shrink-0 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="break-words text-2xl font-bold">{stat.value}</div>
                  <p
                    className={`text-xs mt-1 ${stat.className ?? "text-muted-foreground"}`}
                  >
                    {stat.sub}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {workflowCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription>{stat.title}</CardDescription>
                <Icon className="size-4 shrink-0 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="break-words text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Last month spending", value: format(historicalStats.lastMonthTotal), icon: CalendarDays },
          { title: "Current month spending", value: format(historicalStats.currentMonthTotal), icon: TrendingUp },
          {
            title: "Difference",
            value: `${historicalStats.differencePercent >= 0 ? "+" : ""}${Math.round(historicalStats.differencePercent)}%`,
            icon: historicalStats.differencePercent >= 0 ? ArrowUpRight : ArrowDownLeft,
            sub: historicalStats.differencePercent >= 0 ? "Increased spending" : "Reduced spending",
          },
          { title: "Average monthly spend", value: format(historicalStats.averageMonthlySpend), icon: Wallet },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription>{stat.title}</CardDescription>
                <Icon className="size-4 shrink-0 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="break-words text-2xl font-bold">{stat.value}</div>
                {stat.sub && <p className="mt-1 text-xs text-muted-foreground">{stat.sub}</p>}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {quickActions.map((a) => {
          const Icon = a.icon
          return (
            <Button key={a.href} variant="outline" size="sm" asChild>
              <Link href={a.href}>
                <Icon className="size-4" />
                {a.label}
              </Link>
            </Button>
          )
        })}
      </div>

      <BudgetAlertToasts budgets={budgetSummary.budgets} />
      <BudgetAlertBanner summary={budgetSummary} />

      <DashboardBalanceWidgets
        pendingTotal={balance.pendingTotal}
        youOwe={balance.youOwe}
        youReceive={balance.youReceive}
        recentSettlements={balance.recentSettlements}
      />

      <DashboardBudgetWidgets summary={budgetSummary} />

      <Card>
        <CardHeader>
          <CardTitle>Monthly overview</CardTitle>
          <CardDescription>Team spending this month</CardDescription>
        </CardHeader>
        <CardContent>
          <DashboardMonthlyChart entries={monthlyEntries} />
        </CardContent>
      </Card>

      {categoryEntries.length > 0 && (
        <div className="grid min-w-0 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Expenses by category</CardTitle>
              <CardDescription>This month</CardDescription>
            </CardHeader>
            <CardContent>
              <ExpensesByCategoryChart entries={categoryEntries} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Top categories</CardTitle>
            </CardHeader>
            <CardContent>
              <TopCategoriesList entries={categoryEntries} />
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid min-w-0 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div className="min-w-0">
              <CardTitle>Recent entries</CardTitle>
              <CardDescription>Latest expense records</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/entries">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentEntries.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No expenses yet"
                description="Record team expenses to track spending and balances."
                actionLabel="Go to entries"
                actionHref="/entries"
              />
            ) : (
              <div className="space-y-3">
                {recentEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {entry.profiles?.full_name ?? "Member"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {entry.expense_categories?.name ?? entry.notes ?? "Expense"} ·{" "}
                        {formatDistanceToNow(new Date(entry.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-right">
                      <Badge
                        variant={
                          entry.payment_status === "paid"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {entry.payment_status}
                      </Badge>
                      <span className="font-semibold">
                        {format(Number(entry.amount))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="size-4 shrink-0 text-accent" />
                Leaderboard
              </CardTitle>
              <CardDescription>This month by spend</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {leaderboard.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet</p>
              ) : (
                leaderboard.map((row, i) => (
                  <div key={row.userId} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground w-4">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{row.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Pending {format(row.pending)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold">
                      {format(row.total)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="size-4 shrink-0 text-accent" />
                Upcoming recurring expenses
              </CardTitle>
              <CardDescription>Next scheduled rules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingRecurringExpenses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No scheduled expenses</p>
              ) : (
                upcomingRecurringExpenses.map((rule) => {
                  const cat = rule.expense_categories
                  const Icon = cat ? getCategoryIcon(cat.icon) : CalendarDays
                  return (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{rule.title}</p>
                        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                          {cat && (
                            <>
                              <Icon className="size-3 shrink-0" style={{ color: cat.color }} />
                              <span className="truncate">{cat.name}</span>
                              <span>·</span>
                            </>
                          )}
                          <span>{formatDate(parseISO(rule.next_run_date), "dd MMM yyyy")}</span>
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold">
                        {format(Number(rule.amount))}
                      </span>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle>Recent activity</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/activity">View</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[220px] overflow-y-auto">
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet</p>
              ) : (
                activity.slice(0, 6).map((a) => (
                  <div
                    key={a.id}
                    className="text-sm py-1.5 border-b border-border last:border-0"
                  >
                    <span className="font-medium">
                      {a.profiles?.full_name ?? "System"}
                    </span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {(a.description ?? a.message ?? a.action_type ?? "updated").replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-muted-foreground block">
                      {formatDistanceToNow(new Date(a.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <Bell className="size-4 shrink-0 text-accent" />
                Notifications
              </CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/notifications">View</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Unread</p>
                  <p className="mt-1 text-2xl font-bold">{notificationSummary.unreadCount}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Pending actions</p>
                  <p className="mt-1 text-2xl font-bold">{notificationSummary.pendingActions}</p>
                </div>
              </div>
              {notificationSummary.latest.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notifications</p>
              ) : (
                notificationSummary.latest.slice(0, 3).map((item) => (
                  <Link
                    key={item.id}
                    href={item.link ?? "/notifications"}
                    className="block rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                  >
                    <span className="block truncate font-medium">{item.title}</span>
                    <span className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {item.message ?? item.body}
                    </span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
