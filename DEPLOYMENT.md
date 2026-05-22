# Deployment Guide — Expensea

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run migrations in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_fix_auth_user_trigger.sql` (required for signup)
3. Enable **Email** auth provider under Authentication → Providers.
4. Set **Site URL** and redirect URLs:
   - Site URL: `https://your-domain.vercel.app`
   - Redirect: `https://your-domain.vercel.app/auth/callback`
5. Copy **Project URL**, **anon key**, and **service role key** (Settings → API).

## Environment variables

Copy `.env.example` to `.env.local` (local) or add the same keys in Vercel:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Manual member add by email |
| `NEXT_PUBLIC_APP_URL` | Yes | App origin (e.g. `https://app.example.com`) |

## Local development

```bash
npm install
npm run dev
```

## Vercel deployment

1. Import the Git repository in Vercel.
2. Framework preset: **Next.js**.
3. Add all environment variables from `.env.example`.
4. Deploy. Post-deploy, confirm Supabase redirect URLs match the production domain.

## Database migrations (CLI)

If using Supabase CLI:

```bash
supabase link --project-ref YOUR_REF
supabase db push
```

## Public sharing

- Enable **public sharing** in Settings → Team.
- Team page: `/public/team/{team-uuid}` or `/share/{team-slug}`
- Member page: `/public/user/{user-uuid}` (requires public team)

## Roles

| Role | Permissions |
|------|-------------|
| Owner | Full control, transfer ownership, delete team |
| Admin | CRUD entries, invite/manage members |
| Viewer | Read-only dashboard, entries, analytics |
