'use client';

import {
  createContext,
  useCallback,
  useMemo,
  useOptimistic,
  useTransition,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { updateTeamCurrency } from '@/lib/actions/teams';
import {
  formatCurrencyAmount,
  getCurrency,
  normalizeCurrencyCode,
  type CurrencyCode,
  type CurrencyDefinition,
} from '@/lib/currency';

type CurrencyContextValue = {
  currency: CurrencyDefinition;
  currencyCode: CurrencyCode;
  canEdit: boolean;
  isPending: boolean;
  format: (amount: number) => string;
  setCurrency: (code: CurrencyCode) => void;
};

export const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({
  children,
  initialCode,
  canEdit = false,
}: {
  children: ReactNode;
  initialCode: string;
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const normalized = normalizeCurrencyCode(initialCode);
  const [optimisticCode, setOptimisticCode] = useOptimistic(normalized);

  const currency = useMemo(() => getCurrency(optimisticCode), [optimisticCode]);

  const format = useCallback(
    (amount: number) => formatCurrencyAmount(amount, optimisticCode),
    [optimisticCode]
  );

  const setCurrency = useCallback(
    (code: CurrencyCode) => {
      if (!canEdit || code === optimisticCode) return;
      startTransition(async () => {
        setOptimisticCode(code);
        const result = await updateTeamCurrency(code);
        if (result?.error) {
          toast.error(result.error);
          router.refresh();
          return;
        }
        toast.success('Currency updated successfully.');
        router.refresh();
      });
    },
    [canEdit, optimisticCode, router, setOptimisticCode]
  );

  const value = useMemo(
    () => ({
      currency,
      currencyCode: optimisticCode,
      canEdit,
      isPending: pending,
      format,
      setCurrency,
    }),
    [currency, optimisticCode, canEdit, pending, format, setCurrency]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}
