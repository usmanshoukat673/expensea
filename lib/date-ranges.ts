import { addMonths, endOfMonth, endOfWeek, format, isValid, startOfMonth, startOfWeek, subMonths, subYears } from "date-fns"

export type DateRangePreset =
  | "today"
  | "this_week"
  | "this_month"
  | "last_month"
  | "last_3_months"
  | "last_6_months"
  | "this_year"
  | "previous_year"
  | "custom"

export type DateRangeValue = {
  preset: DateRangePreset
  from: string
  to: string
  label: string
}

export const dateRangeOptions: { value: DateRangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "last_3_months", label: "Last 3 Months" },
  { value: "last_6_months", label: "Last 6 Months" },
  { value: "this_year", label: "This Year" },
  { value: "previous_year", label: "Previous Year" },
  { value: "custom", label: "Custom Range" },
]

export function formatYMD(date: Date) {
  return format(date, "yyyy-MM-dd")
}

function parseYMD(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00`)
  return isValid(date) ? date : null
}

function rangeLabel(preset: DateRangePreset, from: string, to: string) {
  const presetLabel = dateRangeOptions.find((o) => o.value === preset)?.label
  if (preset !== "custom" && presetLabel) return presetLabel
  return `${from} to ${to}`
}

export function getDateRange(
  preset: string | undefined,
  customFrom?: string,
  customTo?: string,
  now = new Date(),
): DateRangeValue {
  const selected = dateRangeOptions.some((o) => o.value === preset)
    ? (preset as DateRangePreset)
    : "this_month"

  let from: Date
  let to: Date

  switch (selected) {
    case "today":
      from = now
      to = now
      break
    case "this_week":
      from = startOfWeek(now, { weekStartsOn: 1 })
      to = endOfWeek(now, { weekStartsOn: 1 })
      break
    case "last_month": {
      const lastMonth = subMonths(now, 1)
      from = startOfMonth(lastMonth)
      to = endOfMonth(lastMonth)
      break
    }
    case "last_3_months":
      from = startOfMonth(subMonths(now, 2))
      to = endOfMonth(now)
      break
    case "last_6_months":
      from = startOfMonth(subMonths(now, 5))
      to = endOfMonth(now)
      break
    case "this_year":
      from = new Date(now.getFullYear(), 0, 1)
      to = new Date(now.getFullYear(), 11, 31)
      break
    case "previous_year": {
      const previous = subYears(now, 1)
      from = new Date(previous.getFullYear(), 0, 1)
      to = new Date(previous.getFullYear(), 11, 31)
      break
    }
    case "custom":
      from = parseYMD(customFrom) ?? startOfMonth(now)
      to = parseYMD(customTo) ?? endOfMonth(now)
      break
    case "this_month":
    default:
      from = startOfMonth(now)
      to = endOfMonth(now)
      break
  }

  const normalizedFrom = from > to ? to : from
  const normalizedTo = from > to ? from : to
  const fromYMD = formatYMD(normalizedFrom)
  const toYMD = formatYMD(normalizedTo)

  return {
    preset: selected,
    from: fromYMD,
    to: toYMD,
    label: rangeLabel(selected, fromYMD, toYMD),
  }
}

export function getPreviousComparableRange(range: Pick<DateRangeValue, "from" | "to">) {
  const from = new Date(`${range.from}T00:00:00`)
  const to = new Date(`${range.to}T00:00:00`)
  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1)
  const previousTo = new Date(from)
  previousTo.setDate(previousTo.getDate() - 1)
  const previousFrom = new Date(previousTo)
  previousFrom.setDate(previousFrom.getDate() - days + 1)

  return {
    from: formatYMD(previousFrom),
    to: formatYMD(previousTo),
  }
}

export function monthStartFromYMD(date: string) {
  const d = new Date(`${date}T00:00:00`)
  return formatYMD(startOfMonth(d))
}

export function shiftMonth(monthStart: string, amount: number) {
  return formatYMD(addMonths(new Date(`${monthStart}T00:00:00`), amount))
}
