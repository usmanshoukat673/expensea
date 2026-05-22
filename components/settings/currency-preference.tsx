'use client';

import { Label } from '@/components/ui/label';
import { CurrencySelector } from '@/components/ui/currency-selector';
import { useCurrency } from '@/hooks/use-currency';
import type { CurrencyCode } from '@/lib/currency';

export function CurrencyPreference() {
  const { currencyCode, canEdit, isPending, setCurrency } = useCurrency();

  return (
    <div className="space-y-3">
      <Label>Currency</Label>
      <CurrencySelector
        value={currencyCode}
        onChange={(code) => setCurrency(code as CurrencyCode)}
        disabled={!canEdit}
        pending={isPending}
      />
      <p className="text-xs text-muted-foreground">
        {canEdit
          ? 'Applies across dashboard, entries, analytics, exports, and public pages. Saved instantly.'
          : 'Team currency is managed by workspace admins in Team settings.'}
      </p>
    </div>
  );
}
