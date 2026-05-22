// User types
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Team types
export interface Team {
  id: string;
  name: string;
  description: string;
  members: User[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Entry types
export interface Entry {
  id: string;
  description: string;
  amount: number;
  category: 'Food' | 'Transport' | 'Entertainment' | 'Beverages' | 'Other';
  paidBy: string;
  participants: string[];
  teamId: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Settlement types
export interface Settlement {
  id: string;
  from: string;
  to: string;
  amount: number;
  teamId: string;
  resolved: boolean;
  createdAt: Date;
  resolvedAt?: Date;
}

// Balance types
export interface Balance {
  userId: string;
  teamId: string;
  total: number; // positive = owed to user, negative = user owes
  paid: number;
  owes: number;
}

// Analytics types
export interface MonthlySummary {
  month: string;
  amount: number;
  count: number;
}

export interface CategorySummary {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

// Form types
export interface CreateEntryInput {
  description: string;
  amount: number;
  category: 'Food' | 'Transport' | 'Entertainment' | 'Beverages' | 'Other';
  participants: string[];
  date: Date;
}

export interface CreateTeamInput {
  name: string;
  description: string;
  members: string[];
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  avatar?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
