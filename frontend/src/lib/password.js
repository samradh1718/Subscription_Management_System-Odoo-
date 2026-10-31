// Mirrors the backend rule (app/core/security.py). The backend is the authority;
// this only gives instant feedback while typing.
export const PASSWORD_RULES = [
  { label: 'More than 8 characters', test: (value) => value.length > 8 },
  { label: 'One uppercase letter', test: (value) => /[A-Z]/.test(value) },
  { label: 'One lowercase letter', test: (value) => /[a-z]/.test(value) },
  { label: 'One special character', test: (value) => /[^A-Za-z0-9]/.test(value) },
]

export const isStrongPassword = (value) => PASSWORD_RULES.every((rule) => rule.test(value))

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
