# Expensea Architecture

## System Shape

Expensea is a Next.js App Router application backed by Supabase Auth, Postgres, Row Level Security, and Realtime.

```text
Browser
  |
  | React UI, server actions, route handlers
  v
Next.js App Router
  |
  | @supabase/ssr user client
  | @supabase/supabase-js service-role admin client for cron/seed only
  v
Supabase Auth + Postgres + RLS + Realtime
```

Most writes go through server actions in `lib/actions/*`. Read-heavy pages use server components and `lib/data/*` helpers. The service-role client is limited to demo seeders, reset scripts, and recurring-expense cron processing.

## Multi-Team Architecture

Users can belong to many teams through `team_members`. The `profiles.team_id` field stores the user's active team, not their only team. App pages resolve the current session, load the active team, and scope reads/writes to that team.

```text
auth.users
  | 1:1
profiles -- active team --> teams
  |
  | many-to-many
team_members
  |
teams
  |-- lunch_entries
  |   |-- approval + reimbursement workflow
  |-- expense_categories
  |-- team_budgets
  |-- settlements
  |-- user_dashboard_preferences / dashboard_saved_views / dashboard_favorites
  |-- team_invites / team_invitations
  |-- recurring_expenses
  |-- notifications
  |-- activity_logs
```

## Team Isolation Strategy

Every business table carries `team_id`. RLS policies check membership with database helper functions:

- `is_team_member(team_id, auth.uid())`
- `can_edit_team(team_id, auth.uid())`
- `can_set_active_team(auth.uid(), team_id)`

Public sharing is opt-in through `teams.is_public`. Public policies allow selected reads for public teams, with additional fields controlled by `show_balances_on_public` and `show_category_analytics_on_public`.

## Role System

Roles live on `team_members.role`:

- `owner`: team owner, can update/delete the team and transfer ownership.
- `admin`: editor role, can manage expenses, categories, budgets, settlements, invites, and members.
- `viewer`: can read team data, create draft expenses, and submit their own expenses for approval.

The role checks are enforced in both server actions and RLS. Server actions provide friendly validation and redirects; RLS remains the final database boundary.

## Expense Approval Workflow

Expenses remain in `lunch_entries` for compatibility, but now carry workflow fields:

- `approval_status`: `draft`, `pending_approval`, `approved`, `rejected`, or `reimbursed`.
- `submitted_by`: user who submitted the expense for review.
- `approved_by` / `approved_at`: reviewer and review timestamp for approved or rejected records.
- `rejection_reason`: required reason when rejecting or requesting changes.

Workflow:

1. Viewers, admins, and owners create drafts.
2. The submitter sends a draft or rejected expense to `pending_approval`.
3. Admins and owners approve, reject, or request changes from `/approvals`.
4. Approved expenses can be reimbursed partially or fully.

Only `approved` and `reimbursed` expenses are treated as financial facts. Budgets, analytics, reports, public totals, monthly summaries, and settlement balances all filter to those statuses. Pending and rejected rows remain auditable but do not affect spend or debt calculations.

## Reimbursement Workflow

Reimbursements are tracked on the expense row with:

- `reimbursement_status`: `not_reimbursed`, `partially_reimbursed`, or `fully_reimbursed`.
- `amount_reimbursed`: cumulative reimbursed amount.
- `reimbursed_at`: latest reimbursement date.
- `reimbursement_notes`: latest reimbursement note.

When an approved expense becomes fully reimbursed, `approval_status` moves to `reimbursed`. Reimbursed expenses still count in financial reporting because the expense was approved and incurred; reimbursement metrics separately show outstanding and completed reimbursement activity.

## Active Team Context

`profiles.team_id` stores the active team. Switching teams calls `switchTeam`, which validates membership and updates the profile. Providers/hooks expose that context to navigation, dashboards, forms, and realtime subscriptions.

```text
sign in -> load profile -> profile.team_id -> team-scoped page data
team switcher -> switchTeam(teamId) -> profiles.team_id update -> revalidate
```

## Budget Engine

Budgets are stored in `team_budgets` as:

- `monthly`: one team-wide cap for a month slot.
- `category`: a cap for one expense category.

The budget engine in `lib/budget/engine.ts` builds a spend index from expenses, maps budgets to the selected month, and returns:

- spent
- remaining
- utilization percentage
- status: `safe`, `warning`, or `over`
- alert level: `none`, `warning80`, or `exceeded`

Budget views, dashboard cards, reports, analytics, and demo seeders all rely on this engine's assumptions. All budget data helpers pass only approved or reimbursed expenses into the engine.

## Dashboard Customization Architecture

Dashboard personalization is scoped by both `user_id` and `team_id`, so a user can keep separate dashboard layouts for each team. `app/(protected)/page.tsx` loads dashboard metrics and `getDashboardCustomization()` in parallel before rendering the client dashboard, which prevents layout flashing on first paint.

Persistence uses three tables:

- `user_dashboard_preferences`: current widget order, hidden widgets, pinned widgets, and default view id for one user/team pair.
- `dashboard_saved_views`: named snapshots containing layout, hidden widgets, pinned widgets, and saved filters for date range, category, budget, status, and team.
- `dashboard_favorites`: pinned reports, categories, teams, and dashboards shown in the quick actions widget.

The client component keeps a small local copy of widget order/visibility for immediate interaction, then calls `lib/actions/dashboard-customization.ts` actions to upsert changes. Drag/drop handles, explicit move buttons, and visibility switches all write through the same team-scoped server action. Saved views can be created, renamed, duplicated, deleted, set as default, imported, or exported without a page reload.

Role-aware defaults are generated in `lib/dashboard-customization.ts`: owners prioritize budgets, analytics, and approvals; admins prioritize approvals, activity, and expenses; viewers prioritize personal expenses and activity. Saved default views override those defaults only for the matching user/team.

## Settlement Engine

Shared expenses are recorded in approved/reimbursed `lunch_entries` with participant rows in `lunch_entry_participants`. The balance engine in `lib/balance/engine.ts`:

1. Calculates participant shares for equal or selected splits.
2. Creates raw debts from participants to payers.
3. Applies completed settlements.
4. Simplifies pairwise debts into minimal payment edges.

Pending settlements are visible records. Completed settlements reduce outstanding debt. Cancelled settlements are ignored by debt calculations.

## Recurring Expense Engine

Recurring rules live in `recurring_expenses`. The database function `process_due_recurring_expenses` selects active due rules, creates idempotent linked `lunch_entries`, advances `next_run_date`, deactivates completed rules, writes activity, and notifies members.

The Next.js route `/api/cron/recurring-expenses` invokes that function with the service-role client. If `CRON_SECRET` is set, callers must send `Authorization: Bearer <CRON_SECRET>`.

## Notification Architecture

Notifications are stored in `notifications` and scoped by `team_id` plus `user_id`. Producers use `notifyTeamMembers` from `lib/activity.ts` or the compatibility wrapper in `lib/notifications.ts`.

The notification flow is:

```text
server action / cron
  -> notifyTeamMembers(...)
  -> notifications insert with type, title, message, link, metadata
  -> Supabase Realtime streams row to matching user
  -> bell preview and /notifications update without refresh
```

The `/notifications` inbox supports all/unread/read/archived filters, search, pagination, mark read, mark all read, delete, archive, and selected bulk actions. Notification links deep-link to the related product surface, such as `/entries`, `/budgets`, `/settlements`, `/team`, or `/approvals`.

Role-aware audience selection happens before insert:

- `personal`: explicit member ids, usually for viewer-owned events.
- `admins`: owners and admins.
- `owners`: team owners only.
- `team`: all active members, optionally excluding the actor.

Migration `013_notifications_activity_center.sql` keeps compatibility columns aligned. `body/message` and `read/read_at/is_read` are synchronized by trigger so old and new paths remain consistent.

## Activity Architecture

`team_activity_log` is the legacy activity stream. Normalized `activity_logs` stores the current activity center fields: `action_type`, `entity_type`, `entity_id`, `description`, `metadata`, and `created_at`. Migration `013_notifications_activity_center.sql` mirrors new legacy rows into `activity_logs` and keeps `message/description` synchronized.

The activity flow is:

```text
server action / cron
  -> recordActivity(...)
  -> activity_logs insert
  -> Supabase Realtime streams team-scoped inserts
  -> /activity and dashboard recent activity update without refresh
```

Activity filters use `entity_type` and cover expense, budget, team, settlement, approval, and recurring expense events. Search runs against description, message, and action type. Pages load in bounded ranges and realtime subscriptions are scoped to the active team to avoid large payloads and excessive channel usage.
