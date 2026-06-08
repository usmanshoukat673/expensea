"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CalendarDays, RotateCcw } from "lucide-react"
import { dateRangeOptions, type DateRangePreset, type DateRangeValue } from "@/lib/date-ranges"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export function DateRangeFilter({
  range,
  singleRow,
  showLabel = true,
  className,
}: {
  range: DateRangeValue
  /** Keep custom controls on one row (analytics header). */
  singleRow?: boolean
  showLabel?: boolean
  className?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [preset, setPreset] = useState<DateRangePreset>(range.preset)
  const [customFrom, setCustomFrom] = useState(range.from)
  const [customTo, setCustomTo] = useState(range.to)
  const isActive = range.preset !== "this_month"

  useEffect(() => {
    setPreset(range.preset)
    setCustomFrom(range.from)
    setCustomTo(range.to)
  }, [range.from, range.preset, range.to])

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value)
      else params.delete(key)
    })
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const applyRange = () => {
    updateParams({
      dateRange: preset === "this_month" ? null : preset,
      from: preset === "custom" ? customFrom : null,
      to: preset === "custom" ? customTo : null,
    })
  }

  const resetRange = () => {
    setPreset("this_month")
    updateParams({ dateRange: null, from: null, to: null })
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant={isActive ? "default" : "outline"}
          size="sm"
          className={cn("relative w-full justify-start sm:w-auto", singleRow && "sm:w-auto", className)}
          aria-label={isActive ? `Open date range filter, ${range.label} selected` : "Open date range filter"}
        >
          <CalendarDays className="size-4" />
          <span>{showLabel ? "Date range" : range.label}</span>
          {showLabel && <span className="hidden max-w-[160px] truncate text-muted-foreground sm:inline">{range.label}</span>}
          {isActive && (
            <Badge
              variant="secondary"
              className="ml-auto h-5 min-w-5 rounded-full px-1.5 text-[11px] font-semibold sm:ml-1"
            >
              1
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border p-5 pr-12">
          <SheetTitle>Date range</SheetTitle>
          <SheetDescription>Choose the time period used by this page.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div className="space-y-2">
            <Label htmlFor="date-range-preset">Range preset</Label>
            <Select value={preset} onValueChange={(value) => setPreset(value as DateRangePreset)}>
              <SelectTrigger id="date-range-preset">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent position="popper" align="end" sideOffset={4}>
                {dateRangeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {preset === "custom" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date-range-from">Start date</Label>
                <Input
                  id="date-range-from"
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date-range-to">End date</Label>
                <Input
                  id="date-range-to"
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="bg-background"
                />
              </div>
            </div>
          )}
        </div>
        <SheetFooter className="sticky bottom-0 border-t border-border bg-background/95 p-4 backdrop-blur">
          <div className="flex w-full gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={resetRange}
              disabled={!isActive}
            >
              <RotateCcw className="size-4" />
              Reset
            </Button>
            <SheetClose asChild>
              <Button type="button" className="flex-1" onClick={applyRange}>
                Apply range
              </Button>
            </SheetClose>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
