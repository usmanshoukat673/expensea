'use client';

import { useContext } from 'react';
import { CurrencyContext } from '@/components/providers/currency-provider';

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return ctx;
}
