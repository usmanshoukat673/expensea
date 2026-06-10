'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { deleteTeam } from '@/lib/actions/teams';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

export function DeleteTeamButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-destructive">Delete workspace</CardTitle>
        <CardDescription>Permanently remove all team data. This cannot be undone.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="destructive" disabled={pending} onClick={() => setConfirmOpen(true)}>
          Delete workspace
        </Button>
        <ConfirmationDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Delete workspace?"
          description="All entries, members, settings, and summaries will be permanently deleted. This action cannot be undone."
          confirmLabel="Delete workspace"
          loadingLabel="Deleting workspace..."
          pending={pending}
          onConfirm={() =>
            startTransition(async () => {
              const r = await deleteTeam();
              if (r?.error) toast.error(r.error);
              else {
                toast.success('Workspace deleted');
                router.push('/onboarding');
              }
            })
          }
        />
      </CardContent>
    </Card>
  );
}
