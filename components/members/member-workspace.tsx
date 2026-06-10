"use client"

import Link from "next/link"
import { format as formatDate } from "date-fns"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { BookOpen, Download, FileSpreadsheet, FileText, Scale, TrendingUp, Wallet } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useChartTheme } from "@/hooks/use-chart-theme"
import { useCurrency } from "@/hooks/use-currency"
import type { getMemberWorkspaceData } from "@/lib/data/members"

type MemberWorkspaceData = Awaited<ReturnType<typeof getMemberWorkspaceData>>

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

export function MemberWorkspace({ data, ledgerOnly = false }: { data: MemberWorkspaceData; ledgerOnly?: boolean }) {
  const { format } = useCurrency()
  const chart = useChartTheme()
  const name = data.member.profiles?.full_name ?? data.member.profiles?.email ?? "Member"
  const expenseRows = data.entries.map((entry) => ({
    Date: entry.lunch_date,
    Payer: entry.profiles?.full_name ?? entry.profiles?.email ?? "Member",
    Assigned: entry.assignment_type === "individual" ? entry.assigned_profile?.full_name ?? entry.assigned_profile?.email ?? "Member" : "Team",
    Category: entry.expense_categories?.name ?? "Uncategorized",
    Amount: format(Number(entry.amount)),
    Status: entry.payment_status,
    Approval: entry.approval_status.replace(/_/g, " "),
    Notes: entry.notes ?? "",
  }))
  const ledgerRows = [
    { Type: "Credits paid by member", Amount: format(data.ledger.credits) },
    { Type: "Assigned debits and owed balances", Amount: format(data.ledger.debits) },
    { Type: "Shared balance owed", Amount: format(data.ledger.youOwe) },
    { Type: "Shared balance receivable", Amount: format(data.ledger.youReceive) },
    { Type: "Net balance", Amount: format(data.ledger.netBalance) },
  ]

  const exportRows = (rows: Record<string, string | number>[], filename: string) => {
    const headers = Object.keys(rows[0] ?? { Type: "", Amount: "" })
    const csv = [headers, ...rows.map((row) => headers.map((header) => row[header]))]
      .map((row) => row.map((value) => csvValue(value ?? "")).join(","))
      .join("\n")
    downloadFile(filename, csv, "text/csv;charset=utf-8")
  }

  const exportPdf = () => {
    const printable = window.open("", "_blank")
    if (!printable) return
    printable.document.write(`
      <html><head><title>${name} Ledger</title></head><body>
        <h1>${name} Ledger</h1>
        <p>Credits: ${format(data.ledger.credits)} | Debits: ${format(data.ledger.debits)} | Net: ${format(data.ledger.netBalance)}</p>
        <table border="1" cellspacing="0" cellpadding="6">
          <thead><tr><th>Type</th><th>Amount</th></tr></thead>
          <tbody>${ledgerRows.map((row) => `<tr><td>${row.Type}</td><td>${row.Amount}</td></tr>`).join("")}</tbody>
        </table>
      </body></html>
    `)
    printable.document.close()
    printable.print()
  }

  return (
    <div className="min-w-0 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight">{ledgerOnly ? `${name} ledger` : name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {ledgerOnly ? "Credits, debits, settlements, and current balance." : "Personal expense workspace for this team."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!ledgerOnly && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/members/${data.member.user_id}/ledger`}>
                <Scale className="size-4" />
                Ledger
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => exportRows(expenseRows, `member-expenses-${data.member.user_id}.csv`)}>
            <Download className="size-4" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportRows(expenseRows, `member-report-${data.member.user_id}.xls`)}>
            <FileSpreadsheet className="size-4" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportPdf}>
            <FileText className="size-4" />
            PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Metric title="Total expenses" value={format(data.analytics.totalExpenses)} icon={Wallet} />
        <Metric title="Monthly spending" value={format(data.analytics.monthlySpending)} icon={TrendingUp} />
        <Metric title="Assigned expenses" value={format(data.ledger.debits)} icon={BookOpen} />
        <Metric title="Settlements" value={String(data.settlements.length)} icon={Scale} />
        <Metric title="Pending approvals" value={String(data.analytics.pendingApprovals)} icon={FileText} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Member ledger</CardTitle>
          <CardDescription>Credits are paid by the member; debits are assigned or owed.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-5">
          <Metric title="Credits" value={format(data.ledger.credits)} icon={Wallet} compact />
          <Metric title="Debits" value={format(data.ledger.debits)} icon={BookOpen} compact />
          <Metric title="Owes" value={format(data.ledger.youOwe)} icon={Scale} compact />
          <Metric title="Receives" value={format(data.ledger.youReceive)} icon={Scale} compact />
          <Metric title="Net balance" value={format(data.ledger.netBalance)} icon={TrendingUp} compact />
        </CardContent>
      </Card>

      {!ledgerOnly && (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Spending trend</CardTitle>
                <CardDescription>Average monthly spend {format(data.analytics.averageMonthlySpend)}</CardDescription>
              </CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.analytics.monthlyTrend.map((row) => ({ ...row, label: formatDate(new Date(row.month), "MMM yyyy") }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
                    <XAxis dataKey="label" tick={chart.tick} tickLine={false} axisLine={false} />
                    <YAxis tick={chart.tick} tickLine={false} axisLine={false} width={48} />
                    <Tooltip formatter={(value: number) => format(value)} contentStyle={chart.tooltipStyle} />
                    <Bar dataKey="total" fill={chart.accent} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <ReportTable
              title="Category breakdown"
              headers={["Category", "Total", "Count"]}
              rows={data.analytics.categoryBreakdown.map((row) => [row.name, format(row.total), row.count])}
            />
          </div>

          <ReportTable
            title="Budgets impacted"
            headers={["Budget", "Type", "Amount"]}
            rows={data.impactedBudgets.map((budget) => [budget.category_id ?? "Team monthly", budget.type, format(Number(budget.amount))])}
          />

          <ReportTable
            title="Member timeline"
            headers={["When", "Action", "Message"]}
            rows={data.activity.map((item) => [
              formatDate(new Date(item.created_at), "dd MMM yyyy"),
              item.action_type.replace(/_/g, " "),
              item.message ?? item.description ?? "",
            ])}
          />

          <ReportTable
            title="Assigned and personal expenses"
            headers={["Date", "Payer", "Assigned", "Category", "Amount", "Approval"]}
            rows={expenseRows.map((row) => [row.Date, row.Payer, row.Assigned, row.Category, row.Amount, row.Approval])}
          />

          <ReportTable
            title="Settlements"
            headers={["Date", "Amount", "Status", "Note"]}
            rows={data.settlements.map((row) => [
              formatDate(new Date(row.created_at), "dd MMM yyyy"),
              format(Number(row.amount)),
              row.status,
              row.note ?? "",
            ])}
          />
        </>
      )}
    </div>
  )
}

function Metric({ title, value, icon: Icon, compact = false }: { title: string; value: string; icon: typeof Wallet; compact?: boolean }) {
  return (
    <Card className={compact ? "border-0 shadow-none" : undefined}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription>{title}</CardDescription>
        <Icon className="size-4 shrink-0 text-accent" />
      </CardHeader>
      <CardContent>
        <div className="break-words text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}

function ReportTable({ title, headers, rows }: { title: string; headers: string[]; rows: (string | number)[][] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>{headers.map((header) => <TableHead key={header}>{header}</TableHead>)}</TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? rows.map((row, index) => (
              <TableRow key={index}>{row.map((cell, cellIndex) => <TableCell key={cellIndex}>{cell}</TableCell>)}</TableRow>
            )) : (
              <TableRow><TableCell colSpan={headers.length} className="text-muted-foreground">No data yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
