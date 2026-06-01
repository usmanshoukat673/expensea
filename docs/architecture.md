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
  |-- expense_categories
  |-- team_budgets
  |-- settlements
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
- `viewer`: read-only team member.

The role checks are enforced in both server actions and RLS. Server actions provide friendly validation and redirects; RLS remains the final database boundary.

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

Budget views, dashboard cards, reports, analytics, and demo seeders all rely on this engine's assumptions.

## Settlement Engine

Shared expenses are recorded in `lunch_entries` with participant rows in `lunch_entry_participants`. The balance engine in `lib/balance/engine.ts`:

1. Calculates participant shares for equal or selected splits.
2. Creates raw debts from participants to payers.
3. Applies completed settlements.
4. Simplifies pairwise debts into minimal payment edges.

Pending settlements are visible records. Completed settlements reduce outstanding debt. Cancelled settlements are ignored by debt calculations.

## Recurring Expense Engine

Recurring rules live in `recurring_expenses`. The database function `process_due_recurring_expenses` selects active due rules, creates idempotent linked `lunch_entries`, advances `next_run_date`, deactivates completed rules, writes activity, and notifies members.

The Next.js route `/api/cron/recurring-expenses` invokes that function with the service-role client. If `CRON_SECRET` is set, callers must send `Authorization: Bearer <CRON_SECRET>`.

## Activity And Notifications

`team_activity_log` is the legacy activity stream. Migration `010_smart_notifications_activity.sql` creates normalized `activity_logs` and mirrors new legacy rows into it. The app reads normalized activity data while seeders still insert the legacy stream to exercise the mirror trigger.

Notifications are stored in `notifications`. Compatibility columns `body/message` and `read/read_at` are synchronized by trigger so old and new UI paths remain aligned.
