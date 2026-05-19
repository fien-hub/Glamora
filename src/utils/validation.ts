/**
 * Validation utilities for form inputs
 */

/**
 * Validate email address format
 * Returns true if email is valid, false otherwise
 */
export const validateEmail = (email: string): boolean => {
  if (!email) return false;
  
  // RFC 5322 compliant email regex (simplified version)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  return emailRegex.test(email.trim());
};

/**
 * Get email validation error message
 */
export const getEmailError = (email: string): string | null => {
  if (!email) return 'Email is required';
  if (!validateEmail(email)) return 'Please enter a valid email address';
  return null;
};

/**
 * Validate password strength
 * Returns strength level: 'weak', 'medium', 'strong'
 */
export const getPasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
  if (!password) return 'weak';
  
  let strength = 0;
  
  // Length check
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  
  // Contains lowercase
  if (/[a-z]/.test(password)) strength++;
  
  // Contains uppercase
  if (/[A-Z]/.test(password)) strength++;
  
  // Contains number
  if (/[0-9]/.test(password)) strength++;
  
  // Contains special character
  if (/[^a-zA-Z0-9]/.test(password)) strength++;
  
  if (strength <= 2) return 'weak';
  if (strength <= 4) return 'medium';
  return 'strong';
};

/**
 * Get password validation error message
 */
export const getPasswordError = (password: string): string | null => {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  return null;
};

/**
 * Validate phone number format (basic validation)
 */
export const validatePhone = (phone: string): boolean => {
  if (!phone) return true; // Phone is optional
  
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Should have at least 10 digits (most countries)
  return digitsOnly.length >= 10;
};

/**
 * Get phone validation error message
 */
export const getPhoneError = (phone: string): string | null => {
  if (!phone) return null; // Phone is optional
  if (!validatePhone(phone)) return 'Please enter a valid phone number';
  return null;
};

/**
 * Validate name (first name or last name)
 */
export const validateName = (name: string): boolean => {
  if (!name) return false;
  
  // Should contain only letters, spaces, hyphens, and apostrophes
  const nameRegex = /^[a-zA-Z\s'-]+$/;
  
  return nameRegex.test(name.trim()) && name.trim().length >= 2;
};

/**
 * Get name validation error message
 */
export const getNameError = (name: string, fieldName: string = 'Name'): string | null => {
  if (!name) return `${fieldName} is required`;
  if (!validateName(name)) return `Please enter a valid ${fieldName.toLowerCase()}`;
  if (name.trim().length < 2) return `${fieldName} must be at least 2 characters`;
  return null;
};

/**
 * Validate passwords match
 */
export const validatePasswordsMatch = (password: string, confirmPassword: string): boolean => {
  return password === confirmPassword;
};

/**
 * Get password match error message
 */
export const getPasswordMatchError = (password: string, confirmPassword: string): string | null => {
  if (!confirmPassword) return 'Please confirm your password';
  if (!validatePasswordsMatch(password, confirmPassword)) return 'Passwords do not match';
  return null;
};

