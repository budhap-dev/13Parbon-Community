import type { SupabaseClient } from '@supabase/supabase-js'
import { isAdmin, type Viewer } from '@/domain/household'
import {
  forReview,
  isValidFeedback,
  type Feedback,
  type FeedbackInput,
  type FeedbackReceipt,
  type FeedbackStatus,
} from '@/domain/feedback'
import { NotAllowed } from '../mock'
import type { ApiClient } from '../types'
import type { SupabaseConfig } from '../supabase'
import { dataClient } from '@/lib/auth/supabaseAuth'

type FeedbackRow = {
  id: string
  message: string
  author_name: string | null
  signed_in: boolean
  status: FeedbackStatus
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

/** Absent rather than null, the same as everywhere else here: `?? undefined` reads as absent. */
export function toFeedback(row: FeedbackRow): Feedback {
  return {
    id: row.id,
    message: row.message,
    ...(row.author_name ? { authorName: row.author_name } : {}),
    signedIn: row.signed_in,
    status: row.status,
    ...(row.reviewed_by ? { reviewedBy: row.reviewed_by } : {}),
    ...(row.reviewed_at ? { reviewedAt: row.reviewed_at } : {}),
    createdAt: row.created_at,
  }
}

/**
 * Feedback from the public, against the real database.
 *
 * Unlike the contact form, this one goes out through the *session* client rather than a plain
 * POST with the anon key — and that is the whole design, not a detail. The name on a signed
 * piece is taken from the token by `portal.stamp_feedback`, so the token has to be on the
 * request. A visitor who has not signed in sends exactly the same request without one, and the
 * trigger files it as anonymous.
 *
 * The read policies do the rest. A stranger asking for every piece of feedback gets the
 * approved ones because that is all the policy admits, not because the query narrowed it — so
 * a mistake in a `select` here cannot put something unreviewed on the public page.
 */
export function feedbackMethods(getClient: () => Promise<SupabaseClient>): ApiClient['feedback'] {
  const table = (client: SupabaseClient) => client.schema('portal').from('feedback')

  const refuse = (message: string, error: { code?: string; message: string } | null): never => {
    if (error?.code === '42501') throw new NotAllowed(message)
    throw new Error(error?.message ?? message)
  }

  return {
    listApproved: async (limit = 20) => {
      const { data, error } = await table(await getClient())
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw new Error(`The feedback could not be read: ${error.message}`)
      return ((data ?? []) as FeedbackRow[]).map(toFeedback)
    },

    send: async (input: FeedbackInput): Promise<FeedbackReceipt> => {
      if (!isValidFeedback(input)) throw new Error('Please check the form and try again.')
      const client = await getClient()
      /*
       * Asked before the write, so the receipt can say what actually happened rather than what
       * was ticked. Somebody whose Google session quietly expired between opening the page and
       * pressing send has written anonymous feedback, and a thank-you screen telling them their
       * name is on it would be the app's word against the database's.
       */
      const { data: current } = await client.auth.getSession()
      const signed = input.signed && Boolean(current.session)

      const { error } = await table(client).insert({ message: input.message.trim(), signed_in: signed })
      /*
       * No `.select()`. The row that has just been written is pending, and pending rows are
       * precisely what nobody but the committee has a policy to read — asking for it back would
       * turn the insert into an `INSERT ... RETURNING`, which is a read, which would fail the
       * whole request. The contact form was broken on the live site for a month over this.
       */
      if (error) {
        throw new Error('We could not send that just now. Please try again, or email the committee directly.')
      }
      return { signed }
    },

    listAll: async (viewer: Viewer) => {
      // The policy already hides everything from a member — this is so the promise in the
      // contract ("empty for anybody who is not an admin") holds rather than quietly becoming
      // "the approved ones", which is what the read policies would otherwise hand back.
      if (!isAdmin(viewer)) return []
      const { data, error } = await table(await getClient()).select('*')
      if (error) throw new Error(`The feedback could not be read: ${error.message}`)
      return forReview(((data ?? []) as FeedbackRow[]).map(toFeedback))
    },

    review: async (id: string, status: FeedbackStatus, viewer: Viewer) => {
      const client = await getClient()

      // Who decided, by name. The screen prints this column straight out, so a household id
      // here shows a reader "approved by 7f3a-…". A member gets no row back from this lookup,
      // and none from the update either, so both halves refuse the same way.
      // Its error is left alone on purpose: the name is a courtesy, and a decision that fell back
      // to "The committee" is better than one the committee could not make at all.
      const { data: who } = await client
        .schema('portal')
        .from('households')
        .select('name')
        .eq('id', viewer?.householdId ?? '')
        .maybeSingle()

      const { data, error } = await client
        .schema('portal')
        .from('feedback')
        .update(
          status === 'pending'
            ? // Back in the queue, and the decision cleared with it: a piece that reads as
              // waiting but still says who approved it is a piece nobody will look at again.
              { status, reviewed_by: null, reviewed_at: null }
            : {
                status,
                reviewed_by: (who as { name: string } | null)?.name ?? 'The committee',
                reviewed_at: new Date().toISOString(),
              },
        )
        .eq('id', id)
        .select('*')
        .maybeSingle()

      if (error) refuse('only the committee can review feedback', error)
      if (!data) throw new NotAllowed('no such feedback')
      return toFeedback(data as FeedbackRow)
    },

    remove: async (id: string) => {
      const { data, error } = await table(await getClient()).delete().eq('id', id).select('id').maybeSingle()
      if (error) refuse('only the committee can do that', error)
      // The policy matched nothing, so there was nothing there to delete — as far as you know.
      if (!data) throw new NotAllowed('no such feedback')
    },
  }
}

/** The same methods, on the client that carries the signed-in session. */
export function withSupabaseFeedback(base: ApiClient, config: SupabaseConfig): ApiClient {
  return { ...base, feedback: feedbackMethods(() => dataClient(config)) }
}
