# Expensea — Smarter Expense Tracking

Expensea is a free, open-source expense tracker for teams that need shared spending, budgets, settlements, reporting, recurring expenses, and public read-only sharing in one Supabase-backed workspace.

## Overview

Expensea uses a multi-team architecture where each user can belong to several teams and switch an active team context from their profile. Each team owns its expenses, categories, budgets, settlements, invites, notifications, recurring rules, and activity logs. Owners and admins can manage data; viewers can inspect team spending without changing it.

The app supports individual and shared expenses, equal or selected participant splits, team/category budgets, pending and completed settlements, reporting by date range/category/member, recurring expenses that can be generated on demand or by cron, realtime notifications, activity history, team invite links, and public share pages for teams that opt in.

## Features

### Authentication

- Email/password sign up, sign in, sign out, forgot password, and reset password.
- Supabase Auth callback handling at `/auth/callback`.
- Onboarding flow for setting a profile name and creating or joining a team.
- Profile settings for name, avatar URL, active team, theme, and currency preferences.

### Team Management

- Create multiple teams and switch between active teams.
- Team roles: `owner`, `admin`, and `viewer`.
- Owner/admin team settings for name, brand name, currency, logo URL, and public sharing options.
- Member management, role updates, status toggles, member removal, and ownership transfer.
- Email-based invites through `team_invitations` and shareable invite links through `team_invites`.

### Expense Management

- CRUD for team-scoped expense entries stored in `lunch_entries`.
- Paid/unpaid status, notes, expense date, payer, category, and created-by tracking.
- Shared expenses with `none`, `equal`, or `selected` split modes.
- Participant shares stored in `lunch_entry_participants`.
- Bulk delete for selected expenses.
- Realtime refresh support for expense and team updates.

### Categories

- Default categories seeded per team: Food, Travel, Office, Internet, Utilities, Entertainment, and Miscellaneous.
- Custom category create/update/delete with icon, color, and description.
- Category analytics in reports and public pages when enabled.

### Budgets

- Team monthly budgets and category budgets.
- Optional month-specific budgets or recurring budget limits.
- Budget usage engine calculates spent, remaining, utilization, warning, and over-budget states.
- Budget alerts are displayed in dashboard, analytics, and budget views.

### Settlements

- Create settlement records between two team members.
- Pending, completed, and cancelled statuses.
- Settlement history and balance calculations for shared expenses.
- Parties and team editors can update settlement state according to RLS and server-action checks.

### Reporting

- Reports by date range with current/previous comparisons.
- Monthly summary totals, paid/pending totals, member spending, category breakdowns, and settlement summary.
- Historical budget data for trend and overspending analysis.

### Recurring Expenses

- Create, update, pause/resume, delete, and process recurring expenses.
- Frequencies: daily, weekly, monthly, yearly.
- Cron/API route at `/api/cron/recurring-expenses` calls the database function that generates due expenses idempotently.
- Generated expenses are linked back to `recurring_expenses`.

### Notifications

- Notification bell backed by `notifications`.
- Read/read-all server actions.
- Demo data includes expense notifications, budget alerts, settlement reminders, and invite notifications.
- Recurring generation can create notifications for team members.

### Public Sharing

- Public team pages by slug at `/share/[teamSlug]`.
- Compatibility public routes by team/user id at `/public/team/[id]` and `/public/user/[id]`.
- Team settings control whether public visitors can see balances and category analytics.

### Analytics

- Dashboard charts, category charts, budget charts, reporting trends, top spenders, budget status, and public spending charts.
- Demo seed data includes current-month, previous-month, and historical expenses for realistic charts.

## Tech Stack

- Next.js App Router, React, TypeScript
- Supabase Auth, Postgres, RLS, Realtime
- Tailwind CSS, shadcn/ui-style components, Radix UI
- React Hook Form, Zod, TanStack Table, Recharts, Framer Motion

## Prerequisites

- Node.js 22.x or newer recommended (`@types/node` is pinned to 22).
- npm, using the committed `package-lock.json`.
- Supabase project with Auth and Postgres enabled.

## Installation

1. Clone the repository.

```bash
git clone <repository-url>
cd expensea
```

2. Install dependencies.

```bash
npm install
```

3. Configure environment variables.

```bash
cp .env.example .env.local
```

Fill in:

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key.
- `SUPABASE_SERVICE_ROLE_KEY`: service role key for seed/reset scripts and cron processing.
- `NEXT_PUBLIC_APP_URL`: local or deployed app URL.
- `CRON_SECRET`: optional bearer token for recurring-expense cron calls.

4. Run database migrations in order.

Apply every SQL file in `supabase/migrations/`, from `001_initial_schema.sql` through `011_recurring_expenses.sql`, in the Supabase SQL editor or through your preferred Supabase CLI workflow.

5. Configure Supabase Auth.

- Enable the Email provider.
- Set Site URL to `NEXT_PUBLIC_APP_URL`.
- Add redirect URL: `{NEXT_PUBLIC_APP_URL}/auth/callback`.

6. Seed a full demo workspace.

```bash
npm run seed:demo
```

7. Start the development server.

```bash
npm run dev
```

Open `http://localhost:3000` and sign in with `owner@expensea.app` / `password123`.

## Developer Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js dev server. |
| `npm run build` | Build the production app. |
| `npm run start` | Start the production build. |
| `npm run lint` | Run ESLint. |
| `npm run seed` | Run the demo seeder without clearing existing demo teams unless needed. |
| `npm run seed:demo` | Reset and populate a complete demo workspace. |
| `npm run db:seed` | Backward-compatible alias for the seeder. |
| `npm run db:reset` | Remove seeded demo workspace data, keeping auth users by default. |
| `npm run db:refresh` | Reset demo workspace data, then seed again. |
| `npm run db:reseed` | Backward-compatible alias for `db:refresh`. |

Seeder flags:

```bash
npm run seed -- --force
npm run seed -- --reset
npm run db:reset -- --delete-users
```

## Database Tables

### profiles

Stores app profile data for Supabase auth users. Key fields: `id`, `full_name`, `email`, `avatar_url`, `team_id`, `onboarding_completed`, `status`. `team_id` is the active team context and must point to a team where the user is an active member.

### teams

Stores workspaces. Key fields: `id`, `name`, `slug`, `owner_id`, `created_by`, `currency`, `brand_name`, `logo_url`, `is_public`, `show_balances_on_public`, `show_category_analytics_on_public`. Related to members, expenses, budgets, categories, settlements, invites, notifications, recurring rules, and activity logs.

### team_members

Joins users to teams with a role and status. Key fields: `team_id`, `user_id`, `role`, `status`, `joined_at`. Roles are `owner`, `admin`, and `viewer`.

### expenses

The app stores expenses in `lunch_entries` for historical compatibility. Key fields: `team_id`, `user_id`, `amount`, `lunch_date`, `notes`, `payment_status`, `category_id`, `is_shared`, `split_type`, `created_by`, `recurring_expense_id`. Shared participant rows live in `lunch_entry_participants`.

### expense_categories

Team-owned categories. Key fields: `team_id`, `name`, `slug`, `icon`, `color`, `description`, `created_by`. Default categories are created automatically for each team.

### team_budgets

Team and category budget limits. Key fields: `team_id`, `type`, `category_id`, `amount`, `currency`, `month`, `created_by`. `type=monthly` has no category; `type=category` requires one.

### settlements

Tracks money movement between members. Key fields: `team_id`, `payer_user_id`, `receiver_user_id`, `amount`, `status`, `note`, `proof_url`, `settled_at`, `created_by`.

### team_invites

Shareable invite links. Key fields: `token`, `team_id`, `invited_email`, `role`, `expires_at`, `usage_limit`, `usage_count`, `is_active`, `created_by`. Legacy email invite records are also stored in `team_invitations`.

### recurring_expenses

Recurring expense rules. Key fields: `team_id`, `created_by`, `title`, `amount`, `category_id`, `frequency`, `interval_value`, `start_date`, `end_date`, `next_run_date`, `is_active`, `last_generated_at`.

### notifications

User notifications scoped to a team. Key fields: `user_id`, `team_id`, `type`, `title`, `body`, `message`, `metadata`, `read`, `read_at`.

### activity_logs

Normalized activity audit table mirrored from `team_activity_log`. Key fields: `team_id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `message`, `metadata`, `created_at`.

## Documentation

- [Architecture](docs/architecture.md)
- [API and Server Actions](docs/api.md)
- [Seeding Guide](docs/SEEDING.md)
- [Deployment Notes](DEPLOYMENT.md)

## Demo Data

`npm run seed:demo` creates demo users, multiple teams, memberships with different roles, categories, current/previous/historical expenses, budgets with healthy/near-limit/over-budget states, settlements, recurring expenses, notifications, pending invites, public teams, and activity history.

Primary demo login:

- Email: `owner@expensea.app`
- Password: `password123`

## License

This project is open source software. You are free to use, study, modify, and share it for any purpose, including commercial use.
