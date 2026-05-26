import Link from 'next/link';
import { cn } from '@/lib/utils';

type BrandLogoProps = {
  href?: string;
  size?: 'sm' | 'md';
  showName?: boolean;
  className?: string;
  nameClassName?: string;
};

const markSizes = {
  sm: 'size-8 rounded-lg text-sm',
  md: 'size-10 rounded-xl text-base',
};

const nameSizes = {
  sm: 'text-sm',
  md: 'text-lg',
};

function BrandMark({ size = 'sm' }: Pick<BrandLogoProps, 'size'>) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center bg-accent font-bold leading-none text-accent-foreground',
        markSizes[size],
      )}
    >
      EX
    </span>
  );
}

export function BrandLogo({
  href,
  size = 'sm',
  showName = true,
  className,
  nameClassName,
}: BrandLogoProps) {
  const content = (
    <>
      <BrandMark size={size} />
      {showName && (
        <span className={cn('font-semibold text-foreground', nameSizes[size], nameClassName)}>
          Expensea
        </span>
      )}
    </>
  );

  const classes = cn('inline-flex min-w-0 items-center gap-2', size === 'md' && 'gap-3', className);

  if (href) {
    return (
      <Link href={href} className={classes} aria-label="Expensea home">
        {content}
      </Link>
    );
  }

  return (
    <div className={classes} aria-label="Expensea">
      {content}
    </div>
  );
}
