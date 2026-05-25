#!/usr/bin/env npx tsx
/**
 * Remove all demo seed data (keeps auth users by default).
 *
 * Usage:
 *   npm run db:reset
 *   npm run db:reset -- --delete-users
 */
import { createSeedAdmin } from '@/lib/seed/client';
import { resetDemoData } from '@/lib/seed/reset';

const deleteUsers = process.argv.includes('--delete-users');

resetDemoData(createSeedAdmin(), { deleteUsers })
  .then(() => console.log('[reset] complete'))
  .catch((err) => {
    console.error('[reset] failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
