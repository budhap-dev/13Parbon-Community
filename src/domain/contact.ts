export type ContactInput = {
  name: string
  email: string
  subject: string
  message: string
}

export type ContactMessage = ContactInput & {
  id: string
  /** ISO 8601 timestamp */
  createdAt: string
}

export type ContactErrors = Partial<Record<keyof ContactInput, string>>

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Field-level validation shared by the form and the API boundary. Empty object means valid. */
export function validateContact(input: ContactInput): ContactErrors {
  const errors: ContactErrors = {}
  if (input.name.trim().length < 2) errors.name = 'Tell us your name.'
  if (!EMAIL.test(input.email.trim())) errors.email = 'Enter an email address we can reply to.'
  if (input.subject.trim().length === 0) errors.subject = 'Give your message a subject.'
  if (input.message.trim().length < 10) errors.message = 'Say a little more, at least a sentence.'
  return errors
}

export function isValidContact(input: ContactInput): boolean {
  return Object.keys(validateContact(input)).length === 0
}
