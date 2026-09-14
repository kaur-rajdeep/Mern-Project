import { z } from 'zod';

// ============================================================
// Shared Zod schemas — reusable across all backend validators
// ============================================================

/** Accepts digits, spaces, +, -, (, ) — 7 to 20 characters. */
const phoneSchema = z
  .string()
  .max(20, 'Phone number must not exceed 20 characters.')
  .regex(/^[0-9\s+\-().]{7,20}$/, 'Phone number may only contain digits, spaces, +, -, ( or ) and be 7–20 characters.')
  .optional()
  .or(z.literal('')); // allow empty string

/** Letters, spaces, hyphens, apostrophes, dots — 2 to 100 chars. */
const fullNameSchema = z
  .string()
  .min(2, 'Full name must be at least 2 characters.')
  .max(100, 'Full name must not exceed 100 characters.')
  .regex(/^[a-zA-Z\s\-''.]+$/, 'Full name may only contain letters, spaces, hyphens, apostrophes, or dots.');

/** Standard email format. */
const emailSchema = z
  .string()
  .email('Please provide a valid email address.')
  .max(255, 'Email address is too long.');

/**
 * Password strength: 8+ chars, 1 uppercase, 1 digit.
 * Used for user-facing change-password flows.
 */
const strongPasswordSchema = z
  .string()
  .min(8, 'New password must be at least 8 characters.')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
  .regex(/[0-9]/, 'Password must contain at least one number.');

/** Minimum password for admin-created accounts (6 chars). */
const adminPasswordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters if provided.')
  .optional()
  .or(z.literal(''));

/** Company name: 2–150 chars. */
const companyNameSchema = z
  .string()
  .min(2, 'Company name must be at least 2 characters.')
  .max(150, 'Company name must not exceed 150 characters.')
  .optional()
  .or(z.literal(''));

// ============================================================
// Exported Validation Schemas
// ============================================================

/** Schema for POST /auth/login */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required.'),
});

/** Schema for POST /auth/forgot-password */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

/** Schema for POST /auth/change-password */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: strongPasswordSchema,
});

/** Schema for PUT /auth/profile */
export const updateProfileSchema = z.object({
  fullName: fullNameSchema.optional(),
  phoneNumber: phoneSchema,
  companyName: companyNameSchema,
  companyNumber: z.string().max(100).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
});

/** Schema for POST /admin/customers */
export const createCustomerSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  phoneNumber: phoneSchema,
  companyName: z
    .string()
    .min(2, 'Company/organization name must be at least 2 characters.')
    .max(150, 'Company name must not exceed 150 characters.'),
  companyNumber: z.string().max(100).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  password: adminPasswordSchema,
});

/** Schema for POST /admin/assessors */
export const createAssessorSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  phoneNumber: phoneSchema,
  userType: z.number().int().min(2).max(4),
  password: adminPasswordSchema,
});

// ============================================================
// Validation helper — call in controllers with any Zod schema
// ============================================================

/**
 * Validates `data` against `schema`.
 * Returns `{ ok: true }` on success, or `{ ok: false, message: string }` on failure.
 */
export function validate<T>(schema: z.ZodType<T>, data: unknown): { ok: true; data: T } | { ok: false; message: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  // Collect the first error message across all fields
  const firstError = result.error.errors[0];
  const fieldLabel = firstError.path.length > 0 ? `${firstError.path.join('.')}: ` : '';
  return { ok: false, message: `${fieldLabel}${firstError.message}` };
}
