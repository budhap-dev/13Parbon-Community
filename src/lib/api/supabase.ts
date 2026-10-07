import { isValidContact, type ContactInput, type ContactReceipt } from '@/domain/contact'
import type { ApiClient } from './types'

export type SupabaseConfig = { url: string; anonKey: string }

/**
 * Reads Supabase settings from the build environment. Both must be present;
 * a half-configured deployment falls back to the mock rather than failing at runtime.
 */
export function readSupabaseConfig(env: Record<string, string | undefined>): SupabaseConfig | null {
  const url = env.VITE_SUPABASE_URL?.trim()
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim()
  if (!url || !anonKey) return null
  return { url: url.replace(/\/+$/, ''), anonKey }
}

/**
 * The slice of `fetch` this adapter needs. Narrower than the DOM signature so tests can
 * supply a plain function, and `globalThis.fetch` still satisfies it.
 */
export type PostJson = (
  url: string,
  options: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; json: () => Promise<unknown> }>

/**
 * The schema everything this app owns lives in.
 *
 * Not `public`, because the Supabase project is shared with the committee's event planner and
 * that already owns a table called `people`. PostgREST is told which schema per request with
 * `Content-Profile` on a write and `Accept-Profile` on a read — and the schema has to be listed
 * under Settings → API → Exposed schemas or it refuses to look at all.
 */
export const SCHEMA = 'portal'

/**
 * Inserts one row through PostgREST. Throws a message fit to show a visitor.
 *
 * `return=minimal`, so nothing comes back and nothing needs to. The earlier
 * `return=representation` made this an `INSERT ... RETURNING`, and RETURNING is a read that
 * answers to the SELECT policies — of which a visitor deliberately has none, so the whole
 * request failed and the contact form did not work against the real database at all.
 * `supabase/verify.sql` proves both halves: the insert goes in, and reading it back does not.
 */
async function insert(config: SupabaseConfig, table: string, row: object, doFetch: PostJson): Promise<void> {
  let response: Awaited<ReturnType<PostJson>>
  try {
    response = await doFetch(`${config.url}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        'Content-Type': 'application/json',
        'Content-Profile': SCHEMA,
        'Accept-Profile': SCHEMA,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    })
  } catch {
    throw new Error('We could not reach the server. Check your connection and try again.')
  }
  if (!response.ok) {
    throw new Error('We could not send that just now. Please try again, or email the committee directly.')
  }
}

/**
 * Wraps a base client so that contact messages go to Supabase while everything else
 * keeps coming from the base. Content stays in fixtures until the admin portal exists.
 */
export function withSupabaseWrites(base: ApiClient, config: SupabaseConfig, doFetch: PostJson = globalThis.fetch): ApiClient {
  return {
    ...base,
    delivers: true,
    contact: {
      ...base.contact,
      send: async (input: ContactInput): Promise<ContactReceipt> => {
        if (!isValidContact(input)) throw new Error('Please check the form and try again.')
        const name = input.name.trim()
        const email = input.email.trim()
        await insert(
          config,
          'contact_messages',
          {
            name,
            email,
            subject: input.subject.trim(),
            message: input.message.trim(),
            /*
             * Carried through, not dropped. This is the flag that marks somebody asking for a
             * photograph of their child to be taken down, and without it that request reaches
             * the committee's inbox looking exactly like a question about parking — which is an
             * inbox where it waits a week, against a promise of three days.
             */
            kind: input.kind ?? 'general',
          },
          doFetch,
        )
        // What was sent, because nothing comes back. The thank-you screen shows the first name
        // and the address it will be answered at, and both are here.
        return { name, email }
      },
    },
  }
}
