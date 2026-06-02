# Expensea API And Server Actions

Expensea primarily uses Next.js server actions instead of public JSON endpoints. Actions return an `ActionResult` shape such as `{ success: true }` or `{ error: "Message" }`, then revalidate affected routes.

## Environment

Server actions use the authenticated Supabase SSR client. Admin-only operations use `SUPABASE_SERVICE_ROLE_KEY` and must never run in the browser.

## Validation Rules

Validation lives in `lib/validations.ts`.

| Schema | Main rules |
| --- | --- |
| `loginSchema` | Valid email, password length at least 6. |
| `signupSchema` | Name length 2-100, valid email, password length at least 6, matching confirmation. |
| `profileSchema` | Name length 2-100, optional avatar URL. |
| `teamNameSchema` | Team name length 2-50. |
| `inviteSchema` | Valid email, role `admin` or `viewer`. |
| `lunchEntrySchema` | Member UUID, positive amount, date, paid/unpaid status, optional category, split mode, participants. |
| `rejectionSchema` | Rejection or request-changes reason is required and capped at 500 characters. |
| `reimbursementSchema` | Positive reimbursement amount, reimbursement date, optional notes up to 500 characters. |
| `categorySchema` | Name length 2-50, icon, hex color, optional description up to 200 chars. |
| `budgetSchema` | Type `monthly` or `category`, positive amount, category required for category budgets. |
| `settlementSchema` | Payer/receiver UUIDs, positive amount, optional note and proof URL. |
| `recurringExpenseSchema` | Title, positive amount, category, frequency, positive interval, start date, optional end date after start date. |
| `joinTeamSchema` | Invite token length at least 10. |

## Authentication Actions

File: `lib/actions/auth.ts`

### `signIn(formData)`

Input:

```text
email=owner@expensea.app
password=password123
```

Success: signs in and redirects to the app. Failure returns `{ error }`.

### `signUp(formData)`

Input:

```text
fullName=Usman Shoukat
email=owner@example.com
password=password123
confirmPassword=password123
```

Creates a Supabase auth user and profile.

### `forgotPassword(formData)` and `resetPassword(formData)`

Start and complete the password reset flow.

### `signOut()`

Signs out the current user and redirects to login.

## Team Actions

Files: `lib/actions/teams.ts`, `lib/actions/switch-team.ts`, `lib/actions/team-invites.ts`

### Create and switch teams

```ts
await createTeam(formDataWith({ name: 'Marketing Team' }))
await switchTeam(teamId)
```

`createTeam` creates the team, owner membership, default categories, and updates active team context. `switchTeam` requires active membership.

### Member and role management

Actions:

- `inviteMember(email, role)`
- `addMemberByEmail(formData)`
- `updateMemberRole(memberId, role)`
- `removeMember(memberId)`
- `toggleMemberStatus(userId, active)`
- `transferOwnership(newOwnerMemberId)`
- `deleteTeam()`

Roles are limited to owner/admin/viewer in the database; shareable invites allow admin/viewer.

### Shareable invites

Actions:

- `getInvitePreview(token)`
- `getActiveShareableInvite()`
- `generateShareableInvite(formData)`
- `sendEmailInvite(formData)`
- `acceptTeamInvite(token)`
- `disableTeamInvite(inviteId)`
- `regenerateTeamInvite(inviteId, formData)`
- `listTeamInvites()`

Example invite form:

```text
role=viewer
expiresInDays=7
usageLimit=5
```

## Expense Actions

File: `lib/actions/lunch-entries.ts`

Actions:

- `createLunchEntry(formData)`
- `updateLunchEntry(id, formData)`
- `deleteLunchEntry(id)`
- `bulkDeleteLunchEntries(ids)`
- `submitExpenseForApproval(id)`
- `approveExpense(id)`
- `rejectExpense(id, formData)`
- `requestExpenseChanges(id, formData)`
- `recordExpenseReimbursement(id, formData)`

Example create request:

```text
userId=<payer-profile-id>
amount=4200
lunchDate=2026-06-01
notes=Team lunch
paymentStatus=paid
categoryId=<food-category-id>
isShared=true
splitType=equal
participantIds=<member-id>,<member-id>
intent=draft|submit
```

Response:

```json
{ "success": true }
```

The action writes `lunch_entries` and, for shared expenses, `lunch_entry_participants`. New expenses are drafts unless `intent=submit`, which sets `approval_status=pending_approval` and `submitted_by` to the current user.

### Approval actions

Viewers can submit their own draft or rejected expenses. Admins and owners can approve, reject, request changes, and reimburse.

```ts
await submitExpenseForApproval(expenseId)
await approveExpense(expenseId)
```

Reject and request-changes require a reason:

```text
reason=Missing receipt
```

Reimbursement input:

```text
amount=6400
reimbursedAt=2026-06-02
notes=Payroll transfer
```

Approval actions write notifications and activity. Approving an expense revalidates budgets, analytics, reports, settlements, the dashboard, entries, and the approval queue.

Financial data helpers count only `approval_status IN ('approved', 'reimbursed')`; pending, draft, and rejected expenses remain visible in operational views but do not affect budgets, reports, analytics, settlements, or public totals.

## Category Actions

File: `lib/actions/expense-categories.ts`

Actions:

- `createExpenseCategory(formData)`
- `updateExpenseCategory(id, formData)`
- `deleteExpenseCategory(id)`

Example:

```text
name=Internet
icon=wifi
color=#06b6d4
description=Connectivity and hosting
```

## Budget Actions

File: `lib/actions/team-budgets.ts`

Actions:

- `createTeamBudget(formData)`
- `updateTeamBudget(id, formData)`
- `deleteTeamBudget(id)`

Example monthly budget:

```text
type=monthly
amount=150000
month=2026-06-01
```

Example category budget:

```text
type=category
categoryId=<category-id>
amount=25000
month=
```

## Settlement Actions

File: `lib/actions/settlements.ts`

Actions:

- `createSettlement(formData)`
- `updateSettlementStatus(id, status)`

Example:

```text
payerUserId=<debtor-id>
receiverUserId=<creditor-id>
amount=1200
note=Lunch split
proofUrl=
```

Allowed statuses are `pending`, `completed`, and `cancelled`.

## Recurring Expense Actions

File: `lib/actions/recurring-expenses.ts`

Actions:

- `createRecurringExpense(formData)`
- `updateRecurringExpense(id, formData)`
- `setRecurringExpenseActive(id, active)`
- `deleteRecurringExpense(id)`
- `processDueRecurringExpenses()`

Example:

```text
title=Monthly office internet
amount=8500
categoryId=<internet-category-id>
frequency=monthly
intervalValue=1
startDate=2026-06-01
endDate=
```

## Notification Actions

File: `lib/actions/notifications.ts`

Actions:

- `markNotificationRead(id)`
- `markAllNotificationsRead()`

## API Routes

### `POST /api/cron/recurring-expenses`

Generates due recurring expenses by calling the Postgres function `process_due_recurring_expenses`.

Headers:

```http
Authorization: Bearer <CRON_SECRET>
```

The header is required only when `CRON_SECRET` is configured.

Response:

```json
{
  "success": true,
  "generated": 3
}
```

Errors:

```json
{ "error": "Unauthorized" }
```

```json
{ "error": "Missing Supabase service role configuration" }
```

`GET /api/cron/recurring-expenses` delegates to the same handler for simple scheduler compatibility.
