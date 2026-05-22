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
