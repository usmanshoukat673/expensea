#!/usr/bin/env npx tsx
/**
 * Seed Expensea with realistic demo data.
 *
 * Usage:
 *   npm run db:seed
 *   npm run db:seed -- --force
 *   npm run db:seed -- --reset
 */
import { runSeed } from '@/lib/seed';

const args = process.argv.slice(2);

runSeed({
  reset: args.includes('--reset'),
  force: args.includes('--force'),
  deleteUsers: args.includes('--delete-users'),
}).catch((err) => {
  console.error('[seed] failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
