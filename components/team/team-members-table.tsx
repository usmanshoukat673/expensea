'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  updateMemberRole,
  removeMember,
  transferOwnership,
  toggleMemberStatus,
} from '@/lib/actions/teams';
import type { TeamRole, MemberStatus } from '@/lib/database.types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { getInitials } from '@/lib/formatters';
import { useCurrency } from '@/hooks/use-currency';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { EmptyState } from '@/components/ui/empty-states';
import { ExternalLink, Users } from 'lucide-react';
import { FilterField, FilterSheet } from '@/components/filters/filter-sheet';

export type MemberRow = {
  id: string;
  user_id: string;
  role: TeamRole;
  status?: MemberStatus;
  joined_at: string;
  profiles?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  lunchStats?: { total: number; pending: number };
};

const PAGE_SIZE = 8;

export function TeamMembersTable({
  members,
  currentUserId,
  currentRole,
}: {
  members: MemberRow[];
  currentUserId: string;
  currentRole: TeamRole | null;
}) {
  const { format } = useCurrency();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activityFilter, setActivityFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [pending, startTransition] = useTransition();
  const canEdit = currentRole === 'owner' || currentRole === 'admin';
  const isOwner = currentRole === 'owner';

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return members.filter((m) => {
      const name = m.profiles?.full_name ?? m.profiles?.email ?? '';
      const status = m.status ?? 'active';
      const total = m.lunchStats?.total ?? 0;
      const pendingTotal = m.lunchStats?.pending ?? 0;
      if (roleFilter !== 'all' && m.role !== roleFilter) return false;
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (activityFilter === 'spending' && total <= 0) return false;
      if (activityFilter === 'pending' && pendingTotal <= 0) return false;
      if (activityFilter === 'no_spend' && total > 0) return false;
      return !q || name.toLowerCase().includes(q) || m.profiles?.email?.toLowerCase().includes(q);
    });
  }, [members, debouncedSearch, roleFilter, statusFilter, activityFilter]);

  const activeFilterCount =
    (roleFilter !== 'all' ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0) +
    (activityFilter !== 'all' ? 1 : 0);

  const resetFilters = () => {
    setRoleFilter('all');
    setStatusFilter('all');
    setActivityFilter('all');
    setPage(0);
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageMembers = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const recentJoins = [...members]
    .sort((a, b) => new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime())
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <Input
          placeholder="Search members..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
          <FilterSheet
            activeCount={activeFilterCount}
            title="Member filters"
            description="Filter the roster by role, account status, and expense activity."
            onReset={resetFilters}
          >
            <FilterField label="Role">
              <Select value={roleFilter} onValueChange={(value) => { setRoleFilter(value); setPage(0); }}>
                <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label="Activity status">
              <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(0); }}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label="Activity level">
              <Select value={activityFilter} onValueChange={(value) => { setActivityFilter(value); setPage(0); }}>
                <SelectTrigger><SelectValue placeholder="Activity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any activity</SelectItem>
                  <SelectItem value="spending">Has spending</SelectItem>
                  <SelectItem value="pending">Has pending amount</SelectItem>
                  <SelectItem value="no_spend">No spending</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>
          </FilterSheet>
          <p className="text-sm text-muted-foreground">{filtered.length} members</p>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10">
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>This month</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-40 p-0">
                  <EmptyState
                    icon={Users}
                    title={search || activeFilterCount > 0 ? 'No matching members' : 'No team members'}
                    description={
                      search || activeFilterCount > 0
                        ? 'Try a different name or email in search.'
                        : 'Invite colleagues to start tracking expenses together.'
                    }
                    actionLabel={search || activeFilterCount > 0 ? undefined : 'Invite member'}
                    actionHref={search || activeFilterCount > 0 ? undefined : '/team'}
                  />
                </TableCell>
              </TableRow>
            ) : (
              pageMembers.map((m) => {
                const name = m.profiles?.full_name ?? m.profiles?.email ?? 'Member';
                const active = (m.status ?? 'active') === 'active';
                return (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={m.profiles?.avatar_url ?? undefined} />
                          <AvatarFallback>{getInitials(name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{name}</p>
                          <p className="text-xs text-muted-foreground">
                            Joined {formatDistanceToNow(new Date(m.joined_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {m.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {canEdit && m.role !== 'owner' ? (
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={active}
                            onCheckedChange={(checked) =>
                              startTransition(async () => {
                                const r = await toggleMemberStatus(m.user_id, checked);
                                if (r?.error) toast.error(r.error);
                                else toast.success(checked ? 'Member activated successfully.' : 'Member deactivated successfully.');
                              })
                            }
                          />
                          <span className="text-xs text-muted-foreground">
                            {active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      ) : (
                        <StatusBadge status={active ? 'active' : 'inactive'} />
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="font-medium">{format(m.lunchStats?.total ?? 0)}</span>
                      <span className="text-muted-foreground text-xs block">
                        Pending {format(m.lunchStats?.pending ?? 0)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-1 flex-wrap">
                        {(canEdit || m.user_id === currentUserId) && (
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/members/${m.user_id}`}>
                              <ExternalLink className="size-4" />
                              Profile
                            </Link>
                          </Button>
                        )}
                        {canEdit && m.role !== 'owner' && m.user_id !== currentUserId && (
                          <>
                          <Select
                            defaultValue={m.role}
                            onValueChange={(role) =>
                              startTransition(async () => {
                                const r = await updateMemberRole(m.id, role as TeamRole);
                                if (r?.error) toast.error(r.error);
                                else toast.success('Role updated successfully.');
                              })
                            }
                          >
                            <SelectTrigger className="w-[100px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                          {isOwner && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={pending}
                              onClick={() =>
                                startTransition(async () => {
                                  const r = await transferOwnership(m.id);
                                  if (r?.error) toast.error(r.error);
                                  else toast.success('Ownership transferred successfully.');
                                })
                              }
                            >
                              Owner
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive">
                                Remove
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove member?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  They will lose access to this workspace.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    startTransition(async () => {
                                      const r = await removeMember(m.id);
                                      if (r?.error) toast.error(r.error);
                                      else toast.success('Member removed successfully.');
                                    })
                                  }
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground self-center">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {recentJoins.length > 0 && (
        <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
          <p className="text-sm font-medium mb-2">Recently joined</p>
          <div className="flex flex-wrap gap-2">
            {recentJoins.map((m) => (
              <Badge key={m.id} variant="secondary">
                {m.profiles?.full_name ?? m.profiles?.email ?? 'Member'}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
