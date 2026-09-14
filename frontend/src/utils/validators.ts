/**
 * Shared validation utilities for all frontend forms.
 * Each function returns an error string, or an empty string if valid.
 */

/** Validates that a value is not empty/whitespace. */
export const validateRequired = (value: string, fieldName = 'This field'): string => {
  if (!value || !value.trim()) return `${fieldName} is required.`;
  return '';
};

/**
 * Validates a full name.
 * Rules: 2–100 characters, letters, spaces, hyphens, apostrophes, dots allowed.
 */
export const validateFullName = (value: string): string => {
  if (!value || !value.trim()) return 'Full name is required.';
  if (value.trim().length < 2) return 'Full name must be at least 2 characters.';
  if (value.trim().length > 100) return 'Full name must not exceed 100 characters.';
  const nameRegex = /^[a-zA-Z\s\-''.]+$/;
  if (!nameRegex.test(value.trim())) return 'Full name may only contain letters, spaces, hyphens, apostrophes, or dots.';
  return '';
};

/**
 * Validates an email address format.
 */
export const validateEmail = (value: string): string => {
  if (!value || !value.trim()) return 'Email address is required.';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value.trim())) return 'Please enter a valid email address.';
  return '';
};

/**
 * Validates a phone number (optional field).
 * If provided, must be 7–20 chars: digits, spaces, +, -, (, ) allowed.
 */
export const validatePhone = (value: string): string => {
  if (!value || !value.trim()) return ''; // Optional field – empty is OK
  const phoneRegex = /^[0-9\s+\-().]{7,20}$/;
  if (!phoneRegex.test(value.trim())) {
    return 'Phone number may only contain digits, spaces, +, -, ( or ). Must be 7–20 characters.';
  }
  return '';
};

/**
 * Validates a password for user-facing change-password / create-account flows.
 * Rules: min 8 chars, at least 1 uppercase letter, at least 1 digit.
 */
export const validatePassword = (value: string): string => {
  if (!value) return 'Password is required.';
  if (value.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(value)) return 'Password must contain at least one uppercase letter.';
  if (!/[0-9]/.test(value)) return 'Password must contain at least one number.';
  return '';
};

/**
 * Validates an optional password set by an admin (less strict).
 * If provided, must be at least 6 characters.
 */
export const validateAdminPassword = (value: string): string => {
  if (!value || !value.trim()) return ''; // Optional – empty means auto-generated
  if (value.length < 6) return 'Password must be at least 6 characters if provided.';
  return '';
};

/**
 * Validates password confirmation — must match a given password.
 */
export const validateConfirmPassword = (password: string, confirm: string): string => {
  if (!confirm) return 'Please confirm your new password.';
  if (password !== confirm) return 'Passwords do not match.';
  return '';
};

/**
 * Validates a company name (required for customers).
 * Rules: 2–150 characters.
 */
export const validateCompanyName = (value: string): string => {
  if (!value || !value.trim()) return 'Company/organization name is required.';
  if (value.trim().length < 2) return 'Company name must be at least 2 characters.';
  if (value.trim().length > 150) return 'Company name must not exceed 150 characters.';
  return '';
};

/**
 * Validates an optional company/registration number.
 * Alphanumeric characters, spaces, and dashes allowed.
 */
export const validateCompanyNumber = (value: string): string => {
  if (!value || !value.trim()) return ''; // Optional
  const companyNumRegex = /^[a-zA-Z0-9\s\-/]+$/;
  if (!companyNumRegex.test(value.trim())) {
    return 'Company ID may only contain letters, numbers, spaces, or dashes.';
  }
  return '';
};

/**
 * Validates a date range — the end date must not be before the start date.
 * Accepts ISO date strings (YYYY-MM-DD).
 */
export const validateDateRange = (startDate: string, endDate: string): string => {
  if (!startDate || !endDate) return ''; // Both optional
  if (new Date(endDate) < new Date(startDate)) {
    return 'Completion target date cannot be earlier than the start date.';
  }
  return '';
};
