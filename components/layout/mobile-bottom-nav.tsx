"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, BookOpen, Scale, UserRound, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TeamRole } from "@/lib/database.types"

const items = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/entries", icon: BookOpen, label: "Entries" },
  { href: "/my-expenses", icon: UserRound, label: "Mine" },
  { href: "/settlements", icon: Scale, label: "Settle" },
  { href: "/settings/profile", icon: Settings, label: "Settings" },
]

export function MobileBottomNav({ role }: { role: TeamRole | null }) {
  const pathname = usePathname()
  const canManage = role === "owner" || role === "admin"
  const visibleItems = canManage ? items : items.filter((item) => item.href !== "/settings/team")

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-sidebar/95 backdrop-blur-md md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {visibleItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href))
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-[56px] flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1 text-[10px] font-medium leading-none",
                active ? "text-accent" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
