import * as React from 'react';

import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

type RequiredLabelProps = React.ComponentProps<typeof Label> & {
  required?: boolean;
  optional?: boolean;
};

function RequiredLabel({
  children,
  className,
  required = false,
  optional = false,
  ...props
}: RequiredLabelProps) {
  return (
    <Label className={cn('inline-flex items-center gap-1.5', className)} {...props}>
      <span>{children}</span>
      {required ? (
        <span aria-hidden="true" className="text-destructive">
          *
        </span>
      ) : null}
      {optional ? (
        <span className="text-xs font-normal text-muted-foreground">Optional</span>
      ) : null}
    </Label>
  );
}

export { RequiredLabel };
