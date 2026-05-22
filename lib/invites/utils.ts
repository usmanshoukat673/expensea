export type InviteExpiryOption = '1d' | '7d' | '30d' | 'never';

export const INVITE_EXPIRY_OPTIONS: { value: InviteExpiryOption; label: string }[] = [
  { value: '1d', label: '1 Day' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: 'never', label: 'Never expire' },
];

export function expiresAtFromOption(option: InviteExpiryOption): string | null {
  if (option === 'never') return null;
  const d = new Date();
  if (option === '1d') d.setDate(d.getDate() + 1);
  else if (option === '7d') d.setDate(d.getDate() + 7);
  else if (option === '30d') d.setDate(d.getDate() + 30);
  return d.toISOString();
}

export function buildTeamInviteUrl(baseUrl: string, token: string): string {
  const base = baseUrl.replace(/\/$/, '');
  return `${base}/invite/team/${token}`;
}

export function buildPublicTeamUrl(baseUrl: string, teamId: string): string {
  const base = baseUrl.replace(/\/$/, '');
  return `${base}/public/team/${teamId}`;
}

export function isInviteExpired(invite: {
  expires_at: string | null;
  is_active: boolean;
  usage_limit: number | null;
  usage_count: number;
}): boolean {
  if (!invite.is_active) return true;
  if (invite.expires_at && new Date(invite.expires_at) <= new Date()) return true;
  if (invite.usage_limit != null && invite.usage_count >= invite.usage_limit) return true;
  return false;
}
