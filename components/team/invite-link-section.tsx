'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  generateShareableInvite,
  getActiveShareableInvite,
} from '@/lib/actions/team-invites';
import { INVITE_EXPIRY_OPTIONS, type InviteExpiryOption } from '@/lib/invites/utils';
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
import { Spinner } from '@/components/ui/spinner';
import { Copy, Link2, RefreshCw } from 'lucide-react';

export function InviteLinkSection({
  role,
  expiry,
  onRoleChange,
  onExpiryChange,
}: {
  role: 'admin' | 'viewer';
  expiry: InviteExpiryOption;
  onRoleChange?: (r: 'admin' | 'viewer') => void;
  onExpiryChange?: (e: InviteExpiryOption) => void;
}) {
  const [linkUrl, setLinkUrl] = useState('');
  const [loadingLink, setLoadingLink] = useState(true);
  const [pending, startTransition] = useTransition();

  const loadLink = useCallback(() => {
    setLoadingLink(true);
    getActiveShareableInvite()
      .then((r) => {
        if (r.data?.url) setLinkUrl(r.data.url);
        else setLinkUrl('');
      })
      .finally(() => setLoadingLink(false));
  }, []);

  useEffect(() => {
    loadLink();
  }, [loadLink]);

  const copyLink = async () => {
    if (!linkUrl) {
      toast.error('Generate an invite link first');
      return;
    }
    try {
      await navigator.clipboard.writeText(linkUrl);
      toast.success('Invite link copied');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  const generate = () => {
    const fd = new FormData();
    fd.set('role', role);
    fd.set('expiry', expiry);
    startTransition(async () => {
      const r = await generateShareableInvite(fd);
      if (r?.error) toast.error(r.error);
      else if (r.data?.url) {
        setLinkUrl(r.data.url);
        toast.success('New invite link generated');
      }
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-border p-4 bg-muted/20">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Link2 className="w-4 h-4" />
        Shareable invite link
      </div>
      {onExpiryChange && (
        <div className="space-y-2">
          <Label>Link expires</Label>
          <Select value={expiry} onValueChange={(v) => onExpiryChange(v as InviteExpiryOption)}>
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
      )}
      <div className="space-y-2">
        <Label htmlFor="invite-link-url">Invite URL</Label>
        <Input
          id="invite-link-url"
          readOnly
          value={loadingLink ? 'Loading…' : linkUrl || 'No active link — generate one below'}
          className="text-xs font-mono"
        />
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          disabled={pending || loadingLink || !linkUrl}
          onClick={copyLink}
        >
          <Copy className="w-4 h-4 mr-2" />
          Copy invite link
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={pending}
          onClick={generate}
        >
          {pending ? <Spinner className="mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          {linkUrl ? 'Generate new link' : 'Generate link'}
        </Button>
      </div>
    </div>
  );
}
