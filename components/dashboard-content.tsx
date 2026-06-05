"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { useMemo, useState, useTransition } from "react"
import { format as formatDate, formatDistanceToNow, parseISO } from "date-fns"
import { motion } from "framer-motion"
import {
  ArrowDown,
  ArrowDownLeft,
  ArrowUp,
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  CircleCheck,
  CircleX,
  ClipboardCheck,
  Copy,
  Download,
  EyeOff,
  GripVertical,
  LayoutDashboard,
  MoreHorizontal,
  PiggyBank,
  Plus,
  Scale,
  Settings2,
  Star,
  Trash2,
  Upload,
  Users,
  Wallet,
  TrendingUp,
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
import { EmptyState } from "@/components/ui/empty-states"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateRangeFilter } from "@/components/filters/date-range-filter"
import { DashboardBalanceWidgets } from "@/components/dashboard/balance-widgets"
import { DashboardBudgetWidgets } from "@/components/budgets/budget-widgets"
import { BudgetAlertBanner, BudgetAlertToasts } from "@/components/budgets/budget-alerts"
import { useCurrency } from "@/hooks/use-currency"
import { getCategoryIcon } from "@/lib/categories/icons"
import type { DashboardBudgetSummary } from "@/lib/budget/engine"
import type { DateRangeValue } from "@/lib/date-ranges"
import type { LunchEntryWithProfile, Notification, SettlementWithProfiles } from "@/lib/database.types"
import type { RecurringExpenseWithCategory } from "@/lib/database.types"
import {
  DASHBOARD_WIDGETS,
  WIDGET_LABELS,
  type DashboardCustomizationPayload,
  type DashboardFilters,
  type DashboardPinnedWidget,
  type DashboardSavedViewPayload,
  type DashboardWidgetId,
} from "@/lib/dashboard-customization"
import {
  createDashboardView,
  deleteDashboardView,
  duplicateDashboardView,
  importDashboardSettings,
  renameDashboardView,
  saveDashboardPreference,
  setDefaultDashboardView,
  toggleDashboardFavorite,
} from "@/lib/actions/dashboard-customization"

const DashboardMonthlyChart = dynamic(
  () => import("@/components/charts/dashboard-monthly-chart").then((m) => m.DashboardMonthlyChart),
  { ssr: false, loading: () => <Skeleton className="h-[220px] w-full rounded-lg" /> },
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
  notificationSummary: { unreadCount: number; pendingActions: number; latest: Notification[] }
  balance: {
    pendingTotal: number
    youOwe: number
    youReceive: number
    recentSettlements: SettlementWithProfiles[]
  }
  budgetSummary: DashboardBudgetSummary
  leaderboard: { userId: string; name: string; total: number; pending: number; paid: number }[]
  mostActiveMembers: { userId: string; name: string; count: number }[]
  highestAssignedExpenses: { userId: string; name: string; total: number }[]
  personalDashboard: {
    monthlyExpenses: number
    assignedExpenses: number
    settlements: number
    pendingApprovals: number
    budgetImpact: number
  }
  dateRange: DateRangeValue
  historicalStats: {
    currentMonthTotal: number
    lastMonthTotal: number
    differencePercent: number
    averageMonthlySpend: number
  }
  upcomingRecurringExpenses: RecurringExpenseWithCategory[]
  customization: DashboardCustomizationPayload
}

const FAVORITE_TYPES = [
  { type: "report", label: "Reports", href: "/reports" },
  { type: "category", label: "Categories", href: "/categories" },
  { type: "team", label: "Team", href: "/team" },
  { type: "dashboard", label: "Dashboard", href: "/" },
] as const

function moveItem(items: DashboardWidgetId[], from: number, to: number) {
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export function DashboardContent(props: DashboardProps) {
  const { format } = useCurrency()
  const [isPending, startTransition] = useTransition()
  const [order, setOrder] = useState(props.customization.preference.layout.widgets)
  const [hidden, setHidden] = useState(props.customization.preference.hiddenWidgets)
  const [pinned, setPinned] = useState(props.customization.preference.pinnedWidgets)
  const [favorites, setFavorites] = useState(props.customization.favorites)
  const [savedViews, setSavedViews] = useState(props.customization.savedViews)
  const [activeViewId, setActiveViewId] = useState(props.customization.preference.defaultViewId ?? "")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsMessage, setSettingsMessage] = useState("")
  const [viewName, setViewName] = useState("Finance Overview")
  const [renameValue, setRenameValue] = useState("")
  const [importValue, setImportValue] = useState("")
  const [dragging, setDragging] = useState<DashboardWidgetId | null>(null)

  const hiddenSet = useMemo(() => new Set(hidden), [hidden])
  const filters: DashboardFilters = {
    dateRange: props.dateRange.preset,
    from: props.dateRange.from,
    to: props.dateRange.to,
  }

  const persist = (nextOrder = order, nextHidden = hidden, nextPinned = pinned) => {
    startTransition(() => {
      saveDashboardPreference({ widgets: nextOrder, hiddenWidgets: nextHidden, pinnedWidgets: nextPinned })
    })
  }

  const applyView = (viewId: string) => {
    setActiveViewId(viewId)
    const view = savedViews.find((item) => item.id === viewId)
    if (!view) return
    setOrder(view.layout.widgets)
    setHidden(view.hiddenWidgets)
    setPinned(view.pinnedWidgets)
  }

  const updateOrder = (nextOrder: DashboardWidgetId[]) => {
    setOrder(nextOrder)
    persist(nextOrder, hidden, pinned)
  }

  const updateHidden = (widget: DashboardWidgetId, visible: boolean) => {
    const nextHidden = visible ? hidden.filter((item) => item !== widget) : [...new Set([...hidden, widget])]
    setHidden(nextHidden)
    persist(order, nextHidden, pinned)
  }

  const updatePinned = (widget: DashboardPinnedWidget) => {
    const nextPinned = pinned.includes(widget) ? pinned.filter((item) => item !== widget) : [...pinned, widget]
    setPinned(nextPinned)
    persist(order, hidden, nextPinned)
  }

  const favoritePinForType = (type: (typeof FAVORITE_TYPES)[number]["type"]): DashboardPinnedWidget =>
    type === "dashboard" ? "dashboards" : type === "report" ? "reports" : type === "category" ? "categories" : "teams"

  const toggleFavorite = (item: (typeof FAVORITE_TYPES)[number]) => {
    const pin = favoritePinForType(item.type)
    const existing = favorites.find((favorite) => favorite.favoriteType === item.type && favorite.label === item.label)
    const nextPinned = pinned.includes(pin) ? pinned.filter((value) => value !== pin) : [...pinned, pin]
    const nextFavorites = existing
      ? favorites.filter((favorite) => favorite.id !== existing.id)
      : [
          {
            id: `optimistic-${item.type}`,
            favoriteType: item.type,
            favoriteId: null,
            label: item.label,
            href: item.href,
            metadata: {},
          },
          ...favorites,
        ]

    setSettingsMessage("")
    setPinned(nextPinned)
    setFavorites(nextFavorites)
    startTransition(async () => {
      const result = await toggleDashboardFavorite({
        favoriteType: item.type,
        label: item.label,
        href: item.href,
      })
      if (result.error) {
        setPinned(pinned)
        setFavorites(favorites)
        setSettingsMessage(result.error)
      } else {
        persist(order, hidden, nextPinned)
      }
    })
  }

  const createView = () => {
    startTransition(async () => {
      const result = await createDashboardView(viewName, { widgets: order, hiddenWidgets: hidden, pinnedWidgets: pinned, filters })
      if (result.success && result.id) {
        setSavedViews((items) => [
          {
            id: result.id!,
            name: viewName.trim(),
            layout: { widgets: order },
            hiddenWidgets: hidden,
            pinnedWidgets: pinned,
            filters,
            isDefault: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          ...items,
        ])
        setActiveViewId(result.id)
      }
    })
  }

  const exportSettings = () => {
    const payload = JSON.stringify({ name: viewName, widgets: order, hiddenWidgets: hidden, pinnedWidgets: pinned, filters }, null, 2)
    setImportValue(payload)
  }

  const importSettings = () => {
    startTransition(async () => {
      const parsed = JSON.parse(importValue)
      await importDashboardSettings(parsed)
      if (Array.isArray(parsed.widgets)) setOrder(parsed.widgets)
      if (Array.isArray(parsed.hiddenWidgets)) setHidden(parsed.hiddenWidgets)
      if (Array.isArray(parsed.pinnedWidgets)) setPinned(parsed.pinnedWidgets)
    })
  }

  const widgetMap: Record<DashboardWidgetId, React.ReactNode> = {
    summary: <SummaryWidget stats={props.stats} format={format} />,
    workflow: <WorkflowWidget stats={props.stats} format={format} />,
    historical: <HistoricalWidget stats={props.historicalStats} format={format} />,
    quick_actions: <QuickActionsWidget favorites={favorites} />,
    balance: (
      <DashboardBalanceWidgets
        pendingTotal={props.balance.pendingTotal}
        youOwe={props.balance.youOwe}
        youReceive={props.balance.youReceive}
        recentSettlements={props.balance.recentSettlements}
      />
    ),
    budget: <DashboardBudgetWidgets summary={props.budgetSummary} />,
    monthly_overview: (
      <Card>
        <CardHeader>
          <CardTitle>Monthly overview</CardTitle>
          <CardDescription>Team spending this month</CardDescription>
        </CardHeader>
        <CardContent>
          <DashboardMonthlyChart entries={props.monthlyEntries} />
        </CardContent>
      </Card>
    ),
    categories: <CategoriesWidget entries={props.categoryEntries} />,
    recent_entries: <RecentEntriesWidget entries={props.recentEntries} format={format} />,
    leaderboard: (
      <div className="grid gap-6 lg:grid-cols-3">
        <LeaderboardWidget leaderboard={props.leaderboard} format={format} />
        <MostActiveMembersWidget members={props.mostActiveMembers} />
        <HighestAssignedWidget members={props.highestAssignedExpenses} format={format} />
      </div>
    ),
    recurring: <RecurringWidget rules={props.upcomingRecurringExpenses} format={format} />,
    activity: <ActivityWidget activity={props.activity} />,
    notifications: <NotificationsWidget summary={props.notificationSummary} />,
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">{props.dateRange.label}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={activeViewId || "custom"} onValueChange={applyView}>
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Saved views" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="custom">Custom dashboard</SelectItem>
              {savedViews.map((view) => (
                <SelectItem key={view.id} value={view.id}>
                  {view.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DateRangeFilter range={props.dateRange} />
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
            <Settings2 className="size-4" />
            Customize
          </Button>
        </div>
      </div>

      <BudgetAlertToasts budgets={props.budgetSummary.budgets} />
      {!hiddenSet.has("budget") && <BudgetAlertBanner summary={props.budgetSummary} />}

      <PersonalDashboardWidget stats={props.personalDashboard} format={format} />

      <div className="space-y-6">
        {order.map((widget, index) =>
          hiddenSet.has(widget) ? null : (
            <section
              key={widget}
              draggable
              onDragStart={() => setDragging(widget)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (!dragging || dragging === widget) return
                updateOrder(moveItem(order, order.indexOf(dragging), index))
                setDragging(null)
              }}
              className="group rounded-lg outline-none transition-all"
            >
              <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground opacity-70 transition-opacity group-hover:opacity-100">
                <span className="inline-flex items-center gap-2">
                  <GripVertical className="size-4 cursor-grab" />
                  {WIDGET_LABELS[widget]}
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="size-7" disabled={index === 0} onClick={() => updateOrder(moveItem(order, index, index - 1))}>
                    <ArrowUp className="size-3.5" />
                    <span className="sr-only">Move up</span>
                  </Button>
                  <Button variant="ghost" size="icon" className="size-7" disabled={index === order.length - 1} onClick={() => updateOrder(moveItem(order, index, index + 1))}>
                    <ArrowDown className="size-3.5" />
                    <span className="sr-only">Move down</span>
                  </Button>
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => updateHidden(widget, false)}>
                    <EyeOff className="size-3.5" />
                    <span className="sr-only">Hide widget</span>
                  </Button>
                </div>
              </div>
              {widgetMap[widget]}
            </section>
          ),
        )}
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Customize dashboard</DialogTitle>
            <DialogDescription>Changes save automatically for this team.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-4">
              <div className="rounded-lg border p-3">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium">Widgets</p>
                  {isPending && <span className="text-xs text-muted-foreground">Saving</span>}
                </div>
                <div className="space-y-2">
                  {DASHBOARD_WIDGETS.map((widget) => (
                    <div key={widget} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                      <span className="text-sm">{WIDGET_LABELS[widget]}</span>
                      <Switch checked={!hiddenSet.has(widget)} onCheckedChange={(checked) => updateHidden(widget, checked)} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <p className="mb-3 text-sm font-medium">Favorites</p>
                {settingsMessage && <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{settingsMessage}</p>}
                <div className="grid gap-2 sm:grid-cols-2">
                  {FAVORITE_TYPES.map((item) => {
                    const active = favorites.some((favorite) => favorite.favoriteType === item.type && favorite.label === item.label)
                    return (
                      <Button
                        key={item.type}
                        variant={active ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleFavorite(item)}
                      >
                        <Star className="size-4" />
                        {item.label}
                      </Button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border p-3">
                <p className="mb-3 text-sm font-medium">Saved views</p>
                <div className="flex gap-2">
                  <Input value={viewName} onChange={(event) => setViewName(event.target.value)} />
                  <Button size="sm" onClick={createView}>
                    <Plus className="size-4" />
                    Save
                  </Button>
                </div>
                <div className="mt-3 space-y-2">
                  {savedViews.map((view) => (
                    <SavedViewRow
                      key={view.id}
                      view={view}
                      defaultViewId={props.customization.preference.defaultViewId}
                      renameValue={renameValue}
                      onRenameValue={setRenameValue}
                      onApply={() => applyView(view.id)}
                      onRename={() => {
                        startTransition(() => {
                          void renameDashboardView(view.id, renameValue || view.name)
                        })
                        setSavedViews((items) => items.map((item) => (item.id === view.id ? { ...item, name: renameValue || view.name } : item)))
                        setRenameValue("")
                      }}
                      onDuplicate={() => {
                        startTransition(() => {
                          void duplicateDashboardView(view.id)
                        })
                      }}
                      onDelete={() => {
                        startTransition(() => {
                          void deleteDashboardView(view.id)
                        })
                        setSavedViews((items) => items.filter((item) => item.id !== view.id))
                      }}
                      onDefault={() => {
                        startTransition(() => {
                          void setDefaultDashboardView(view.id)
                        })
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <p className="mb-3 text-sm font-medium">Import / export</p>
                <div className="mb-2 flex gap-2">
                  <Button variant="outline" size="sm" onClick={exportSettings}>
                    <Download className="size-4" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm" onClick={importSettings} disabled={!importValue.trim()}>
                    <Upload className="size-4" />
                    Import
                  </Button>
                </div>
                <Textarea value={importValue} onChange={(event) => setImportValue(event.target.value)} className="min-h-[120px] font-mono text-xs" />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SummaryWidget({ stats, format }: { stats: DashboardProps["stats"]; format: (value: number) => string }) {
  const statCards = [
    { title: "Total expenses", value: format(stats.totalAmount), sub: "This month", icon: TrendingUp },
    { title: "Collected", value: format(stats.totalPaid), sub: "Paid this month", icon: ArrowUpRight, className: "text-green-600 dark:text-green-400" },
    { title: "Pending payments", value: format(stats.totalPending), sub: "Outstanding balance", icon: ArrowDownLeft, className: "text-amber-600 dark:text-amber-400" },
    { title: "Active members", value: String(stats.memberCount), sub: "On your team", icon: Users },
  ]
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat, i) => {
        const Icon = stat.icon
        return (
          <motion.div key={stat.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="h-full hover-lift soft-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <Icon className="size-4 shrink-0 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="break-words text-2xl font-bold">{stat.value}</div>
                <p className={`mt-1 text-xs ${stat.className ?? "text-muted-foreground"}`}>{stat.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}

function WorkflowWidget({ stats, format }: { stats: DashboardProps["stats"]; format: (value: number) => string }) {
  const cards = [
    { title: "Pending approvals", value: String(stats.pendingApprovals), icon: ClipboardCheck },
    { title: "Approved this month", value: String(stats.approvedThisMonth), icon: CircleCheck },
    { title: "Rejected expenses", value: String(stats.rejectedExpenses), icon: CircleX },
    { title: "Reimbursements outstanding", value: format(stats.reimbursementsOutstanding), icon: Wallet },
  ]
  return <StatGrid cards={cards} />
}

function HistoricalWidget({ stats, format }: { stats: DashboardProps["historicalStats"]; format: (value: number) => string }) {
  return (
    <StatGrid
      cards={[
        { title: "Last month spending", value: format(stats.lastMonthTotal), icon: CalendarDays },
        { title: "Current month spending", value: format(stats.currentMonthTotal), icon: TrendingUp },
        { title: "Difference", value: `${stats.differencePercent >= 0 ? "+" : ""}${Math.round(stats.differencePercent)}%`, icon: stats.differencePercent >= 0 ? ArrowUpRight : ArrowDownLeft, sub: stats.differencePercent >= 0 ? "Increased spending" : "Reduced spending" },
        { title: "Average monthly spend", value: format(stats.averageMonthlySpend), icon: Wallet },
      ]}
    />
  )
}

function StatGrid({ cards }: { cards: { title: string; value: string; sub?: string; icon: typeof Wallet }[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((stat) => {
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
  )
}

function QuickActionsWidget({ favorites }: { favorites: DashboardCustomizationPayload["favorites"] }) {
  const quickActions = [
    { href: "/entries", label: "Add Expense", icon: BookOpen },
    { href: "/budgets", label: "Create Budget", icon: PiggyBank },
    { href: "/categories", label: "Add Category", icon: BookOpen },
    { href: "/team", label: "Invite Member", icon: Users },
    { href: "/reports", label: "Reports", icon: CalendarDays },
    { href: "/analytics", label: "Analytics", icon: TrendingUp },
  ]
  return (
    <Card>
      <CardContent className="flex flex-wrap gap-2 p-4">
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
        {favorites.map((favorite) => (
          <Button key={favorite.id} variant="secondary" size="sm" asChild>
            <Link href={favorite.href ?? "/"}>
              <Star className="size-4" />
              {favorite.label}
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}

function CategoriesWidget({ entries }: { entries: DashboardProps["categoryEntries"] }) {
  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Expenses by category</CardTitle>
          <CardDescription>This month</CardDescription>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <EmptyState
              icon={PiggyBank}
              title="No category spend"
              description="Approved expenses in this date range will appear here."
            />
          ) : (
            <ExpensesByCategoryChart entries={entries} />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Top categories</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No category data for this range.</p>
          ) : (
            <TopCategoriesList entries={entries} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function RecentEntriesWidget({ entries, format }: { entries: LunchEntryWithProfile[]; format: (value: number) => string }) {
  return (
    <Card>
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
        {entries.length === 0 ? (
          <EmptyState icon={BookOpen} title="No expenses yet" description="Record team expenses to track spending and balances." actionLabel="Go to entries" actionHref="/entries" />
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-0">
                <div className="min-w-0">
                  <p className="truncate font-medium">{entry.profiles?.full_name ?? "Member"}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {entry.expense_categories?.name ?? entry.notes ?? "Expense"} · {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-right">
                  <Badge variant={entry.payment_status === "paid" ? "default" : "secondary"}>{entry.payment_status}</Badge>
                  <span className="font-semibold">{format(Number(entry.amount))}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function LeaderboardWidget({ leaderboard, format }: { leaderboard: DashboardProps["leaderboard"]; format: (value: number) => string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="size-4 shrink-0 text-accent" />
          Leaderboard
        </CardTitle>
        <CardDescription>This month by spend</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {leaderboard.length === 0 ? <p className="text-sm text-muted-foreground">No data yet</p> : leaderboard.map((row, i) => (
          <div key={row.userId} className="flex items-center gap-3">
            <span className="w-4 font-mono text-xs text-muted-foreground">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{row.name}</p>
              <p className="text-xs text-muted-foreground">Pending {format(row.pending)}</p>
            </div>
            <span className="shrink-0 text-sm font-semibold">{format(row.total)}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function PersonalDashboardWidget({ stats, format }: { stats: DashboardProps["personalDashboard"]; format: (value: number) => string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>My dashboard</CardTitle>
        <CardDescription>Your personal workspace in this date range</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "My expenses this month", value: format(stats.monthlyExpenses), icon: Wallet },
            { label: "My assigned expenses", value: format(stats.assignedExpenses), icon: BookOpen },
            { label: "My settlements", value: format(stats.settlements), icon: Scale },
            { label: "My pending approvals", value: String(stats.pendingApprovals), icon: ClipboardCheck },
            { label: "My budget impact", value: format(stats.budgetImpact), icon: PiggyBank },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div key={item.label} className="rounded-lg border border-border p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <Icon className="size-4 shrink-0 text-accent" />
                </div>
                <p className="break-words text-xl font-bold">{item.value}</p>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function MostActiveMembersWidget({ members }: { members: DashboardProps["mostActiveMembers"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Most active members</CardTitle>
        <CardDescription>By expense activity</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {members.length === 0 ? <p className="text-sm text-muted-foreground">No data yet</p> : members.map((row, i) => (
          <div key={row.userId} className="flex items-center gap-3">
            <span className="w-4 font-mono text-xs text-muted-foreground">{i + 1}</span>
            <p className="min-w-0 flex-1 truncate text-sm font-medium">{row.name}</p>
            <Badge variant="secondary">{row.count}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function HighestAssignedWidget({ members, format }: { members: DashboardProps["highestAssignedExpenses"]; format: (value: number) => string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Highest assigned expenses</CardTitle>
        <CardDescription>Individual assignments</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {members.length === 0 ? <p className="text-sm text-muted-foreground">No assigned expenses yet</p> : members.map((row, i) => (
          <div key={row.userId} className="flex items-center gap-3">
            <span className="w-4 font-mono text-xs text-muted-foreground">{i + 1}</span>
            <p className="min-w-0 flex-1 truncate text-sm font-medium">{row.name}</p>
            <span className="shrink-0 text-sm font-semibold">{format(row.total)}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function RecurringWidget({ rules, format }: { rules: RecurringExpenseWithCategory[]; format: (value: number) => string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="size-4 shrink-0 text-accent" />
          Upcoming recurring expenses
        </CardTitle>
        <CardDescription>Next scheduled rules</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rules.length === 0 ? <p className="text-sm text-muted-foreground">No scheduled expenses</p> : rules.map((rule) => {
          const cat = rule.expense_categories
          const Icon = cat ? getCategoryIcon(cat.icon) : CalendarDays
          return (
            <div key={rule.id} className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0">
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
              <span className="shrink-0 text-sm font-semibold">{format(Number(rule.amount))}</span>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

function ActivityWidget({ activity }: { activity: Activity[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Recent activity</CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link href="/activity">View</Link>
        </Button>
      </CardHeader>
      <CardContent className="max-h-[260px] space-y-2 overflow-y-auto">
        {activity.length === 0 ? <p className="text-sm text-muted-foreground">No activity yet</p> : activity.slice(0, 8).map((a) => (
          <div key={a.id} className="border-b border-border py-1.5 text-sm last:border-0">
            <span className="font-medium">{a.profiles?.full_name ?? "System"}</span>
            <span className="text-muted-foreground"> · {(a.description ?? a.message ?? a.action_type ?? "updated").replace(/_/g, " ")}</span>
            <span className="block text-xs text-muted-foreground">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function NotificationsWidget({ summary }: { summary: DashboardProps["notificationSummary"] }) {
  return (
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
            <p className="mt-1 text-2xl font-bold">{summary.unreadCount}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Pending actions</p>
            <p className="mt-1 text-2xl font-bold">{summary.pendingActions}</p>
          </div>
        </div>
        {summary.latest.length === 0 ? <p className="text-sm text-muted-foreground">No notifications</p> : summary.latest.slice(0, 3).map((item) => (
          <Link key={item.id} href={item.link ?? "/notifications"} className="block rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-muted/50">
            <span className="block truncate font-medium">{item.title}</span>
            <span className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{item.message ?? item.body}</span>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}

function SavedViewRow({
  view,
  defaultViewId,
  renameValue,
  onRenameValue,
  onApply,
  onRename,
  onDuplicate,
  onDelete,
  onDefault,
}: {
  view: DashboardSavedViewPayload
  defaultViewId: string | null
  renameValue: string
  onRenameValue: (value: string) => void
  onApply: () => void
  onRename: () => void
  onDuplicate: () => void
  onDelete: () => void
  onDefault: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
      <button type="button" className="min-w-0 flex-1 text-left text-sm font-medium" onClick={onApply}>
        <span className="truncate">{view.name}</span>
        {(defaultViewId === view.id || view.isDefault) && <Check className="ml-2 inline size-3.5 text-green-600" />}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8">
            <MoreHorizontal className="size-4" />
            <span className="sr-only">View actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <div className="p-2">
            <Input placeholder={view.name} value={renameValue} onChange={(event) => onRenameValue(event.target.value)} />
          </div>
          <DropdownMenuItem onClick={onRename}>
            <LayoutDashboard className="size-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDefault}>
            <Check className="size-4" />
            Set default
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDuplicate}>
            <Copy className="size-4" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
