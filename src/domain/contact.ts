/**
 * What the message is about.
 *
 * `photo` is somebody asking for a photograph of themselves or their child to be taken down.
 * It is marked rather than left to read like any other message, because it is the one promise
 * on the site with a person waiting behind it — and because an inbox where it arrives between a
 * parking question and a request to sing is an inbox where it waits a week.
 */
export type ContactKind = 'general' | 'photo'

export type ContactInput = {
  name: string
  email: string
  subject: string
  message: string
  kind?: ContactKind
}

export type ContactMessage = ContactInput & {
  id: string
  /** ISO 8601 timestamp */
  createdAt: string
  /** Who on the committee dealt with it. Absent means nobody has yet. */
  handledBy?: string
  /**
   * What was done about it.
   *
   * Only asked for on a takedown, where "handled" on its own does not say whether the
   * photograph actually came out of the bucket — which is the only part that matters.
   */
  handledNote?: string
}

/**
 * What the site promises, in one place so the gallery, the form and the inbox cannot each
 * promise something slightly different.
 */
export const TAKEDOWN_PROMISE = 'within three days, and you do not have to give a reason'

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
