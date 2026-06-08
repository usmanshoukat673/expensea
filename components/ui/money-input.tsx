import * as React from 'react';

import { clampMoneyInput, FINANCIAL_AMOUNT_MAX } from '@/lib/financial-input';
import { Input } from '@/components/ui/input';

type MoneyInputProps = Omit<
  React.ComponentProps<typeof Input>,
  'type' | 'inputMode' | 'min' | 'max' | 'step'
> & {
  maxAmount?: number;
};

const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ maxAmount = FINANCIAL_AMOUNT_MAX, onChange, onPaste, ...props }, ref) => {
    const sanitizeTarget = (target: HTMLInputElement) => {
      const next = clampMoneyInput(target.value, maxAmount);
      if (next !== target.value) {
        target.value = next;
      }
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        onChange={(event) => {
          sanitizeTarget(event.currentTarget);
          onChange?.(event);
        }}
        onPaste={(event) => {
          onPaste?.(event);
          window.requestAnimationFrame(() => sanitizeTarget(event.currentTarget));
        }}
        {...props}
      />
    );
  },
);
MoneyInput.displayName = 'MoneyInput';

export { MoneyInput };
