# Demo Data Seeding

Expensea includes a complete demo workspace for development, onboarding, screenshots, and analytics testing.

## Prerequisites

1. Apply every migration in `supabase/migrations/`, from `001_initial_schema.sql` through `017_disable_auth_auto_profile_provisioning.sql`.
2. Set these variables in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL`
3. Install dependencies with `npm install`.

## Commands

| Command | Description |
| --- | --- |
| `npm run seed` | Seed demo data. Skips a populated demo workspace unless forced. |
| `npm run seed -- --force` | Replace existing demo rows for known demo teams where seeders own the rows. |
| `npm run seed -- --reset` | Clear demo data first, then seed. |
| `npm run seed:demo` | Single command for a fresh, fully populated demo workspace. |
| `npm run db:seed` | Backward-compatible alias for `npm run seed`. |
| `npm run db:reset` | Remove demo teams and related rows, keeping auth users. |
| `npm run db:reset -- --delete-users` | Also delete demo auth accounts. |
| `npm run db:refresh` | Reset demo data, then seed again. |
| `npm run db:reseed` | Backward-compatible alias for `db:refresh`. |

## What Gets Seeded

- Users: owner, admin, viewer, and additional realistic members.
- Teams: multiple teams with public and private sharing settings.
- Memberships: owner/admin/viewer role coverage.
- Categories: Food, Travel, Office, Internet, Utilities, Entertainment, Miscellaneous.
- Expenses: current month, previous month, and historical expenses across categories.
- Approvals: pending approvals, approved expenses, rejected expenses, and draft/submitted workflow coverage.
- Reimbursements: not reimbursed, partially reimbursed, and fully reimbursed expense examples.
- Shared expenses: equal participant splits across active members plus custom selected splits with explicit participant share amounts.
- Assignment coverage: individual expenses are assigned to one member and stay non-shared; team expenses may be unshared, equal split, or custom split.
- Budgets: team and category budgets with healthy, near-limit, and over-budget examples.
- Settlements: pending, completed, and cancelled records.
- Invites: legacy email invites and shareable invite links.
- Auth/session QA: missing-profile auth user, inactive/deleted-style profile, and an expired invite fixture.
- Recurring expenses: active, paused, and completed monthly rules.
- Notifications: expense creation, assignment, submission, approval, rejection, reimbursement, budget, settlement, recurring, and invite examples with deep links.
- Activity: team, member, created/updated/deleted/submitted/approved/rejected/reimbursed/assigned/shared/split-updated expense, budget, invite, settlement, approval, and recurring history in normalized `activity_logs`.
- Dashboard customization: role-aware dashboard preferences, saved views, default views, saved filters, widget visibility settings, and favorites.
- Reports/analytics: generated from seeded expenses, budgets, settlements, and activity.

## Demo Logins

Password for all accounts: `password123`

| Email | Primary role |
| --- | --- |
| `owner@expensea.app` | Owner on Expensea HQ |
| `admin@expensea.app` | Admin on Expensea HQ, owner on Remote Team |
| `viewer@expensea.app` | Viewer/Admin coverage across teams |
| `ahmed.khan@expensea.app` | Owner/Admin coverage |
| `hamza.malik@expensea.app` | Owner/Viewer coverage |
| `fatima.noor@expensea.app` | Owner/Viewer coverage |
| `bilal.hassan@expensea.app` | Admin/Viewer coverage |

Additional QA-only accounts use the same password:

| Email | Purpose |
| --- | --- |
| `missing.profile@expensea.app` | Auth user exists but `profiles` row is removed; login must fail without auto-provisioning. |
| `deleted.account@expensea.app` | Profile is `inactive`; protected/session validation must force logout. |

Expired-session testing requires revoking or clearing a real Supabase session cookie, because refresh tokens are managed by Supabase Auth rather than the relational seeders.

## Demo Teams

| Slug | Public | Currency | Notes |
| --- | --- | --- | --- |
| `expensea-hq` | Yes | PKR | Main team with healthy and near-limit budget states. |
| `remote-team` | No | USD | Private remote operations team. |
| `family-budget` | No | PKR | Smaller private household-style workspace. |
| `startup-operations` | Yes | PKR | Public team with over-budget monthly example. |
| `friends-trip` | Yes | PKR | Public trip budget with over-budget travel category. |

Public share URLs:

- `/share/expensea-hq`
- `/share/startup-operations`
- `/share/friends-trip`

## Seeder Architecture

```text
scripts/seed.ts                    -> lib/seed/index.ts
scripts/reset.ts                   -> lib/seed/reset.ts
lib/seed/config.ts                 -> deterministic users, teams, budgets
lib/seed/auth.ts                   -> Supabase auth users and profiles
lib/seed/teams.ts                  -> teams, memberships, invites
lib/seed/expenses.ts               -> expenses, participants, approvals, reimbursements
lib/seed/budgets.ts                -> dynamic budget states from current spend
lib/seed/settlements.ts            -> settlement records
lib/seed/recurring-expenses.ts     -> recurring rules
lib/seed/notifications.ts          -> notification examples
lib/seed/activity.ts               -> activity history
lib/seed/dashboard-customization.ts -> dashboard layouts, saved views, favorites
```

The seeders use fixed team slugs for idempotency and a seeded Faker instance for repeatable realistic notes.

## Notes

- The app stores expenses in `lunch_entries`; product documentation may call these rows expenses.
- Demo data is designed to exercise the implemented product surface without requiring manual setup.
