'use client';

import { toast } from 'sonner';
import { buildPublicTeamUrl } from '@/lib/invites/utils';
import { Button } from '@/components/ui/button';
import { Copy, Share2 } from 'lucide-react';

export function PublicTeamShare({
  teamId,
  isPublic,
  baseUrl,
}: {
  teamId: string;
  isPublic: boolean;
  baseUrl: string;
}) {
  const publicUrl = buildPublicTeamUrl(baseUrl, teamId);

  const copyPublic = async () => {
    if (!isPublic) {
      toast.error('Enable public sharing in team settings first');
      return;
    }
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success('Public team link copied');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  const share = async () => {
    if (!isPublic) {
      toast.error('Enable public sharing first');
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Team expenses — Expensea',
          url: publicUrl,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      await copyPublic();
    }
  };

  return (
    <div className="flex flex-col gap-2 pt-2 sm:flex-row">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!isPublic}
        onClick={copyPublic}
      >
        <Copy className="size-4" />
        Copy public link
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!isPublic}
        onClick={share}
      >
        <Share2 className="size-4" />
        Share
      </Button>
    </div>
  );
}
