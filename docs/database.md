# Expensea Database

## Migration Order

Apply migrations in `supabase/migrations/` in filename order. The current required range is:

```text
001_initial_schema.sql
...
014_dashboard_customization_saved_views.sql
015_member_ledger_assignment.sql
016_notification_activity_audit_hardening.sql
```

Migration `012_expense_approvals_reimbursements.sql` introduces the approval and reimbursement workflow and updates summary behavior so only approved financial rows are aggregated.
Migration `013_notifications_activity_center.sql` completes the notifications and activity center schema with deep links, archive/read state, search indexes, compatibility triggers, and normalized activity descriptions.
Migration `014_dashboard_customization_saved_views.sql` adds team-aware dashboard preferences, saved dashboard views, and dashboard favorites.
Migration `015_member_ledger_assignment.sql` adds member expense assignment, member-ledger indexes, assignment-aware monthly summaries, and viewer-scoped expense read policy behavior.
Migration `016_notification_activity_audit_hardening.sql` hardens realtime delivery for notifications and activity logs by setting `REPLICA IDENTITY FULL` and ensuring both tables are part of `supabase_realtime`.

## Expense Workflow Columns

Expenses are stored in `lunch_entries`.

| Column | Purpose |
| --- | --- |
| `approval_status` | `draft`, `pending_approval`, `approved`, `rejected`, or `reimbursed`. |
| `assignment_type` | `team` for team-level expenses or `individual` for member-assigned expenses. |
| `assigned_user_id` | Member assigned to an individual expense; null for team expenses. |
| `assigned_by` | User who assigned the expense. |
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
- Viewers can view their own paid, assigned, created, or submitted expense rows; admins and owners can view team expense rows.
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

The TypeScript seeders create team and individual assigned expenses, pending, approved, rejected, partially reimbursed, and fully reimbursed expenses. Settlement and activity seeders include member settlements, member timeline events such as `expense_created`, `expense_updated`, `expense_deleted`, `expense_assigned`, submitted, approved, rejected, reimbursed, budget, settlement, invite, and recurring workflow events. Notification seeders include owner/admin operational alerts and personal assignee/submitter alerts. Dashboard seeders create role-aware layouts, saved views, default views, saved filters, widget visibility preferences, and favorites for reports, categories, teams, and dashboards.

Seeded shared expenses include equal splits across all active team members and custom `selected` splits with explicit `lunch_entry_participants.share_amount` values. Seeded individual expenses are kept non-shared so they do not affect settlement balances.

## Member Ledger Data Model

`lunch_entries.assignment_type` controls whether an expense belongs to the team generally or to one member specifically.

```sql
assignment_type = 'team'       -- assigned_user_id must be null
assignment_type = 'individual' -- assigned_user_id is required
```

The `lunch_entries_assignment_consistency` constraint enforces that shape. Indexes on `(team_id, assigned_user_id, lunch_date DESC)` and `(team_id, assignment_type, lunch_date DESC)` support `/my-expenses`, member profile pages, member reports, and assignment filters.

Monthly summaries now aggregate approved/reimbursed rows where the member is either the payer (`user_id`) or assignee (`assigned_user_id`). Member reports and dashboards use the assignee for individual expenses and the payer for team expenses.

Shared team expense participants live in `lunch_entry_participants`. Equal split rows store equal `share_amount` values for the selected active members. Custom split rows store explicit per-member `share_amount` values and the server action validates that the selected rows add up to the expense amount. Individual expenses must not create participant rows.

## Notifications

`notifications` is the user inbox table.

| Column | Purpose |
| --- | --- |
| `id` | Notification id. |
| `team_id` | Team scope for isolation and active-team filtering. |
| `user_id` | Recipient profile/auth user id. |
| `type` | Event/category type such as `info`, `warning`, `success`, or compatibility event names. |
| `title` | Short inbox title. |
| `message` | Main notification copy. |
| `body` | Compatibility copy synchronized with `message`. |
| `link` | Deep link to the relevant app page. |
| `metadata` | Event details such as entity id, amount, category, role, or audience. |
| `is_read` | Current unread/read flag used by the inbox and bell. |
| `read` / `read_at` | Compatibility read state synchronized with `is_read`. |
| `archived_at` | Soft archive timestamp for inbox archive filtering. |
| `created_at` | Delivery time. |

Indexes cover user/team/read queries, archive filtering, and text search over title/message/body.

`notifications` is included in `supabase_realtime` and uses `REPLICA IDENTITY FULL` so inbox and bell subscriptions receive enough row data for insert, update, and delete handling.

## Activity Logs

`activity_logs` is the normalized team timeline.

| Column | Purpose |
| --- | --- |
| `id` | Activity id. |
| `team_id` | Team scope. |
| `user_id` | Actor, nullable for system events. |
| `action_type` | Verb-like event name such as `expense_approved`. |
| `entity_type` | Filter group: `expense`, `budget`, `team`, `settlement`, `approval`, `recurring_expense`, or related system type. |
| `entity_id` | Related row id when available. |
| `description` | Human-readable timeline text. |
| `message` | Compatibility copy synchronized with `description`. |
| `metadata` | Structured context for future rendering or links. |
| `created_at` | Event time. |

`team_activity_log` remains for compatibility. New legacy inserts are mirrored into `activity_logs`, while new feature code writes normalized activity directly through `recordActivity`.

`activity_logs` is included in `supabase_realtime` and uses `REPLICA IDENTITY FULL` so the activity center can stream new rows and diagnose update/delete payloads if future UI surfaces need them.

## Dashboard Customization

`user_dashboard_preferences` stores the active dashboard personalization for one user/team pair.

| Column | Purpose |
| --- | --- |
| `id` | Preference row id. |
| `user_id` | Profile/auth user id. |
| `team_id` | Team scope. |
| `layout_json` | JSON object, currently `{ "widgets": [...] }`, storing widget order. |
| `hidden_widgets` | JSON array of hidden widget ids. |
| `pinned_widgets` | JSON array of pinned widget/favorite keys. |
| `default_view_id` | Optional saved view loaded by default for this user/team. |
| `created_at` / `updated_at` | Audit timestamps. |

`dashboard_saved_views` stores named dashboard snapshots.

| Column | Purpose |
| --- | --- |
| `name` | User-visible saved view name. |
| `layout_json` | Widget order snapshot. |
| `hidden_widgets` | Hidden widget snapshot. |
| `pinned_widgets` | Pinned widget/favorite snapshot. |
| `filters_json` | Saved date range, category, budget, status, and team filters. |
| `is_default` | Marks the user's default view for that team. |

`dashboard_favorites` stores quick-action pins for `report`, `category`, `team`, and `dashboard` favorites. All three dashboard tables use RLS policies that require `auth.uid() = user_id` and active membership in `team_id`.
