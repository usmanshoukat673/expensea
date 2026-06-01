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
  FileText,
} from "lucide-react"
import { useCurrency } from "@/hooks/use-currency"
import { cn } from "@/lib/utils"
import { BrandLogo } from "@/components/branding/brand-logo"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { TeamSwitcher } from "@/components/team/team-switcher"
import type { TeamRole } from "@/lib/database.types"

const navItems = [
  { href: "/", icon: Home, label: "Dashboard" },
  { href: "/entries", icon: BookOpen, label: "Entries" },
  { href: "/categories", icon: Tag, label: "Categories" },
  { href: "/budgets", icon: PiggyBank, label: "Budgets" },
  { href: "/settlements", icon: Scale, label: "Settlements" },
  { href: "/reports", icon: FileText, label: "Reports" },
  { href: "/activity", icon: Bell, label: "Activity" },
  { href: "/team", icon: Users, label: "Team" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/settings/profile", icon: Settings, label: "Settings" },
]

export function Sidebar({
  role,
  teamSlug,
  teamId,
}: {
  role: TeamRole | null
  teamSlug?: string
  teamId?: string
}) {
  const pathname = usePathname()
  const canManage = role === "owner" || role === "admin"
  const { currency } = useCurrency()

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-dvh w-64 min-w-64 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar md:flex">
      <div className="shrink-0 space-y-3 border-b border-sidebar-border px-4 py-5">
        <BrandLogo
          size="sm"
          className="px-2"
          nameClassName="text-xs font-medium text-sidebar-foreground/60"
        />
        <TeamSwitcher variant="sidebar" className="px-2" />
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-4 py-6">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href))
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium leading-none transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50",
              )}
            >
              <Icon className="size-5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
        {canManage && (
          <Link
            href="/team/invite"
            className={cn(
              "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium leading-none transition-colors",
              pathname === "/team/invite"
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50",
            )}
          >
            <UserCog className="size-5 shrink-0" />
            <span className="truncate">Invite</span>
          </Link>
        )}
      </nav>

      <div className="shrink-0 space-y-2 border-t border-sidebar-border px-4 py-4">
        <Link
          href="/settings/profile"
          className={cn(
            "flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-sidebar-foreground/80 hover:bg-sidebar-accent/10 transition-colors",
            pathname.startsWith("/settings") && "bg-sidebar-accent/10",
          )}
        >
          <Coins className="w-4 h-4 shrink-0" />
          <span className="truncate">
            {currency.flag} {currency.code} · {currency.symbol}
          </span>
        </Link>
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
        {teamSlug && teamId && (
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
        <SignOutButton />
      </div>
    </aside>
  )
}
