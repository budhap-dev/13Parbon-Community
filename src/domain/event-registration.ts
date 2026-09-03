/**
 * Registering for an event from the public site. A household that has signed in registers
 * from the portal; anybody else registers here, which is most people for now.
 */
export type EventRegistrationInput = {
  /** Family or household name, as the organisers would call out. */
  householdName: string
  email: string
  phone: string
  adults: number
  children: number
  /** What they would like to help with, if anything. */
  helping: string
  /** Dietary needs, access needs, anything the organisers should know. */
  notes: string
}

export type EventRegistration = EventRegistrationInput & {
  id: string
  eventSlug: string
  /** ISO 8601 timestamp */
  registeredAt: string
}

export type EventRegistrationErrors = Partial<Record<keyof EventRegistrationInput, string>>

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const emptyEventRegistration: EventRegistrationInput = {
  householdName: '',
  email: '',
  phone: '',
  adults: 2,
  children: 0,
  helping: '',
  notes: '',
}

/** Shared by the form and the API boundary. An empty object means it is good to send. */
export function validateEventRegistration(input: EventRegistrationInput): EventRegistrationErrors {
  const errors: EventRegistrationErrors = {}
  if (input.householdName.trim().length < 2) errors.householdName = 'Tell us the family name to expect.'
  if (!EMAIL.test(input.email.trim())) errors.email = 'Enter an email address so we can confirm.'
  if (!Number.isInteger(input.adults) || input.adults < 1) errors.adults = 'At least one adult.'
  if (!Number.isInteger(input.children) || input.children < 0) errors.children = 'Zero or more.'
  if (input.adults + input.children > 30) errors.adults = 'That is a lot of people. Talk to the committee instead.'
  return errors
}

export function isValidEventRegistration(input: EventRegistrationInput): boolean {
  return Object.keys(validateEventRegistration(input)).length === 0
}

/** "3 people" for the confirmation, counting everybody coming. */
export function describeParty(input: Pick<EventRegistrationInput, 'adults' | 'children'>): string {
  const total = input.adults + input.children
  return `${total} ${total === 1 ? 'person' : 'people'}`
}
