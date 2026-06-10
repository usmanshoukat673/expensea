"use client"

import { useTransition, type ReactNode } from "react"
import { Funnel, RotateCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export function FilterSheet({
  title = "Filters",
  description = "Refine this list.",
  activeCount = 0,
  children,
  onApply,
  onReset,
  align = "end",
}: {
  title?: string
  description?: string
  activeCount?: number
  children: ReactNode
  onApply?: () => void
  onReset?: () => void
  align?: "start" | "end"
}) {
  const isActive = activeCount > 0
  const [pending, startTransition] = useTransition()

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant={isActive ? "default" : "outline"}
          size="sm"
          className={cn("relative shrink-0", align === "start" && "self-start")}
          aria-label={isActive ? `Open filters, ${activeCount} active` : "Open filters"}
        >
          <Funnel className="size-4" />
          <span>Filters</span>
          {isActive && (
            <Badge
              variant="secondary"
              className="ml-1 h-5 min-w-5 rounded-full px-1.5 text-[11px] font-semibold"
            >
              {activeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border p-5 pr-12">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-5 overflow-y-auto p-5">{children}</div>
        <SheetFooter className="sticky bottom-0 border-t border-border bg-background/95 p-4 backdrop-blur">
          <div className="flex w-full gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => startTransition(() => onReset?.())}
              disabled={!isActive}
              isLoading={pending && isActive}
              loadingText="Resetting..."
            >
              <RotateCcw className="size-4" />
              Reset
            </Button>
            <SheetClose asChild>
              <Button
                type="button"
                className="flex-1"
                onClick={() => startTransition(() => onApply?.())}
                isLoading={pending}
                loadingText="Applying..."
              >
                Apply filters
              </Button>
            </SheetClose>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function FilterField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {children}
    </div>
  )
}
