"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table"
import { format as formatDate, parseISO } from "date-fns"
import { toast } from "sonner"
import { Pencil, Trash2, Download, BookOpen, Send } from "lucide-react"
import {
  bulkDeleteLunchEntries,
  deleteLunchEntry,
  submitExpenseForApproval,
} from "@/lib/actions/lunch-entries"
import { useCurrency } from "@/hooks/use-currency"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import type { ExpenseCategory, LunchEntryWithProfile } from "@/lib/database.types"
import { getCategoryIcon } from "@/lib/categories/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { LoadingOverlay } from "@/components/loaders/loading-overlay"
import { FilterField, FilterSheet } from "@/components/filters/filter-sheet"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export function EntriesTable({
  entries: initialEntries,
  members = [],
  categories = [],
  canManageEntries,
  currentUserId,
  onOpenChange,
  onAddEntry,
  onEditEntry,
}: {
  entries: LunchEntryWithProfile[]
  members?: { user_id: string; name: string }[]
  categories?: ExpenseCategory[]
  canManageEntries: boolean
  currentUserId: string
  onOpenChange: (open: boolean) => void
  onAddEntry?: () => void
  onEditEntry?: (entry: LunchEntryWithProfile) => void
}) {
  const { format: formatCurrency } = useCurrency()
  const router = useRouter()
  const [entries, setEntries] = useState(initialEntries)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 300)
  const [statusFilter, setStatusFilter] = useState("all")
  const [approvalFilter, setApprovalFilter] = useState("all")
  const [assignmentFilter, setAssignmentFilter] = useState("all")
  const [memberFilter, setMemberFilter] = useState("all")
  const [minAmount, setMinAmount] = useState("")
  const [maxAmount, setMaxAmount] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string[]>([])
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    setEntries(initialEntries)
    setRowSelection({})
  }, [initialEntries])

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const matchStatus =
        statusFilter === "all" || e.payment_status === statusFilter
      const matchApproval =
        approvalFilter === "all" || e.approval_status === approvalFilter
      const matchCategory =
        !categoryFilter.length ||
        (e.category_id && categoryFilter.includes(e.category_id))
      const matchMember =
        memberFilter === "all" || e.created_by === memberFilter
      const amount = Number(e.amount)
      const min = minAmount ? Number(minAmount) : null
      const max = maxAmount ? Number(maxAmount) : null
      const matchAmount =
        (min === null || amount >= min) && (max === null || amount <= max)
      const matchAssignment =
        assignmentFilter === "all" ||
        e.assignment_type === assignmentFilter ||
        e.assigned_user_id === assignmentFilter
      const q = debouncedSearch.toLowerCase()
      const matchSearch =
        !q ||
        (e.notes?.toLowerCase().includes(q) ?? false) ||
        (e.profiles?.full_name?.toLowerCase().includes(q) ?? false) ||
        (e.assigned_profile?.full_name?.toLowerCase().includes(q) ?? false) ||
        (e.expense_categories?.name?.toLowerCase().includes(q) ?? false)
      return matchStatus && matchApproval && matchSearch && matchCategory && matchMember && matchAmount && matchAssignment
    })
  }, [entries, debouncedSearch, statusFilter, approvalFilter, categoryFilter, memberFilter, minAmount, maxAmount, assignmentFilter])

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) +
    (approvalFilter !== "all" ? 1 : 0) +
    (assignmentFilter !== "all" ? 1 : 0) +
    (memberFilter !== "all" ? 1 : 0) +
    (categoryFilter.length ? 1 : 0) +
    (minAmount || maxAmount ? 1 : 0)

  const resetFilters = () => {
    setStatusFilter("all")
    setApprovalFilter("all")
    setAssignmentFilter("all")
    setMemberFilter("all")
    setCategoryFilter([])
    setMinAmount("")
    setMaxAmount("")
  }

  const columns = useMemo<ColumnDef<LunchEntryWithProfile>[]>(
    () => [
      ...(canManageEntries
        ? [
            {
              id: "select",
              header: ({ table }) => (
                <Checkbox
                  checked={table.getIsAllPageRowsSelected()}
                  onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
                />
              ),
              cell: ({ row }) => (
                <Checkbox
                  checked={row.getIsSelected()}
                  onCheckedChange={(v) => row.toggleSelected(!!v)}
                />
              ),
            } as ColumnDef<LunchEntryWithProfile>,
          ]
        : []),
      {
        accessorKey: "profiles.full_name",
        header: "Member",
        cell: ({ row }) => row.original.profiles?.full_name ?? "—",
      },
      {
        id: "category",
        header: "Category",
        cell: ({ row }) => {
          const cat = row.original.expense_categories
          if (!cat) return "—"
          const Icon = getCategoryIcon(cat.icon)
          return (
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: cat.color }} />
              <Icon className="size-3.5 shrink-0" style={{ color: cat.color }} />
              <span className="truncate">{cat.name}</span>
            </span>
          )
        },
      },
      {
        id: "assignment",
        header: "Assigned to",
        cell: ({ row }) => row.original.assignment_type === "individual"
          ? row.original.assigned_profile?.full_name ?? row.original.assigned_profile?.email ?? "Member"
          : "Team",
      },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => formatCurrency(Number(row.original.amount)),
      },
      {
        accessorKey: "lunch_date",
        header: "Date",
        cell: ({ row }) =>
          formatDate(parseISO(row.original.lunch_date), "dd MMM yyyy"),
      },
      {
        accessorKey: "notes",
        header: "Notes",
        cell: ({ row }) => row.original.notes || "—",
      },
      {
        accessorKey: "payment_status",
        header: "Payment",
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.payment_status === "paid" ? "default" : "secondary"
            }
          >
            {row.original.payment_status}
          </Badge>
        ),
      },
      {
        accessorKey: "approval_status",
        header: "Approval",
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.approval_status === "approved" || row.original.approval_status === "reimbursed"
                ? "default"
                : row.original.approval_status === "rejected"
                  ? "destructive"
                  : "secondary"
            }
          >
            {row.original.approval_status.replace(/_/g, " ")}
          </Badge>
        ),
      },
      ...(canManageEntries
        ? [
            {
              id: "actions",
              header: "",
              cell: ({ row }) => (
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      onEditEntry?.(row.original)
                      onOpenChange(true)
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete entry?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            startTransition(async () => {
                              const r = await deleteLunchEntry(row.original.id)
                              if (r?.error) toast.error(r.error)
                              else {
                                setEntries((prev) =>
                                  prev.filter((e) => e.id !== row.original.id),
                                )
                                toast.success("Deleted")
                              }
                            })
                          }}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ),
            } as ColumnDef<LunchEntryWithProfile>,
          ]
        : [
            {
              id: "submit",
              header: "",
              cell: ({ row }) => {
                const canSubmit =
                  row.original.created_by === currentUserId &&
                  ["draft", "rejected"].includes(row.original.approval_status)
                if (!canSubmit) return null
                return (
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        const r = await submitExpenseForApproval(row.original.id)
                        if (r?.error) toast.error(r.error)
                        else {
                          setEntries((prev) =>
                            prev.map((entry) =>
                              entry.id === row.original.id
                                ? { ...entry, approval_status: "pending_approval" }
                                : entry,
                            ),
                          )
                          router.refresh()
                          toast.success("Submitted for approval")
                        }
                      })
                    }}
                  >
                    <Send className="size-4" />
                  </Button>
                )
              },
            } as ColumnDef<LunchEntryWithProfile>,
          ]),
    ],
    [canManageEntries, currentUserId, onOpenChange, onEditEntry, pending, startTransition, formatCurrency, router],
  )

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: setRowSelection,
    state: { rowSelection },
    getRowId: (row) => row.id,
  })

  const selectedIds = table
    .getFilteredSelectedRowModel()
    .rows.map((r) => r.original.id)

  const exportCsv = () => {
    const headers = ["Member", "Assigned To", "Amount", "Date", "Notes", "Status"]
    const rows = filtered.map((e) => [
      e.profiles?.full_name ?? "",
      e.assignment_type === "individual" ? e.assigned_profile?.full_name ?? e.assigned_profile?.email ?? "" : "Team",
      formatCurrency(Number(e.amount)),
      e.lunch_date,
      e.notes ?? "",
      e.payment_status,
    ])
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${c}"`).join(","))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `expense-entries-${formatDate(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
  }

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div className="flex min-w-0 max-w-2xl flex-1 flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Search notes or member..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-background"
          />
          <FilterSheet
            activeCount={activeFilterCount}
            title="Expense filters"
            description="Narrow expenses by member, category, amount, split type, and status."
            onReset={resetFilters}
          >
            <FilterField label="Payment status">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label="Approval status">
              <Select value={approvalFilter} onValueChange={setApprovalFilter}>
                <SelectTrigger><SelectValue placeholder="Approval" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All approvals</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending_approval">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="reimbursed">Reimbursed</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label="Member">
              <Select value={memberFilter} onValueChange={setMemberFilter}>
                <SelectTrigger><SelectValue placeholder="Member" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All members</SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label="Split type">
              <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
                <SelectTrigger><SelectValue placeholder="Split type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All split types</SelectItem>
                  <SelectItem value="team">Team expenses</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>
            {categories.length > 0 && (
              <FilterField label="Category">
                <Select
                  value={categoryFilter[0] ?? "all"}
                  onValueChange={(v) => setCategoryFilter(v === "all" ? [] : [v])}
                >
                  <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
            )}
            <FilterField label="Amount range">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  inputMode="decimal"
                  placeholder="Min"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                />
                <Input
                  inputMode="decimal"
                  placeholder="Max"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                />
              </div>
            </FilterField>
          </FilterSheet>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManageEntries && selectedIds.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await bulkDeleteLunchEntries(selectedIds)
                  if (r?.error) toast.error(r.error)
                  else {
                    setEntries((prev) =>
                      prev.filter((e) => !selectedIds.includes(e.id)),
                    )
                    setRowSelection({})
                    toast.success("Deleted selected")
                  }
                })
              }
            >
              Delete ({selectedIds.length})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="size-4" /> Export
          </Button>
        </div>
      </div>

      <div className="relative max-h-[calc(100dvh-280px)] min-h-[220px] min-w-0 overflow-auto rounded-lg border border-border bg-card">
        <LoadingOverlay show={pending} />
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((h) => (
                  <TableHead key={h.id} className="bg-card">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/40">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-40 p-0">
                  <Empty className="border-0 py-10">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <BookOpen />
                      </EmptyMedia>
                      <EmptyTitle>No entries found</EmptyTitle>
                      <EmptyDescription>
                        {search || activeFilterCount > 0
                          ? "Try adjusting your search or filters."
                          : "Record your first team expense to get started."}
                      </EmptyDescription>
                    </EmptyHeader>
                    {canManageEntries &&
                      onAddEntry &&
                      !search &&
                      activeFilterCount === 0 && (
                        <Button size="sm" className="mt-2" onClick={onAddEntry}>
                          Add entry
                        </Button>
                      )}
                  </Empty>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
