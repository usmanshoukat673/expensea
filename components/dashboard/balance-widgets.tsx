'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ArrowDownLeft, ArrowUpRight, Scale } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCurrency } from '@/hooks/use-currency';
import type { SettlementWithProfiles } from '@/lib/database.types';

export function DashboardBalanceWidgets({
  pendingTotal,
  youOwe,
  youReceive,
  recentSettlements,
}: {
  pendingTotal: number;
  youOwe: number;
  youReceive: number;
  recentSettlements: SettlementWithProfiles[];
}) {
  const { format } = useCurrency();

  return (
    <div className="grid lg:grid-cols-4 gap-4">
      <Card className="hover-lift soft-shadow">
        <CardHeader className="pb-2">
          <CardDescription>Pending balances</CardDescription>
          <CardTitle className="text-xl">{format(pendingTotal)}</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" asChild>
            <Link href="/settlements">
              <Scale className="w-4 h-4 mr-1" />
              Settlements
            </Link>
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2 flex flex-row justify-between">
          <CardDescription>You owe</CardDescription>
          <ArrowDownLeft className="w-4 h-4 text-amber-600" />
        </CardHeader>
        <CardContent>
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
            {format(youOwe)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2 flex flex-row justify-between">
          <CardDescription>You receive</CardDescription>
          <ArrowUpRight className="w-4 h-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">
            {format(youReceive)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Recent settlements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[120px] overflow-y-auto">
          {recentSettlements.length === 0 ? (
            <p className="text-xs text-muted-foreground">None yet</p>
          ) : (
            recentSettlements.slice(0, 4).map((s) => (
              <div key={s.id} className="text-xs flex justify-between gap-2">
                <span className="truncate">
                  {s.payer?.full_name} → {s.receiver?.full_name}
                </span>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {s.status}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
