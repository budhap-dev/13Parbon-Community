export type MembershipApplicationInput = {
  householdName: string
  contactName: string
  email: string
  phone: string
  adults: number
  children: number
  message: string
}

export type MembershipApplication = MembershipApplicationInput & {
  id: string
  status: 'pending'
  /** ISO 8601 timestamp */
  submittedAt: string
}

export type MembershipErrors = Partial<Record<keyof MembershipApplicationInput, string>>

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Field-level validation shared by the form and the API boundary. Empty object means valid. */
export function validateApplication(input: MembershipApplicationInput): MembershipErrors {
  const errors: MembershipErrors = {}
  if (input.householdName.trim().length < 2) errors.householdName = 'Tell us the family or household name.'
  if (input.contactName.trim().length < 2) errors.contactName = 'Who should we write to?'
  if (!EMAIL.test(input.email.trim())) errors.email = 'Enter an email address we can reply to.'
  if (!Number.isInteger(input.adults) || input.adults < 1) errors.adults = 'At least one adult.'
  if (!Number.isInteger(input.children) || input.children < 0) errors.children = 'Zero or more.'
  return errors
}

export function isValidApplication(input: MembershipApplicationInput): boolean {
  return Object.keys(validateApplication(input)).length === 0
}
