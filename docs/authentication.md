# Authentication And Session Lifecycle

Expensea requires explicit account creation. A valid Supabase Auth session is not enough to enter the app; the matching `profiles` row must already exist and be active.

## Central Validation

Use `validateCurrentUser()` from `lib/auth/session.ts` for auth-sensitive server code. It checks:

- Supabase Auth session exists and can be refreshed.
- The application profile exists.
- `profiles.status` is `active`.
- Workspace state can resolve the active team and role when a protected team page requires it.

`requireAuth()` and `requireTeam()` build on this validation. Server actions and protected pages must use those helpers instead of reading `supabase.auth.getUser()` directly.

## Login

Login is only for existing Expensea accounts.

1. `signIn()` validates credentials with Supabase Auth.
2. It immediately calls `validateCurrentUser()`.
3. If the auth user has no Expensea profile, the app signs out and shows:

```text
Your account is not registered in Expensea. Please create an account or contact your administrator.
```

The login screen provides "Go to Sign Up" and "Log Out" actions for this case. Login must never create a profile or silently convert into signup.

## Signup

Signup is the only user-facing account creation path. `signUp()` creates the Supabase Auth user, then calls `createUserProfileForSignup()` to create the application profile explicitly. The old auth-user trigger is disabled by migration `017_disable_auth_auto_profile_provisioning.sql`.

Invite tokens passed as `/signup?invite=<token>` are preserved through signup. If the signup returns an active session, the invite is accepted immediately; otherwise the user is sent to login with the invite redirect preserved.

## Session Expiration And Stale Sessions

Middleware and protected helpers handle expired, invalid, and revoked sessions by clearing the Supabase session and redirecting to:

```text
/login?authStatus=session_expired
```

The login page shows:

```text
Your session has expired. Please sign in again.
```

The client `AuthProvider` also clears in-memory user, profile, role, and team state when profile validation fails after hydration.

## Deleted Or Disabled Accounts

Profiles with `status != active`, or authenticated sessions whose profile can no longer be found on protected routes, are treated as deleted accounts. Expensea signs the user out, clears local auth/team state, and redirects to login with:

```text
Your account no longer exists. Please create a new account.
```

## Invite Flow

Invite links validate before any join is attempted.

- Unauthenticated users opening `/invite/team/[token]` are redirected to `/signup?invite=[token]`.
- Authenticated users with a missing or inactive profile are signed out and redirected to signup with the invite token preserved.
- Authenticated users with a valid active profile accept the invite immediately. Acceptance validates invite status, expiry, usage limits, email restrictions, existing membership, and role. It then creates the membership, activity log, notification, active team selection, and redirects to the team dashboard.
- Invalid, disabled, expired, or exhausted invites show a friendly unavailable state and do not create membership.

## Non-Negotiable Rule

Do not call `createUserProfileForSignup()` from login, middleware, protected layouts, invite acceptance, or general session validation. Missing profiles must be surfaced as validation failures, not repaired automatically.
