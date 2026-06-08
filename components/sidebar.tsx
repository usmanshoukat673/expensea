"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  BookOpen,
  Users,
  BarChart3,
  Settings,
  UserCog,
  Coins,
  Tag,
  Scale,
  PiggyBank,
  Bell,
  Activity,
  FileText,
  CalendarClock,
  ClipboardCheck,
  UserRound,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import { useCurrency } from "@/hooks/use-currency"
import { cn } from "@/lib/utils"
import { BrandLogo } from "@/components/branding/brand-logo"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { TeamSwitcher } from "@/components/team/team-switcher"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { TeamRole } from "@/lib/database.types"

const navItems = [
  { href: "/", icon: Home, label: "Dashboard", description: "Overview and trends" },
  { href: "/entries", icon: BookOpen, label: "Entries", description: "Shared expense ledger" },
  { href: "/my-expenses", icon: UserRound, label: "My Expenses", description: "Your personal activity" },
  { href: "/approvals", icon: ClipboardCheck, label: "Approvals", description: "Review pending spend" },
  { href: "/recurring-expenses", icon: CalendarClock, label: "Recurring", description: "Scheduled expenses" },
  { href: "/categories", icon: Tag, label: "Categories", description: "Expense categories" },
  { href: "/budgets", icon: PiggyBank, label: "Budgets", description: "Budget controls" },
  { href: "/settlements", icon: Scale, label: "Settlements", description: "Balances and settlement" },
  { href: "/reports", icon: FileText, label: "Reports", description: "Exportable insights" },
  { href: "/notifications", icon: Bell, label: "Notifications", description: "Alerts and updates" },
  { href: "/activity", icon: Activity, label: "Activity", description: "Team audit trail" },
  { href: "/team", icon: Users, label: "Team", description: "Members and workspace" },
  { href: "/analytics", icon: BarChart3, label: "Analytics", description: "Advanced analytics" },
  { href: "/settings/profile", icon: Settings, label: "Settings", description: "Profile and preferences" },
]

const navSections = [
  {
    heading: "Workspace",
    items: navItems.slice(0, 8),
  },
  {
    heading: "Insights",
    items: navItems.slice(8, 11),
  },
  {
    heading: "Team",
    items: navItems.slice(11),
  },
]

function CollapsedTooltip({
  collapsed,
  label,
  description,
  children,
}: {
  collapsed: boolean
  label: string
  description?: string
  children: React.ReactElement
}) {
  if (!collapsed) return children

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" align="center" sideOffset={10} className="max-w-52">
        <div className="space-y-0.5">
          <p className="font-medium">{label}</p>
          {description && <p className="text-[11px] opacity-75">{description}</p>}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

export function Sidebar({
  role,
  teamSlug,
  teamId,
  collapsed,
  onToggleCollapsed,
}: {
  role: TeamRole | null
  teamSlug?: string
  teamId?: string
  collapsed: boolean
  onToggleCollapsed: () => void
}) {
  const pathname = usePathname()
  const canManage = role === "owner" || role === "admin"
  const visibleNavItems = canManage
    ? navItems
    : navItems.filter((item) => item.href !== "/team")
  const { currency } = useCurrency()

  return (
    <TooltipProvider delayDuration={0} skipDelayDuration={0}>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 hidden h-dvh flex-col overflow-hidden border-r border-sidebar-border bg-sidebar transition-[width,min-width] duration-200 ease-out md:flex",
          collapsed ? "w-20 min-w-20" : "w-64 min-w-64",
        )}
        data-collapsed={collapsed}
      >
      <div className={cn("shrink-0 border-b border-sidebar-border", collapsed ? "space-y-2 px-3 py-4" : "space-y-3 px-4 py-5")}>
        <div className={cn("flex items-center", collapsed ? "w-full justify-center" : "justify-between gap-2")}>
          {!collapsed && (
            <BrandLogo
              size="sm"
              className="px-2"
              nameClassName="text-xs font-medium text-sidebar-foreground/60"
            />
          )}
          <div className={cn(collapsed && "flex w-full justify-center")}>
            <button
              type="button"
              onClick={onToggleCollapsed}
              className={cn(
                "inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/70 outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring",
                collapsed && "size-11 bg-transparent px-0 text-accent-foreground hover:bg-sidebar-accent",
              )}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-pressed={collapsed}
            >
              {collapsed ? (
                <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <PanelLeftOpen className="size-4 transition-transform duration-200" />
                </span>
              ) : (
                <PanelLeftClose className="size-4 transition-transform duration-200" />
              )}
            </button>
          </div>
        </div>
        {collapsed ? (
          <div className="flex w-full justify-center">
            <TeamSwitcher variant="sidebar" collapsed />
          </div>
        ) : (
          <TeamSwitcher variant="sidebar" className="px-2" />
        )}
      </div>

      <nav className={cn("min-h-0 flex-1 overflow-y-auto py-5", collapsed ? "space-y-3 px-3" : "space-y-5 px-4")}>
        {navSections.map((section) => {
          const items = section.items.filter((item) =>
            visibleNavItems.some((visibleItem) => visibleItem.href === item.href),
          )
          if (items.length === 0) return null

          return (
            <div key={section.heading} className="space-y-1">
              {!collapsed && (
                <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-normal text-sidebar-foreground/45">
                  {section.heading}
                </p>
              )}
              {items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href))
                const Icon = item.icon
                return (
                  <CollapsedTooltip
                    key={item.href}
                    collapsed={collapsed}
                    label={item.label}
                    description={item.description}
                  >
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      aria-label={collapsed ? item.label : undefined}
                      className={cn(
                        "group relative flex items-center rounded-lg text-sm font-medium leading-none outline-none transition-[background-color,color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-ring",
                        collapsed ? "h-11 justify-center px-0" : "gap-3 px-4 py-2.5",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                      )}
                    >
                      {collapsed && isActive && (
                        <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-accent" />
                      )}
                      <Icon className="size-5 shrink-0 transition-transform duration-150 group-hover:scale-105" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  </CollapsedTooltip>
                )
              })}
            </div>
          )
        })}
        {canManage && (
          <CollapsedTooltip
            collapsed={collapsed}
            label="Invite"
            description="Invite team members"
          >
            <Link
              href="/team/invite"
              aria-current={pathname === "/team/invite" ? "page" : undefined}
              aria-label={collapsed ? "Invite" : undefined}
              className={cn(
                "group relative flex items-center rounded-lg text-sm font-medium leading-none outline-none transition-[background-color,color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-ring",
                collapsed ? "h-11 justify-center px-0" : "gap-3 px-4 py-2.5",
                pathname === "/team/invite"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50",
              )}
            >
              {collapsed && pathname === "/team/invite" && (
                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-accent" />
              )}
              <UserCog className="size-5 shrink-0 transition-transform duration-150 group-hover:scale-105" />
              {!collapsed && <span className="truncate">Invite</span>}
            </Link>
          </CollapsedTooltip>
        )}
      </nav>

      <div className={cn("shrink-0 space-y-2 border-t border-sidebar-border py-4", collapsed ? "px-3" : "px-4")}>
        <CollapsedTooltip
          collapsed={collapsed}
          label={`${currency.code} currency`}
          description={`${currency.flag} ${currency.symbol}`}
        >
          <Link
            href="/settings/profile"
            aria-label={collapsed ? `${currency.code} currency settings` : undefined}
            className={cn(
              "flex rounded-lg text-sidebar-foreground/80 outline-none transition-colors hover:bg-sidebar-accent/10 focus-visible:ring-2 focus-visible:ring-ring",
              collapsed ? "h-10 items-center justify-center" : "items-center gap-2 px-2 py-2 text-xs",
              pathname.startsWith("/settings") && "bg-sidebar-accent/10",
            )}
          >
            <Coins className="size-4 shrink-0" />
            {!collapsed && (
              <span className="truncate">
                {currency.flag} {currency.code} · {currency.symbol}
              </span>
            )}
          </Link>
        </CollapsedTooltip>
        <div className={cn("flex items-center py-1", collapsed ? "justify-center px-0" : "justify-between px-2")}>
          {!collapsed && <span className="text-xs text-muted-foreground">Theme</span>}
          <ThemeToggle />
        </div>
        {teamSlug && teamId && !collapsed && (
          <div className="px-4 py-2 space-y-1">
            <Link
              href={`/public/team/${teamId}`}
              target="_blank"
              className="block text-xs text-muted-foreground hover:text-accent"
            >
              Public page ↗
            </Link>
            <Link
              href={`/share/${teamSlug}`}
              target="_blank"
              className="block text-xs text-muted-foreground hover:text-accent"
            >
              Share by slug ↗
            </Link>
          </div>
        )}
        <SignOutButton collapsed={collapsed} />
      </div>
      </aside>
    </TooltipProvider>
  )
}
