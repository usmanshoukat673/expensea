'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useMounted } from '@/hooks/use-mounted';

const options = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

export function ThemePreference() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const current = theme ?? 'system';

  return (
    <div className="space-y-3">
      <Label>Theme</Label>
      <div className="grid grid-cols-3 gap-2">
        {options.map((opt) => {
          const Icon = opt.icon;
          const active = mounted && current === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={!mounted}
              onClick={() => setTheme(opt.value)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border px-3 py-3 text-sm font-medium transition-colors',
                'hover:bg-accent/10 dark:hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? 'border-accent bg-accent/10 text-foreground'
                  : 'border-border bg-card text-muted-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {opt.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">Saved automatically and applied across the app</p>
    </div>
  );
}
