'use client';

import { useState, useTransition } from 'react';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { InviteLinkSection } from '@/components/team/invite-link-section';

export function InviteMemberDialog() {
  const [pending, startTransition] = useTransition();
  const [role, setRole] = useState<'admin' | 'viewer'>('viewer');
  const [expiry, setExpiry] = useState<InviteExpiryOption>('7d');
  const [open, setOpen] = useState(false);

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
              className="space-y-4"
              action={(fd) =>
                startTransition(async () => {
                  fd.set('role', role);
                  fd.set('expiry', expiry);
                  const r = await sendEmailInvite(fd);
                  if (r?.error) toast.error(r.error);
                  else toast.success('Email invitation created');
                })
              }
            >
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  name="email"
                  type="email"
                  required
                  placeholder="colleague@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
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
                <Label>Invitation expires</Label>
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
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? <Spinner /> : null}
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
              className="space-y-4 pt-2"
              action={(fd) =>
                startTransition(async () => {
                  const r = await addMemberByEmail(fd);
                  if (r?.error) toast.error(r.error);
                  else {
                    toast.success('Member added');
                    setOpen(false);
                  }
                })
              }
            >
              <div className="space-y-2">
                <Label htmlFor="manual-email">Existing user email</Label>
                <Input id="manual-email" name="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
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
              <Button type="submit" variant="secondary" className="w-full" disabled={pending}>
                Add to team
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
