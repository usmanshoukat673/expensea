# Expensea — Smarter Expense Tracking

**Free and open source.** Self-host or deploy your own instance to track shared team expenses with Supabase auth, team workspaces, role-based access, realtime updates, and public sharing. No license fees, no vendor lock-in.

## License

This project is open source software. You are free to use, study, modify, and share it for any purpose, including commercial use. Contributions and forks are welcome.

## Stack

- Next.js App Router · TypeScript · Tailwind · shadcn/ui
- Supabase (Auth, Postgres, RLS, Realtime)
- React Hook Form · Zod · TanStack Table · Framer Motion · Recharts

## Setup

1. Create a [Supabase](https://supabase.com) project (free tier works).
2. Copy `.env.local.example` to `.env.local` and set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL` (e.g. `http://localhost:3000`)
3. Run SQL in **Supabase → SQL Editor** (in order):
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_fix_auth_user_trigger.sql` (signup + backfill)
   - …through `006_multi_team_architecture.sql`
   - `supabase/migrations/007_categories_and_settlements.sql`
4. In Supabase **Authentication → URL Configuration**, add:
   - Site URL: your app URL
   - Redirect URLs: `{APP_URL}/auth/callback`
5. Enable **Email** provider under Authentication → Providers.
6. Install and run:

```bash
npm install
npm run dev
```

## Features

| Area       | Routes                                                                   |
| ---------- | ------------------------------------------------------------------------ |
| Auth       | `/login`, `/signup`, `/forgot-password`, `/reset-password`               |
| Onboarding | `/onboarding`, `/create-team`, `/join-team`                              |
| App        | `/`, `/entries`, `/categories`, `/settlements`, `/team`, `/team/invite`, `/team/settings`, `/analytics` |
| Settings   | `/settings/profile`, `/settings/team`, `/settings/billing`               |
| Public     | `/share/[teamSlug]`, `/share/user/[id]`                                  |

**Roles:** `owner` · `admin` (CRUD) · `viewer` (read-only)

**Keyboard:** `⌘K` command palette · `⌘⇧N` quick add entry (editors)

## Contributing

Issues and pull requests are welcome. Fork the repo, make your changes, and open a PR.
