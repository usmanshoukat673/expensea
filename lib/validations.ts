import { z } from 'zod';
import {
  FINANCIAL_AMOUNT_INVALID_MESSAGE,
  FINANCIAL_AMOUNT_MAX,
  FINANCIAL_AMOUNT_MAX_MESSAGE,
  FINANCIAL_AMOUNT_POSITIVE_MESSAGE,
  FINANCIAL_AMOUNT_REQUIRED_MESSAGE,
} from '@/lib/financial-input';

const requiredString = (label: string, min = 1, max?: number) => {
  const schema = z.string().trim().min(min, min === 1 ? 'This field is required' : `${label} is required`);
  return max ? schema.max(max, `${label} is too long`) : schema;
};

const moneyAmountSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() : value),
  z
    .coerce
    .number({
      invalid_type_error: FINANCIAL_AMOUNT_INVALID_MESSAGE,
      required_error: FINANCIAL_AMOUNT_REQUIRED_MESSAGE,
    })
    .finite(FINANCIAL_AMOUNT_INVALID_MESSAGE)
    .positive(FINANCIAL_AMOUNT_POSITIVE_MESSAGE)
    .max(FINANCIAL_AMOUNT_MAX, FINANCIAL_AMOUNT_MAX_MESSAGE)
    .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8, {
      message: 'Use up to 2 decimal places',
    }),
);

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'This field is required').email('Enter a valid email address'),
  password: z.string().min(1, 'This field is required').min(6, 'Password must be at least 6 characters'),
});

export const signupSchema = z.object({
  fullName: requiredString('Name', 2, 100),
  email: z.string().trim().min(1, 'This field is required').email('Enter a valid email address'),
  password: z.string().min(1, 'This field is required').min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'This field is required'),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, 'This field is required').email('Enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(1, 'This field is required').min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'This field is required'),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const profileSchema = z.object({
  fullName: requiredString('Name', 2, 100),
  avatarUrl: z.string().url('Enter a valid URL').optional().or(z.literal('')),
});

export const teamNameSchema = z.object({
  name: requiredString('Team name', 2, 50),
});

export const inviteSchema = z.object({
  email: z.string().trim().min(1, 'This field is required').email('Enter a valid email address'),
  role: z.enum(['admin', 'viewer']),
});

export const lunchEntrySchema = z.object({
  userId: z.string().uuid('Select a member'),
  amount: moneyAmountSchema,
  lunchDate: z.string().min(1, 'Date is required'),
  notes: z.string().max(500).optional(),
  paymentStatus: z.enum(['paid', 'unpaid']),
  categoryId: z.string().uuid().optional().nullable(),
  isShared: z.coerce.boolean().optional(),
  splitType: z.enum(['none', 'equal', 'selected']).optional(),
  participantIds: z.array(z.string().uuid()).optional(),
  assignmentType: z.enum(['team', 'individual']).optional(),
  assignedUserId: z.string().uuid().optional().nullable(),
}).refine((d) => d.assignmentType !== 'individual' || !!d.assignedUserId, {
  message: 'Select an assigned member',
  path: ['assignedUserId'],
}).refine((d) => d.assignmentType !== 'individual' || !d.isShared, {
  message: 'Individual expenses cannot use shared split options',
  path: ['isShared'],
}).refine((d) => !d.isShared || (d.participantIds?.length ?? 0) > 0, {
  message: 'Select at least one participant',
  path: ['participantIds'],
});

export const rejectionSchema = z.object({
  reason: z.string().min(3, 'Reason is required').max(500),
});

export const reimbursementSchema = z.object({
  amount: moneyAmountSchema,
  reimbursedAt: z.string().min(1, 'Date is required'),
  notes: z.string().max(500).optional(),
});

export const recurringExpenseSchema = z
  .object({
    title: requiredString('Title', 2, 120),
    amount: moneyAmountSchema,
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
  name: requiredString('Name', 2, 50),
  icon: z.string().min(1).max(30),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color'),
  description: z.string().max(200).optional(),
});

export const settlementSchema = z.object({
  payerUserId: z.string().uuid(),
  receiverUserId: z.string().uuid(),
  amount: moneyAmountSchema,
  note: z.string().max(500, 'Note is too long').optional(),
  proofUrl: z.string().url('Enter a valid URL').optional().or(z.literal('')),
});

export const onboardingNameSchema = z.object({
  fullName: requiredString('Name', 2, 100),
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
    amount: moneyAmountSchema,
    month: z.string().optional().nullable(),
  })
  .refine(
    (d) => d.type !== 'category' || (d.categoryId && d.categoryId.length > 0),
    { message: 'Select a category', path: ['categoryId'] },
  );

export type SettlementFormInput = z.infer<typeof settlementSchema>;
export type BudgetInput = z.infer<typeof budgetSchema>;
