"use client"

import { useMemo } from "react"
import { format as formatDate } from "date-fns"
import { Download, FileSpreadsheet, FileText, TrendingDown, TrendingUp } from "lucide-react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { DateRangeFilter } from "@/components/filters/date-range-filter"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useChartTheme } from "@/hooks/use-chart-theme"
import { useCurrency } from "@/hooks/use-currency"
import type { getReportsData } from "@/lib/data/reports"

type ReportsData = Awaited<ReturnType<typeof getReportsData>>

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function csvValue(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`
}

export function ReportsContent({ data }: { data: ReportsData }) {
  const { format } = useCurrency()
  const chart = useChartTheme()
  const increased = data.monthlySummary.currentVsLastMonthPercent >= 0
  const TrendIcon = increased ? TrendingUp : TrendingDown

  const exportRows = useMemo(
    () =>
      data.entries.map((entry) => ({
        Date: entry.lunch_date,
        Member: entry.profiles?.full_name ?? entry.profiles?.email ?? "Member",
        Category: entry.expense_categories?.name ?? "Uncategorized",
        Amount: Number(entry.amount),
        Status: entry.payment_status,
        Notes: entry.notes ?? "",
      })),
    [data.entries],
  )

  const exportCsv = () => {
    const headers = Object.keys(exportRows[0] ?? { Date: "", Member: "", Category: "", Amount: "", Status: "", Notes: "" })
    const csv = [headers, ...exportRows.map((row) => headers.map((header) => row[header as keyof typeof row]))]
      .map((row) => row.map((value) => csvValue(value ?? "")).join(","))
      .join("\n")
    downloadFile(`expense-report-${data.range.from}-${data.range.to}.csv`, csv, "text/csv;charset=utf-8")
  }

  const exportExcel = () => {
    const headers = Object.keys(exportRows[0] ?? { Date: "", Member: "", Category: "", Amount: "", Status: "", Notes: "" })
    const table = `<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${exportRows
      .map((row) => `<tr>${headers.map((h) => `<td>${row[h as keyof typeof row] ?? ""}</td>`).join("")}</tr>`)
      .join("")}</tbody></table>`
    downloadFile(`expense-report-${data.range.from}-${data.range.to}.xls`, table, "application/vnd.ms-excel;charset=utf-8")
  }

  const exportPdf = () => {
    const printable = window.open("", "_blank")
    if (!printable) return
    printable.document.write(`
      <html><head><title>Expense Report</title></head>
      <body>
        <h1>Expense Report</h1>
        <p>${data.range.label}</p>
        <p>Total: ${format(data.monthlySummary.total)} | Paid: ${format(data.monthlySummary.paid)} | Pending: ${format(data.monthlySummary.pending)}</p>
        <table border="1" cellspacing="0" cellpadding="6">
          <thead><tr><th>Date</th><th>Member</th><th>Category</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>${exportRows.map((row) => `<tr><td>${row.Date}</td><td>${row.Member}</td><td>${row.Category}</td><td>${row.Amount}</td><td>${row.Status}</td></tr>`).join("")}</tbody>
        </table>
      </body></html>
    `)
    printable.document.close()
    printable.print()
  }

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden space-y-8">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">Historical expense reporting for {data.range.label}</p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <DateRangeFilter range={data.range} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="size-4" />CSV</Button>
        <Button variant="outline" size="sm" onClick={exportExcel}><FileSpreadsheet className="size-4" />Excel</Button>
        <Button variant="outline" size="sm" onClick={exportPdf}><FileText className="size-4" />PDF</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardDescription>Total spending</CardDescription><CardTitle className="text-2xl">{format(data.monthlySummary.total)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Paid</CardDescription><CardTitle className="text-2xl">{format(data.monthlySummary.paid)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Pending</CardDescription><CardTitle className="text-2xl">{format(data.monthlySummary.pending)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Entries</CardDescription><CardTitle className="text-2xl">{data.monthlySummary.count}</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendIcon className={increased ? "size-4 text-amber-600" : "size-4 text-green-600"} />
            Previous month comparison
          </CardTitle>
          <CardDescription>{increased ? "Increased spending" : "Reduced spending"}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div><p className="text-sm text-muted-foreground">Current Month</p><p className="text-2xl font-bold">{format(data.monthlySummary.currentMonthTotal)}</p></div>
          <div><p className="text-sm text-muted-foreground">Last Month</p><p className="text-2xl font-bold">{format(data.monthlySummary.previousMonthTotal)}</p></div>
          <div><p className="text-sm text-muted-foreground">Difference</p><p className="text-2xl font-bold">{data.monthlySummary.currentVsLastMonthPercent >= 0 ? "+" : ""}{Math.round(data.monthlySummary.currentVsLastMonthPercent)}%</p></div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Team spending trends</CardTitle></CardHeader>
          <CardContent className="h-[300px] min-w-0 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthlyTrend.map((m) => ({ ...m, label: formatDate(new Date(m.month), "MMM yyyy") }))}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
                <XAxis dataKey="label" tick={chart.tick} tickLine={false} axisLine={false} />
                <YAxis tick={chart.tick} tickLine={false} axisLine={false} width={48} />
                <Tooltip formatter={(value: number) => format(value)} contentStyle={chart.tooltipStyle} />
                <Bar dataKey="total" fill={chart.accent} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Settlement summary</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div><p className="text-sm text-muted-foreground">Total settlements</p><p className="text-xl font-semibold">{format(data.settlementSummary.total)}</p></div>
            <div><p className="text-sm text-muted-foreground">Completed</p><p className="text-xl font-semibold">{format(data.settlementSummary.completed)}</p></div>
            <div><p className="text-sm text-muted-foreground">Pending</p><p className="text-xl font-semibold">{format(data.settlementSummary.pending)}</p></div>
            <div><p className="text-sm text-muted-foreground">Records</p><p className="text-xl font-semibold">{data.settlementSummary.count}</p></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportTable title="Category comparison" headers={["Category", "Current", "Previous", "Change"]} rows={data.categoryComparison.map((c) => [c.name, format(c.current), format(c.previous), `${c.changePercent >= 0 ? "+" : ""}${Math.round(c.changePercent)}%`])} />
        <ReportTable title="Top spenders by month" headers={["Member", "Total", "Paid", "Pending"]} rows={data.topSpenders.map((m) => [m.name, format(m.total), format(m.paid), format(m.pending)])} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historical budget analysis</CardTitle>
          <CardDescription>Budget vs actual spending and overspending history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge variant="outline">{data.budgetSummary.activeBudgets} active budgets</Badge>
            <Badge variant={data.budgetSummary.overspendingHistory.length ? "destructive" : "outline"}>
              {data.budgetSummary.overspendingHistory.length} overspent months
            </Badge>
          </div>
          <PlainReportTable
            headers={["Month", "Budget", "Actual", "Utilization", "Status"]}
            rows={data.budgetSummary.history.map((month) => [
              formatDate(new Date(month.month), "MMM yyyy"),
              format(month.budget),
              format(month.spent),
              `${month.utilization}%`,
              month.exceeded ? "Over budget" : "On track",
            ])}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function PlainReportTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <div className="min-w-0 overflow-auto rounded-lg border border-border">
      <Table>
        <TableHeader><TableRow>{headers.map((header) => <TableHead key={header}>{header}</TableHead>)}</TableRow></TableHeader>
        <TableBody>
          {rows.length ? rows.map((row, index) => (
            <TableRow key={index}>{row.map((cell, cellIndex) => <TableCell key={cellIndex}>{cell}</TableCell>)}</TableRow>
          )) : (
            <TableRow><TableCell colSpan={headers.length} className="text-muted-foreground">No data for this range.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function ReportTable({ title, headers, rows }: { title: string; headers: string[]; rows: (string | number)[][] }) {
  return (
    <Card>
      {title && <CardHeader><CardTitle>{title}</CardTitle></CardHeader>}
      <CardContent className="min-w-0 overflow-auto">
        <Table>
          <TableHeader><TableRow>{headers.map((header) => <TableHead key={header}>{header}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {rows.length ? rows.map((row, index) => (
              <TableRow key={index}>{row.map((cell, cellIndex) => <TableCell key={cellIndex}>{cell}</TableCell>)}</TableRow>
            )) : (
              <TableRow><TableCell colSpan={headers.length} className="text-muted-foreground">No data for this range.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
