'use client';

import { useMemo, useState, useTransition } from 'react';
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
import { Users } from 'lucide-react';

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
  const [page, setPage] = useState(0);
  const [pending, startTransition] = useTransition();
  const canEdit = currentRole === 'owner' || currentRole === 'admin';
  const isOwner = currentRole === 'owner';

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return members.filter((m) => {
      const name = m.profiles?.full_name ?? m.profiles?.email ?? '';
      return !q || name.toLowerCase().includes(q) || m.profiles?.email?.toLowerCase().includes(q);
    });
  }, [members, debouncedSearch]);

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
        <p className="text-sm text-muted-foreground">{filtered.length} members</p>
      </div>

      <div className="rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
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
                    title={search ? 'No matching members' : 'No team members'}
                    description={
                      search
                        ? 'Try a different name or email in search.'
                        : 'Invite colleagues to start tracking expenses together.'
                    }
                    actionLabel={search ? undefined : 'Invite member'}
                    actionHref={search ? undefined : '/team'}
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
                                else toast.success(checked ? 'Member activated' : 'Member deactivated');
                              })
                            }
                          />
                          <span className="text-xs text-muted-foreground">
                            {active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      ) : (
                        <Badge variant={active ? 'default' : 'secondary'}>
                          {active ? 'Active' : 'Inactive'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="font-medium">{format(m.lunchStats?.total ?? 0)}</span>
                      <span className="text-muted-foreground text-xs block">
                        Pending {format(m.lunchStats?.pending ?? 0)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {canEdit && m.role !== 'owner' && m.user_id !== currentUserId && (
                        <div className="flex justify-end items-center gap-1 flex-wrap">
                          <Select
                            defaultValue={m.role}
                            onValueChange={(role) =>
                              startTransition(async () => {
                                const r = await updateMemberRole(m.id, role as TeamRole);
                                if (r?.error) toast.error(r.error);
                                else toast.success('Role updated');
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
                                  else toast.success('Ownership transferred');
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
                                      else toast.success('Member removed');
                                    })
                                  }
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
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
