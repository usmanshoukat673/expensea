# Expensea Database

## Migration Order

Apply migrations in `supabase/migrations/` in filename order. The current required range is:

```text
001_initial_schema.sql
...
012_expense_approvals_reimbursements.sql
```

Migration `012_expense_approvals_reimbursements.sql` introduces the approval and reimbursement workflow and updates summary behavior so only approved financial rows are aggregated.

## Expense Workflow Columns

Expenses are stored in `lunch_entries`.

| Column | Purpose |
| --- | --- |
| `approval_status` | `draft`, `pending_approval`, `approved`, `rejected`, or `reimbursed`. |
| `submitted_by` | User who submitted the expense. |
| `approved_by` | Admin/owner who approved, rejected, or requested changes. |
| `approved_at` | Review timestamp. |
| `rejection_reason` | Required reason for reject/request-changes. |
| `reimbursement_status` | `not_reimbursed`, `partially_reimbursed`, or `fully_reimbursed`. |
| `amount_reimbursed` | Cumulative reimbursed amount. |
| `reimbursed_at` | Latest reimbursement date. |
| `reimbursement_notes` | Latest reimbursement note. |

## Financial Impact Rule

Only rows with:

```sql
approval_status IN ('approved', 'reimbursed')
```

are counted by budgets, analytics, reports, settlements, monthly summaries, and public financial totals. Draft, pending, and rejected rows remain available for audit and workflow queues.

## Permissions

- Members can view team expenses.
- Any active member can insert draft or pending expenses they created.
- Viewers can update their own draft/rejected expenses and submit them.
- Admins and owners can approve, reject, request changes, update, delete, and reimburse.
- Owners retain full team control through existing team policies.

## Migration 012 Notes

`012_expense_approvals_reimbursements.sql`:

- Creates `approval_status` and `reimbursement_status` enums.
- Adds workflow and reimbursement columns to `lunch_entries`.
- Adds indexes for approval queue and reimbursement filtering.
- Replaces `refresh_monthly_summary` so summaries aggregate approved/reimbursed rows only.
- Updates `lunch_entries_summary_trigger` so approval changes recompute summaries.
- Replaces insert/update RLS policies for expense submission and approval.
- Updates recurring expense generation so generated expenses enter `pending_approval`.

## Demo Data

The TypeScript seeders create pending, approved, rejected, partially reimbursed, and fully reimbursed expenses. Notification and activity seeders include submitted, approved, rejected, and reimbursed workflow events.
