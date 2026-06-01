"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CalendarDays } from "lucide-react"
import { dateRangeOptions, type DateRangePreset, type DateRangeValue } from "@/lib/date-ranges"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export function DateRangeFilter({
  range,
  singleRow,
}: {
  range: DateRangeValue
  /** Keep custom controls on one row (analytics header). */
  singleRow?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [customFrom, setCustomFrom] = useState(range.from)
  const [customTo, setCustomTo] = useState(range.to)

  useEffect(() => {
    setCustomFrom(range.from)
    setCustomTo(range.to)
  }, [range.from, range.to])

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value)
      else params.delete(key)
    })
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const selectPreset = (preset: DateRangePreset) => {
    updateParams({
      dateRange: preset === "this_month" ? null : preset,
      from: preset === "custom" ? customFrom : null,
      to: preset === "custom" ? customTo : null,
    })
  }

  const applyCustomRange = () => {
    updateParams({
      dateRange: "custom",
      from: customFrom,
      to: customTo,
    })
  }

  const resetButton =
    range.preset !== "this_month" ? (
      <Button
        variant="ghost"
        size="sm"
        className="shrink-0"
        onClick={() => updateParams({ dateRange: null, from: null, to: null })}
      >
        Reset
      </Button>
    ) : null

  return (
    <div className={cn("w-full min-w-0 max-w-full md:w-auto", singleRow && "md:min-w-max")}>
      <div
        className={cn(
          "flex items-center gap-2",
          singleRow ? "flex-nowrap" : "flex-wrap",
        )}
      >
        <div className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="size-4 shrink-0" />
          <span className="whitespace-nowrap">Date range</span>
        </div>
        <Select value={range.preset} onValueChange={(v) => selectPreset(v as DateRangePreset)}>
          <SelectTrigger className="w-[170px] shrink-0 bg-background">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent
            className="w-[var(--radix-select-trigger-width)] min-w-[170px]"
            position="popper"
            align="end"
            sideOffset={4}
          >
            {dateRangeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {range.preset === "custom" && (
          <div
            className={cn(
              "gap-2",
              singleRow
                ? "flex shrink-0 items-center"
                : "grid grid-cols-[140px_140px_auto_auto]",
            )}
          >
            <Input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="w-[140px] shrink-0 bg-background"
            />
            <Input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="w-[140px] shrink-0 bg-background"
            />
            <Button size="sm" className="shrink-0" onClick={applyCustomRange}>
              Apply
            </Button>
            {resetButton}
          </div>
        )}
        {range.preset !== "custom" && resetButton}
      </div>
    </div>
  )
}
