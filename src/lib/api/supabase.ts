import { isValidContact, type ContactInput, type ContactMessage } from '@/domain/contact'
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

/** Inserts one row through PostgREST and returns it. Throws a message fit to show a visitor. */
async function insert<T>(config: SupabaseConfig, table: string, row: object, doFetch: PostJson): Promise<T> {
  let response: Awaited<ReturnType<PostJson>>
  try {
    response = await doFetch(`${config.url}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(row),
    })
  } catch {
    throw new Error('We could not reach the server. Check your connection and try again.')
  }
  if (!response.ok) {
    throw new Error('We could not send that just now. Please try again, or email the committee directly.')
  }
  const rows = (await response.json()) as T[]
  return rows[0]
}

type ContactRow = { id: string; name: string; email: string; subject: string; message: string; created_at: string }

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
      send: async (input: ContactInput): Promise<ContactMessage> => {
        if (!isValidContact(input)) throw new Error('Please check the form and try again.')
        const row = await insert<ContactRow>(
          config,
          'contact_messages',
          {
            name: input.name.trim(),
            email: input.email.trim(),
            subject: input.subject.trim(),
            message: input.message.trim(),
          },
          doFetch,
        )
        return {
          id: row.id,
          name: row.name,
          email: row.email,
          subject: row.subject,
          message: row.message,
          createdAt: row.created_at,
        }
      },
    },
  }
}
