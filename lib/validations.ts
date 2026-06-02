import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const signupSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const profileSchema = z.object({
  fullName: z.string().min(2, 'Name is required').max(100),
  avatarUrl: z.string().url().optional().or(z.literal('')),
});

export const teamNameSchema = z.object({
  name: z.string().min(2, 'Team name is required').max(50),
});

export const inviteSchema = z.object({
  email: z.string().email('Invalid email'),
  role: z.enum(['admin', 'viewer']),
});

export const lunchEntrySchema = z.object({
  userId: z.string().uuid('Select a member'),
  amount: z.coerce.number().positive('Amount must be positive'),
  lunchDate: z.string().min(1, 'Date is required'),
  notes: z.string().max(500).optional(),
  paymentStatus: z.enum(['paid', 'unpaid']),
  categoryId: z.string().uuid().optional().nullable(),
  isShared: z.coerce.boolean().optional(),
  splitType: z.enum(['none', 'equal', 'selected']).optional(),
  participantIds: z.array(z.string().uuid()).optional(),
});

export const rejectionSchema = z.object({
  reason: z.string().min(3, 'Reason is required').max(500),
});

export const reimbursementSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  reimbursedAt: z.string().min(1, 'Date is required'),
  notes: z.string().max(500).optional(),
});

export const recurringExpenseSchema = z
  .object({
    title: z.string().min(2, 'Title is required').max(120),
    amount: z.coerce.number().positive('Amount must be positive'),
    categoryId: z.string().uuid('Select a category'),
    frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
    intervalValue: z.coerce.number().int().positive('Interval must be at least 1').max(365),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().optional().nullable(),
  })
  .refine((d) => !d.endDate || d.endDate >= d.startDate, {
    message: 'End date must be after the start date',
    path: ['endDate'],
  });

export const categorySchema = z.object({
  name: z.string().min(2, 'Name is required').max(50),
  icon: z.string().min(1).max(30),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color'),
  description: z.string().max(200).optional(),
});

export const settlementSchema = z.object({
  payerUserId: z.string().uuid(),
  receiverUserId: z.string().uuid(),
  amount: z.coerce.number().positive('Amount must be positive'),
  note: z.string().max(500).optional(),
  proofUrl: z.string().url().optional().or(z.literal('')),
});

export const onboardingNameSchema = z.object({
  fullName: z.string().min(2, 'Name is required').max(100),
});

export const joinTeamSchema = z.object({
  token: z.string().min(10, 'Invalid invitation token'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type LunchEntryInput = z.infer<typeof lunchEntrySchema>;
export type ReimbursementInput = z.infer<typeof reimbursementSchema>;
export type RecurringExpenseInput = z.infer<typeof recurringExpenseSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export const budgetSchema = z
  .object({
    type: z.enum(['monthly', 'category']),
    categoryId: z.string().uuid().optional().nullable(),
    amount: z.coerce.number().positive('Amount must be positive'),
    month: z.string().optional().nullable(),
  })
  .refine(
    (d) => d.type !== 'category' || (d.categoryId && d.categoryId.length > 0),
    { message: 'Select a category', path: ['categoryId'] },
  );

export type SettlementFormInput = z.infer<typeof settlementSchema>;
export type BudgetInput = z.infer<typeof budgetSchema>;
