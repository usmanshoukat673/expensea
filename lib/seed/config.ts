/** Demo seed marker — teams use these fixed slugs for idempotent reset/reseed */
export const SEED_VERSION = 'expensea-demo-v1';

export const DEMO_PASSWORD = 'password123';

export const DEMO_TEAM_SLUGS = [
  'expensea-hq',
  'remote-team',
  'family-budget',
  'startup-operations',
  'friends-trip',
] as const;

export type DemoTeamSlug = (typeof DEMO_TEAM_SLUGS)[number];

export type DemoUserDef = {
  email: string;
  fullName: string;
  joinedDaysAgo: number;
};

export const DEMO_USERS: DemoUserDef[] = [
  { email: 'owner@expensea.app', fullName: 'Usman Shoukat', joinedDaysAgo: 200 },
  { email: 'admin@expensea.app', fullName: 'Ali Raza', joinedDaysAgo: 180 },
  { email: 'viewer@expensea.app', fullName: 'Sarah Ahmed', joinedDaysAgo: 150 },
  { email: 'ahmed.khan@expensea.app', fullName: 'Ahmed Khan', joinedDaysAgo: 120 },
  { email: 'hamza.malik@expensea.app', fullName: 'Hamza Malik', joinedDaysAgo: 90 },
  { email: 'fatima.noor@expensea.app', fullName: 'Fatima Noor', joinedDaysAgo: 75 },
  { email: 'bilal.hassan@expensea.app', fullName: 'Bilal Hassan', joinedDaysAgo: 60 },
];

export type TeamMemberDef = {
  email: string;
  role: 'owner' | 'admin' | 'viewer';
};

export type DemoTeamDef = {
  name: string;
  slug: DemoTeamSlug;
  brandName?: string;
  currency: string;
  isPublic: boolean;
  showBalancesOnPublic: boolean;
  showCategoryAnalyticsOnPublic: boolean;
  ownerEmail: string;
  createdDaysAgo: number;
  expenseTarget: number;
  members: TeamMemberDef[];
};

export const DEMO_TEAMS: DemoTeamDef[] = [
  {
    name: 'Expensea HQ',
    slug: 'expensea-hq',
    brandName: 'Expensea',
    currency: 'PKR',
    isPublic: true,
    showBalancesOnPublic: true,
    showCategoryAnalyticsOnPublic: true,
    ownerEmail: 'owner@expensea.app',
    createdDaysAgo: 185,
    expenseTarget: 95,
    members: [
      { email: 'owner@expensea.app', role: 'owner' },
      { email: 'admin@expensea.app', role: 'admin' },
      { email: 'ahmed.khan@expensea.app', role: 'admin' },
      { email: 'viewer@expensea.app', role: 'viewer' },
      { email: 'hamza.malik@expensea.app', role: 'viewer' },
      { email: 'fatima.noor@expensea.app', role: 'viewer' },
    ],
  },
  {
    name: 'Remote Team',
    slug: 'remote-team',
    currency: 'USD',
    isPublic: false,
    showBalancesOnPublic: false,
    showCategoryAnalyticsOnPublic: true,
    ownerEmail: 'admin@expensea.app',
    createdDaysAgo: 120,
    expenseTarget: 55,
    members: [
      { email: 'admin@expensea.app', role: 'owner' },
      { email: 'owner@expensea.app', role: 'admin' },
      { email: 'hamza.malik@expensea.app', role: 'admin' },
      { email: 'bilal.hassan@expensea.app', role: 'viewer' },
    ],
  },
  {
    name: 'Family Budget',
    slug: 'family-budget',
    currency: 'PKR',
    isPublic: false,
    showBalancesOnPublic: false,
    showCategoryAnalyticsOnPublic: true,
    ownerEmail: 'fatima.noor@expensea.app',
    createdDaysAgo: 90,
    expenseTarget: 45,
    members: [
      { email: 'fatima.noor@expensea.app', role: 'owner' },
      { email: 'viewer@expensea.app', role: 'admin' },
      { email: 'bilal.hassan@expensea.app', role: 'viewer' },
    ],
  },
  {
    name: 'Startup Operations',
    slug: 'startup-operations',
    currency: 'PKR',
    isPublic: true,
    showBalancesOnPublic: true,
    showCategoryAnalyticsOnPublic: true,
    ownerEmail: 'ahmed.khan@expensea.app',
    createdDaysAgo: 60,
    expenseTarget: 40,
    members: [
      { email: 'ahmed.khan@expensea.app', role: 'owner' },
      { email: 'owner@expensea.app', role: 'admin' },
      { email: 'ali.raza@expensea.app', role: 'admin' },
      { email: 'hamza.malik@expensea.app', role: 'viewer' },
    ],
  },
  {
    name: 'Friends Trip',
    slug: 'friends-trip',
    currency: 'PKR',
    isPublic: true,
    showBalancesOnPublic: true,
    showCategoryAnalyticsOnPublic: true,
    ownerEmail: 'hamza.malik@expensea.app',
    createdDaysAgo: 30,
    expenseTarget: 35,
    members: [
      { email: 'hamza.malik@expensea.app', role: 'owner' },
      { email: 'bilal.hassan@expensea.app', role: 'admin' },
      { email: 'viewer@expensea.app', role: 'viewer' },
      { email: 'fatima.noor@expensea.app', role: 'viewer' },
    ],
  },
];

/** Fix startup team member email (admin@ not ali.raza@) */
DEMO_TEAMS[3].members[2] = { email: 'admin@expensea.app', role: 'admin' };

export const EXPENSE_NOTES = [
  'Team lunch at office cafeteria',
  'Monthly internet bill',
  'Office supplies — stationery',
  'Travel reimbursement — client visit',
  'Coffee meeting with vendor',
  'Uber ride to airport',
  'Electricity bill share',
  'Team dinner celebration',
  'Software subscription',
  'Parking fee',
  'Grocery run for pantry',
  'Friday team brunch',
  'Conference registration',
  'Printer ink and paper',
  'Mobile data top-up',
];

export const CATEGORY_SLUG_WEIGHTS: Record<string, number> = {
  food: 0.28,
  travel: 0.14,
  office: 0.16,
  internet: 0.08,
  utilities: 0.1,
  entertainment: 0.12,
  miscellaneous: 0.12,
};

export const BUDGETS_BY_TEAM: Record<
  DemoTeamSlug,
  {
    monthly: number;
    categories: Partial<Record<string, number>>;
    month?: string | null;
  }[]
> = {
  'expensea-hq': [
    { monthly: 150000, categories: { food: 25000, travel: 10000, office: 20000 }, month: null },
    {
      monthly: 140000,
      categories: { food: 22000, travel: 9000 },
      month: monthOffset(-1),
    },
  ],
  'remote-team': [
    { monthly: 5000, categories: { internet: 800, office: 1200 }, month: null },
  ],
  'family-budget': [
    { monthly: 80000, categories: { food: 35000, utilities: 15000 }, month: null },
  ],
  'startup-operations': [
    { monthly: 60000, categories: { office: 15000, travel: 8000 }, month: null },
  ],
  'friends-trip': [
    { monthly: 45000, categories: { travel: 20000, food: 12000, entertainment: 8000 }, month: null },
  ],
};

function monthOffset(delta: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

