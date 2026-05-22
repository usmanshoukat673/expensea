"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { formatDistanceToNow, format } from "date-fns"
import { motion } from "framer-motion"
import {
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  TrendingUp,
  Users,
  Wallet,
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
import type { LunchEntryWithProfile } from "@/lib/database.types"

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

type Activity = {
  id: string
  action: string
  created_at: string
  profiles?: { full_name: string | null } | null
}

type DashboardProps = {
  stats: {
    totalAmount: number
    totalPaid: number
    totalPending: number
    memberCount: number
  }
  recentEntries: LunchEntryWithProfile[]
  monthlyEntries: { amount: number; lunch_date: string }[]
  activity: Activity[]
  leaderboard: {
    userId: string
    name: string
    total: number
    pending: number
    paid: number
  }[]
}

export function DashboardContent({
  stats,
  recentEntries,
  monthlyEntries,
  activity,
  leaderboard,
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

  const quickActions = [
    { href: "/entries", label: "All entries", icon: BookOpen },
    { href: "/team", label: "Team", icon: Users },
    { href: "/analytics", label: "Analytics", icon: TrendingUp },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        </div>
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
              <Card className="hover-lift soft-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <Icon className="w-4 h-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
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

      <div className="flex flex-wrap gap-2">
        {quickActions.map((a) => {
          const Icon = a.icon
          return (
            <Button key={a.href} variant="outline" size="sm" asChild>
              <Link href={a.href}>
                <Icon className="w-4 h-4 mr-1" />
                {a.label}
              </Link>
            </Button>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly overview</CardTitle>
          <CardDescription>Team spending this month</CardDescription>
        </CardHeader>
        <CardContent>
          <DashboardMonthlyChart entries={monthlyEntries} />
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
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
                    className="flex items-center justify-between py-3 border-b border-border last:border-0"
                  >
                    <div>
                      <p className="font-medium">
                        {entry.profiles?.full_name ?? "Member"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {entry.notes || "Expense"} ·{" "}
                        {formatDistanceToNow(new Date(entry.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-2">
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
                <Wallet className="w-4 h-4 text-accent" />
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
                    <span className="text-sm font-semibold">
                      {format(row.total)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
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
                      · {a.action.replace(/_/g, " ")}
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
        </div>
      </div>
    </div>
  )
}
