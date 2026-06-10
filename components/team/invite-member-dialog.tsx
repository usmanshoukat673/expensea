'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { sendEmailInvite } from '@/lib/actions/team-invites';
import { addMemberByEmail } from '@/lib/actions/teams';
import { INVITE_EXPIRY_OPTIONS, type InviteExpiryOption } from '@/lib/invites/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RequiredLabel } from '@/components/ui/required-label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus } from 'lucide-react';
import { InviteLinkSection } from '@/components/team/invite-link-section';

export function InviteMemberDialog() {
  const [pending, startTransition] = useTransition();
  const [role, setRole] = useState<'admin' | 'viewer'>('viewer');
  const [expiry, setExpiry] = useState<InviteExpiryOption>('7d');
  const [open, setOpen] = useState(false);
  const inviteFormRef = useRef<HTMLFormElement>(null);
  const manualFormRef = useRef<HTMLFormElement>(null);

  const resetDialogState = useCallback(() => {
    inviteFormRef.current?.reset();
    manualFormRef.current?.reset();
    setRole('viewer');
    setExpiry('7d');
  }, []);

  useEffect(() => {
    if (open) resetDialogState();
  }, [open, resetDialogState]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="size-4" />
          Invite / Add
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add team member</DialogTitle>
          <DialogDescription>Email invite or share a join link</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="invite">
          <TabsList className="w-full">
            <TabsTrigger value="invite" className="flex-1">
              Invite
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex-1">
              Add manually
            </TabsTrigger>
          </TabsList>
          <TabsContent value="invite" className="space-y-4 pt-2">
            <form
              ref={inviteFormRef}
              className="space-y-4"
              action={(fd) =>
                startTransition(async () => {
                  fd.set('role', role);
                  fd.set('expiry', expiry);
                  const r = await sendEmailInvite(fd);
                  if (r?.error) toast.error(r.error);
                  else {
                    toast.success('Email invitation created successfully.');
                    resetDialogState();
                  }
                })
              }
            >
              <div className="space-y-2">
                <RequiredLabel htmlFor="invite-email" required>Email</RequiredLabel>
                <Input
                  id="invite-email"
                  name="email"
                  type="email"
                  required
                  placeholder="colleague@company.com"
                />
              </div>
              <div className="space-y-2">
                <RequiredLabel required>Role</RequiredLabel>
                <Select value={role} onValueChange={(v) => setRole(v as 'admin' | 'viewer')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <RequiredLabel required>Invitation expires</RequiredLabel>
                <Select value={expiry} onValueChange={(v) => setExpiry(v as InviteExpiryOption)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVITE_EXPIRY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" isLoading={pending} loadingText="Sending invite...">
                Send email invite
              </Button>
            </form>

            <InviteLinkSection
              role={role}
              expiry={expiry}
              onExpiryChange={setExpiry}
            />
          </TabsContent>
          <TabsContent value="manual">
            <form
              ref={manualFormRef}
              className="space-y-4 pt-2"
              action={(fd) =>
                startTransition(async () => {
                  const r = await addMemberByEmail(fd);
                  if (r?.error) toast.error(r.error);
                  else {
                    toast.success('Member added successfully.');
                    resetDialogState();
                    setOpen(false);
                  }
                })
              }
            >
              <div className="space-y-2">
                <RequiredLabel htmlFor="manual-email" required>Existing user email</RequiredLabel>
                <Input id="manual-email" name="email" type="email" required />
              </div>
              <div className="space-y-2">
                <RequiredLabel required>Role</RequiredLabel>
                <Select name="role" defaultValue="viewer">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" variant="secondary" className="w-full" isLoading={pending} loadingText="Adding member...">
                Add to team
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
