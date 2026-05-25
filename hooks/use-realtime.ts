"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const TEAM_REALTIME_TABLES = [
  "lunch_entries",
  "lunch_entry_participants",
  "team_members",
  "monthly_summaries",
  "team_activity_log",
  "expense_categories",
  "team_budgets",
  "settlements",
  "notifications",
  "teams",
] as const

const TEAM_FILTERED_TABLES = new Set<string>([
  "lunch_entries",
  "team_members",
  "monthly_summaries",
  "team_activity_log",
  "expense_categories",
  "team_budgets",
  "settlements",
  "notifications",
])

export function useRealtime(teamId: string | null) {
  const router = useRouter()

  useEffect(() => {
    if (!teamId) return

    const supabase = createClient()
    let channel = supabase.channel(`team-${teamId}`)

    for (const table of TEAM_REALTIME_TABLES) {
      channel = channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          ...(TEAM_FILTERED_TABLES.has(table)
            ? { filter: `team_id=eq.${teamId}` }
            : {}),
        },
        () => router.refresh(),
      )
    }

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [teamId, router])
}
