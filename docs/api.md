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
| `lunchEntrySchema` | Member UUID, positive amount, date, paid/unpaid status, optional category, split mode, participants, assignment type, assigned member for individual expenses, no shared split for individual expenses, and at least one participant for shared team expenses. |
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

`acceptTeamInvite(token)` validates active, unexpired, usage-limited links, email-specific invites, and active membership. Already-joined users are treated idempotently: the active team is switched to the invite team and the action returns success with `data.alreadyMember`.

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

Create/update expense form data includes:

```text
userId=<payer profile uuid>
amount=12000
lunchDate=2026-06-04
paymentStatus=unpaid
categoryId=<optional category uuid>
isShared=false
splitType=none
assignmentType=team | individual
assignedUserId=<required when assignmentType=individual>
participantIds=[]
participantShares={} # only for custom/selected splits
intent=draft | submit
```

When `assignmentType=individual`, the action forces `isShared=false` and `splitType=none`, validates that `assignedUserId` is an active member of the current team, writes `assigned_by`, records an `expense_assigned` activity event, and notifies the assigned member.

When `assignmentType=team` and `isShared=true`, at least one participant is required. `splitType=equal` stores equal participant shares, while `splitType=selected` is the custom split mode and requires `participantShares` amounts for every selected participant that add up to the expense amount.

## Member Ledger And Personal Expense Reads

Files: `lib/data/dashboard.ts`, `lib/data/members.ts`

- `getLunchEntries(teamId, { memberId })` filters expenses where the member is payer, assignee, creator, or submitter. This powers `/my-expenses`.
- `getMemberWorkspaceData(session, memberId)` powers `/members/[memberId]` and `/members/[memberId]/ledger`.
- Viewer sessions can request their own member id only. Admin and owner sessions can request any active team member.

Member workspace data returns:

- profile and membership role/status
- personal and assigned expenses
- settlements
- recurring expenses created by the member
- activity timeline
- impacted budgets
- analytics: spending trend, category breakdown, monthly spending, average monthly spend
- ledger: credits, debits, owed/receivable shared balance, net balance

Exports are client-side CSV, Excel-compatible HTML, and printable PDF from the member workspace and reports UI.

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

Example custom split:

```text
isShared=true
splitType=selected
participantIds=["<member-a>","<member-b>"]
participantShares={"<member-a>":3000,"<member-b>":1200}
```

Response:

```json
{ "success": true }
```

The action writes `lunch_entries` and, for shared expenses, `lunch_entry_participants`. New expenses are drafts unless `intent=submit`, which sets `approval_status=pending_approval` and `submitted_by` to the current user. Expense create, update, delete, bulk-delete, submit, approve, reject, and reimburse actions all write `activity_logs`, create targeted `notifications`, and revalidate `/activity` plus `/notifications`. Shared expense creation also writes `shared_expense_created`; split edits write `split_updated`.

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

Approval actions write notifications and activity. Submit notifies owners/admins and the submitter. Approve notifies the submitter/creator plus owners/admins. Reject includes the rejection reason in the submitter notification. Reimburse notifies the submitter/creator. Approving an expense revalidates budgets, analytics, reports, settlements, the dashboard, entries, notifications, activity, and the approval queue.

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

Budget create, update, and delete actions write activity events and owner/admin notifications. Budget threshold alerts still run after create/update and after approved expense changes.

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

Settlement create, complete, and cancel actions notify the payer and receiver, write activity events, and revalidate settlements, analytics, notifications, and activity.

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
- `deleteNotification(id)`
- `bulkUpdateNotifications(ids, action)`

Bulk action values:

```ts
'read' | 'archive' | 'delete'
```

Notification reads use `lib/data/notifications.ts`:

- `getNotificationsPage(userId, teamId, { status, search, page, limit })`
- `getNotificationSummary(userId, teamId)`

The `/notifications` page filters by `status=all|unread|read|archived`, searches with `q`, and paginates with `page`. Notification rows include `link` so alerts can open the related expense, budget, settlement, team, or approval page.

Notification producers use `notifyTeamMembers` from `lib/activity.ts` or the wrapper in `lib/notifications.ts`. Recipient lookup and insert failures are logged. Audience values are `personal`, `admins`, `owners`, and `team`; `admins` includes both owners and admins.

## Dashboard Customization Actions

File: `lib/actions/dashboard-customization.ts`

Actions:

- `saveDashboardPreference({ widgets, hiddenWidgets, pinnedWidgets })`
- `createDashboardView(name, { widgets, hiddenWidgets, pinnedWidgets, filters })`
- `renameDashboardView(id, name)`
- `deleteDashboardView(id)`
- `duplicateDashboardView(id)`
- `setDefaultDashboardView(id | null)`
- `importDashboardSettings(payload)`
- `toggleDashboardFavorite({ favoriteType, favoriteId, label, href, metadata })`

All actions require an authenticated active team. Writes are scoped to the current `user_id` and `team_id`; RLS also checks active membership. Widget ids are normalized against the supported dashboard registry before persistence.

Example saved view payload:

```json
{
  "widgets": ["summary", "budget", "monthly_overview", "activity"],
  "hiddenWidgets": ["workflow"],
  "pinnedWidgets": ["reports", "dashboards"],
  "filters": {
    "dateRange": "this_month",
    "category": "food",
    "budget": "active",
    "status": "approved",
    "team": "expensea-hq"
  }
}
```

Dashboard reads use `getDashboardCustomization(teamId, userId, role)` from `lib/data/dashboard-customization.ts`. The helper loads preferences, saved views, and favorites in parallel and applies role-aware defaults when no preference exists.

## Activity Reads

Activity reads use `getActivityLogs(teamId, { type, page, limit, search })` from `lib/data/dashboard.ts`.

The `/activity` page filters by `type=expense|budget|team|settlement|approval|recurring_expense`, searches with `q`, and paginates with `page`. Supabase Realtime subscriptions are team-scoped and listen for new `activity_logs` inserts. Activity insert failures and realtime subscription failures are logged.

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
