# Demo data seeding

Populate Expensea with realistic multi-team demo data for development, screenshots, and testing.

## Prerequisites

1. Run all SQL migrations in `supabase/migrations/` (001–008).
2. Set in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (required for seed scripts)

## Commands

| Command | Description |
| -------- | ------------- |
| `npm run db:seed` | Create demo users, teams, ~270 expenses, budgets, settlements, activity, notifications |
| `npm run db:seed -- --force` | Replace existing demo data |
| `npm run db:seed -- --reset` | Clear demo data first, then seed |
| `npm run db:reset` | Remove demo teams and related rows (keeps auth users) |
| `npm run db:reset -- --delete-users` | Also delete demo auth accounts |
| `npm run db:reseed` | Full reset + seed |

## Demo logins

Password for all accounts: `password123`

| Email | Role (primary team) |
| ----- | ------------------- |
| `owner@expensea.app` | Owner — Expensea HQ |
| `admin@expensea.app` | Admin |
| `viewer@expensea.app` | Viewer |
| `ahmed.khan@expensea.app` | Member |
| `hamza.malik@expensea.app` | Member |
| `fatima.noor@expensea.app` | Member |
| `bilal.hassan@expensea.app` | Member |

## Demo teams

| Slug | Public | Currency |
| ---- | ------ | -------- |
| `expensea-hq` | Yes | PKR |
| `remote-team` | No | USD |
| `family-budget` | No | PKR |
| `startup-operations` | Yes | PKR |
| `friends-trip` | Yes | PKR |

Public share URLs: `/share/expensea-hq`, `/share/startup-operations`, `/share/friends-trip`

## Idempotency

Demo teams use fixed slugs (`expensea-hq`, etc.). Re-running `db:seed` skips if data already exists unless you pass `--force` or use `db:reseed`.

## Architecture

```
scripts/seed.ts      → lib/seed/index.ts
scripts/reset.ts     → lib/seed/reset.ts
lib/seed/config.ts   → users, teams, budgets constants
lib/seed/*.ts        → auth, teams, expenses, settlements, budgets, activity, notifications
```

Uses `@faker-js/faker` (seeded) for varied notes; amounts and dates use weighted random helpers for chart-friendly trends.
