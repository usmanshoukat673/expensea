"use client"

import { useMemo, useState, useTransition } from "react"
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
import { Pencil, Trash2, Download, BookOpen } from "lucide-react"
import {
  bulkDeleteLunchEntries,
  deleteLunchEntry,
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export function EntriesTable({
  entries: initialEntries,
  categories = [],
  canEdit,
  onOpenChange,
  onAddEntry,
  onEditEntry,
}: {
  entries: LunchEntryWithProfile[]
  categories?: ExpenseCategory[]
  canEdit: boolean
  onOpenChange: (open: boolean) => void
  onAddEntry?: () => void
  onEditEntry?: (entry: LunchEntryWithProfile) => void
}) {
  const { format: formatCurrency } = useCurrency()
  const [entries, setEntries] = useState(initialEntries)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 300)
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState<string[]>([])
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [pending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const matchStatus =
        statusFilter === "all" || e.payment_status === statusFilter
      const matchCategory =
        !categoryFilter.length ||
        (e.category_id && categoryFilter.includes(e.category_id))
      const q = debouncedSearch.toLowerCase()
      const matchSearch =
        !q ||
        (e.notes?.toLowerCase().includes(q) ?? false) ||
        (e.profiles?.full_name?.toLowerCase().includes(q) ?? false) ||
        (e.expense_categories?.name?.toLowerCase().includes(q) ?? false)
      return matchStatus && matchSearch && matchCategory
    })
  }, [entries, debouncedSearch, statusFilter, categoryFilter])

  const columns = useMemo<ColumnDef<LunchEntryWithProfile>[]>(
    () => [
      ...(canEdit
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
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
              <Icon className="w-3.5 h-3.5" style={{ color: cat.color }} />
              {cat.name}
            </span>
          )
        },
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
        header: "Status",
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
      ...(canEdit
        ? [
            {
              id: "actions",
              header: "",
              cell: ({ row }) => (
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      onEditEntry?.(row.original)
                      onOpenChange(true)
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="w-4 h-4 text-destructive" />
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
        : []),
    ],
    [canEdit, onOpenChange, onEditEntry, startTransition, formatCurrency],
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
    const headers = ["Member", "Amount", "Date", "Notes", "Status"]
    const rows = filtered.map((e) => [
      e.profiles?.full_name ?? "",
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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-2 max-w-2xl">
          <Input
            placeholder="Search notes or member..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-background"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
            </SelectContent>
          </Select>
          {categories.length > 0 && (
            <Select
              value={categoryFilter[0] ?? "all"}
              onValueChange={(v) =>
                setCategoryFilter(v === "all" ? [] : [v])
              }
            >
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && selectedIds.length > 0 && (
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
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
        </div>
      </div>

      <div className="relative rounded-lg border border-border overflow-auto max-h-[calc(100vh-280px)] bg-card">
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
                        {search || statusFilter !== "all"
                          ? "Try adjusting your search or filters."
                          : "Record your first team expense to get started."}
                      </EmptyDescription>
                    </EmptyHeader>
                    {canEdit &&
                      onAddEntry &&
                      !search &&
                      statusFilter === "all" && (
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
