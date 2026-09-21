import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { feedbackMethods } from './feedback'

/**
 * A stand-in for PostgREST that records what was asked of it.
 *
 * The queries are the thing worth testing here more than anywhere else in this folder. This
 * is the one table a stranger both writes to and reads from, and the two mistakes that would
 * matter are invisible in a screenshot: asking for a row back after an insert (which turns it
 * into a read the policies refuse, breaking the form on the live site only), and sending a
 * field the database is supposed to decide.
 */
function fakeClient(
  answers: Record<string, unknown> = {},
  errors: Record<string, { code: string; message: string }> = {},
  session: unknown = null,
) {
  const calls: string[] = []
  const sent: Record<string, unknown>[] = []
  const chain = (table: string): Record<string, unknown> => {
    const self: Record<string, unknown> = {}
    for (const method of ['select', 'eq', 'order', 'limit', 'insert', 'update', 'delete']) {
      self[method] = (...args: unknown[]) => {
        if (method === 'insert' || method === 'update') sent.push(args[0] as Record<string, unknown>)
        const shown = (a: unknown) => (typeof a === 'string' ? a : typeof a === 'object' ? JSON.stringify(a) : String(a))
        calls.push(`${table}.${method}(${args.map(shown).join(',')})`)
        return self
      }
    }
    const failure = errors[table] ?? null
    self.maybeSingle = async () => ({ data: failure ? null : (answers[table] ?? null), error: failure })
    self.single = async () => ({ data: failure ? null : (answers[table] ?? null), error: failure })
    self.then = (resolve: (v: unknown) => unknown) => resolve({ data: failure ? [] : (answers[table] ?? []), error: failure })
    return self
  }
  return {
    calls,
    sent,
    client: {
      schema: () => ({ from: (table: string) => chain(table) }),
      auth: { getSession: async () => ({ data: { session } }) },
    } as unknown as SupabaseClient,
  }
}

function api(
  answers: Record<string, unknown> = {},
  errors: Record<string, { code: string; message: string }> = {},
  session: unknown = null,
) {
  const { client, calls, sent } = fakeClient(answers, errors, session)
  return { calls, sent, feedback: feedbackMethods(async () => client) }
}

const row = (over: Record<string, unknown> = {}) => ({
  id: 'fb-1',
  message: 'A lovely evening, and the children loved the dancing.',
  author_name: 'Meera Ghosh',
  signed_in: true,
  status: 'approved',
  reviewed_by: 'An Admin',
  reviewed_at: '2026-04-22T09:10:00.000Z',
  created_at: '2026-04-20T21:35:00.000Z',
  ...over,
})

const admin = { householdId: 'hh-1', role: 'admin' as const }
const member = { householdId: 'hh-2', role: 'member' as const }

describe('what the public page asks for', () => {
  it('asks only for what has been approved', async () => {
    const { feedback, calls } = api({ feedback: [row()] })
    await feedback.listApproved()
    expect(calls.some((call) => call.includes("feedback.eq(status,approved)"))).toBe(true)
  })

  it('turns a row into the shape the pages read, with no address on it', async () => {
    const { feedback } = api({ feedback: [row()] })
    const [piece] = await feedback.listApproved()
    expect(piece).toEqual({
      id: 'fb-1',
      message: 'A lovely evening, and the children loved the dancing.',
      authorName: 'Meera Ghosh',
      signedIn: true,
      status: 'approved',
      reviewedBy: 'An Admin',
      reviewedAt: '2026-04-22T09:10:00.000Z',
      createdAt: '2026-04-20T21:35:00.000Z',
    })
  })

  it('reads an anonymous piece as having no author rather than an empty one', async () => {
    const { feedback } = api({ feedback: [row({ author_name: null, signed_in: false })] })
    const [piece] = await feedback.listApproved()
    expect(piece.authorName).toBeUndefined()
    expect(piece.signedIn).toBe(false)
  })
})

describe('sending a piece', () => {
  it('will not send a couple of words', async () => {
    const { feedback, sent } = api()
    await expect(feedback.send({ message: 'good', signed: false })).rejects.toThrow(/check the form/i)
    expect(sent).toHaveLength(0)
  })

  /**
   * The bug this exists to prevent has already happened once, on the contact form, and it
   * was invisible in development: `insert ... returning` is a read, reads answer to the
   * SELECT policies, and a member of the public deliberately has none. The form worked
   * against the mock and failed against the real database for a month.
   */
  it('does not ask for the row back, because it could not have it', async () => {
    const { feedback, calls } = api()
    await feedback.send({ message: 'The hall was warm and the singing went on beautifully.', signed: false })
    expect(calls.some((call) => call.startsWith('feedback.insert'))).toBe(true)
    expect(calls.some((call) => call.startsWith('feedback.select'))).toBe(false)
  })

  it('sends only the two things the sender is allowed to decide', async () => {
    const { feedback, sent } = api()
    await feedback.send({ message: '   Plenty long enough to count as a sentence.   ', signed: false })
    // Not the name, not the status, not the date. Every one of those is the database's.
    expect(sent[0]).toEqual({ message: 'Plenty long enough to count as a sentence.', signed_in: false })
  })

  /**
   * The receipt says what happened, not what was ticked. Somebody whose Google session
   * quietly expired between opening the page and pressing send has written an anonymous
   * note, and a thank-you screen claiming their name is on it would be the app's word
   * against the database's.
   */
  it('files a note as anonymous when the box was ticked but nobody is signed in', async () => {
    const { feedback, sent } = api({}, {}, null)
    await expect(feedback.send({ message: 'Ticked the box with no account behind it.', signed: true })).resolves.toEqual(
      { signed: false },
    )
    expect(sent[0]).toMatchObject({ signed_in: false })
  })

  it('asks for the name to be attached when there really is a session', async () => {
    const { feedback, sent } = api({}, {}, { access_token: 'a-real-token' })
    await expect(feedback.send({ message: 'Happy to put my name to this one.', signed: true })).resolves.toEqual({
      signed: true,
    })
    expect(sent[0]).toMatchObject({ signed_in: true })
  })

  it('says something a visitor can act on when the request fails', async () => {
    const { feedback } = api({}, { feedback: { code: '42501', message: 'permission denied' } })
    await expect(feedback.send({ message: 'This one is never going to arrive.', signed: false })).rejects.toThrow(
      /email the committee directly/i,
    )
  })
})

describe('the committee’s queue', () => {
  it('is empty for anybody who is not on the committee, without asking', async () => {
    const { feedback, calls } = api({ feedback: [row()] })
    expect(await feedback.listAll(member)).toEqual([])
    // Not merely filtered afterwards: the promise in the contract is that they get nothing,
    // and the policies would otherwise hand back the approved ones.
    expect(calls).toHaveLength(0)
  })

  it('comes back with what is waiting first', async () => {
    const { feedback } = api({
      feedback: [
        row({ id: 'old-approved', status: 'approved', created_at: '2026-09-20T09:00:00.000Z' }),
        row({ id: 'waiting', status: 'pending', author_name: null, signed_in: false, reviewed_by: null, reviewed_at: null, created_at: '2026-01-01T09:00:00.000Z' }),
      ],
    })
    expect((await feedback.listAll(admin)).map((piece) => piece.id)).toEqual(['waiting', 'old-approved'])
  })
})

describe('reviewing a piece', () => {
  it('records who decided, by name rather than by id', async () => {
    const { feedback, sent } = api({ households: { name: 'The Chatterjees' }, feedback: row() })
    await feedback.review('fb-1', 'approved', admin)
    expect(sent.at(-1)).toMatchObject({ status: 'approved', reviewed_by: 'The Chatterjees' })
  })

  /**
   * Putting a piece back in the queue clears the decision with it. One that reads as waiting
   * but still says who approved it is one nobody will look at twice.
   */
  it('clears the decision when a piece goes back in the queue', async () => {
    const { feedback, sent } = api({ households: { name: 'The Chatterjees' }, feedback: row({ status: 'pending' }) })
    await feedback.review('fb-1', 'pending', admin)
    expect(sent.at(-1)).toEqual({ status: 'pending', reviewed_by: null, reviewed_at: null })
  })

  it('refuses in words a person can read when the policy says no', async () => {
    const { feedback } = api({ households: { name: 'A Member' } }, { feedback: { code: '42501', message: 'denied' } })
    await expect(feedback.review('fb-1', 'approved', member)).rejects.toThrow(/only the committee/i)
  })

  it('treats a row the policy hid as one that is not there', async () => {
    const { feedback } = api({ households: { name: 'The Chatterjees' }, feedback: null })
    await expect(feedback.review('fb-1', 'approved', admin)).rejects.toThrow(/no such feedback/i)
  })
})

describe('deleting a piece', () => {
  it('says nothing happened when the policy matched nothing', async () => {
    const { feedback } = api({ feedback: null })
    await expect(feedback.remove('fb-1', admin)).rejects.toThrow(/no such feedback/i)
  })

  it('is satisfied by a row coming back', async () => {
    const { feedback } = api({ feedback: { id: 'fb-1' } })
    await expect(feedback.remove('fb-1', admin)).resolves.toBeUndefined()
  })
})
