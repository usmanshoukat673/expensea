'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { updateTeamSettings } from '@/lib/actions/teams';
import type { Team } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { CurrencySelector } from '@/components/ui/currency-selector';
import { useCurrency } from '@/hooks/use-currency';
import type { CurrencyCode } from '@/lib/currency';
import { PublicTeamShare } from '@/components/team/public-team-share';

export function TeamSettingsForm({ team }: { team: Team }) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const [pending, startTransition] = useTransition();
  const { currencyCode, setCurrency, isPending: currencyPending } = useCurrency();

  return (
    <Card>
      <CardContent className="pt-6">
        <form
          action={(fd) =>
            startTransition(async () => {
              const r = await updateTeamSettings(fd);
              if (r?.error) toast.error(r.error);
              else toast.success('Settings saved');
            })
          }
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Workspace name</Label>
            <Input id="name" name="name" defaultValue={team.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brandName">App branding</Label>
            <Input
              id="brandName"
              name="brandName"
              defaultValue={team.brand_name ?? ''}
              placeholder="Display name on public pages"
            />
          </div>
          <input type="hidden" name="currency" value={currencyCode} />
          <div className="space-y-2">
            <Label>Currency</Label>
            <CurrencySelector
              value={currencyCode}
              onChange={(code) => setCurrency(code as CurrencyCode)}
              pending={currencyPending}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPublic"
              name="isPublic"
              defaultChecked={team.is_public}
              className="rounded border-border"
            />
            <Label htmlFor="isPublic" className="font-normal cursor-pointer">
              Enable public sharing
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showCategoryAnalyticsOnPublic"
              name="showCategoryAnalyticsOnPublic"
              defaultChecked={team.show_category_analytics_on_public !== false}
              className="rounded border-border"
            />
            <Label htmlFor="showCategoryAnalyticsOnPublic" className="font-normal cursor-pointer">
              Show category analytics on public page
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showBalancesOnPublic"
              name="showBalancesOnPublic"
              defaultChecked={team.show_balances_on_public}
              className="rounded border-border"
            />
            <Label htmlFor="showBalancesOnPublic" className="font-normal cursor-pointer">
              Show team balances on public page
            </Label>
          </div>
          <p className="text-xs text-muted-foreground break-all">
            Public: /public/team/{team.id} · /share/{team.slug}
          </p>
          <PublicTeamShare teamId={team.id} isPublic={team.is_public} baseUrl={baseUrl} />
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner className="mr-2" /> : null}
            Save settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
