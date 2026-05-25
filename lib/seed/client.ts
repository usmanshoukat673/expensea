import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';

/** Service-role client for seed scripts (loose typing for bulk inserts). */
export type SeedAdmin = SupabaseClient;

export function loadEnv(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dotenv = require('dotenv');
    const path = require('path');
    const root = path.resolve(process.cwd());
    dotenv.config({ path: path.join(root, '.env.local') });
    dotenv.config({ path: path.join(root, '.env') });
  } catch {
    /* dotenv optional if vars already exported */
  }
}

export function createSeedAdmin(): SeedAdmin {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add them to .env.local',
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: {
      transport: ws as unknown as typeof WebSocket,
    },
  });
}
