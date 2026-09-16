import type { SupabaseClient } from '@supabase/supabase-js'
import { isAdmin, isValidHousehold, type Household, type HouseholdDraft, type Viewer } from '@/domain/household'
import { NotAllowed } from '../mock'
import {
  fromDraft,
  HOUSEHOLD_SELECT,
  peopleRows,
  toAttempt,
  toAttendance,
  toDocument,
  toHousehold,
  toMessage,
  type AttemptRow,
  type AttendanceRow,
  type DocumentRow,
  type HouseholdRow,
  type MessageRow,
} from './rows'
import type { AttendanceDraft } from '@/domain/attendance'
import type { ContactMessage } from '@/domain/contact'
import { ATTENDANCE_NOTE, CONTACT_NOTE, PHOTOGRAPH_NOTE } from '@/domain/subjectAccess'

/** Everything this app owns is in its own schema; the planner has `public`. */
const SCHEMA = 'portal'

const table = (client: SupabaseClient, name: string) => client.schema(SCHEMA).from(name)

/**
 * Turns a PostgREST failure into something worth showing somebody.
 *
 * A policy that refuses a write comes back as 42501; one that refuses a *read* comes back as
 * no rows at all, which is why so little of this checks for errors and so much checks for
 * nothing. That is the design working, not a fault: a policy hides rows, it does not announce
 * that it is hiding them.
 */
function refuse(message: string, error: { code?: string; message: string } | null): never {
  // 45001 is the last-admin guard, which raises a sentence already fit to show somebody. Every
  // other refusal comes back saying a policy was violated, which is not.
  if (error?.code === '45001') throw new NotAllowed(error.message)
  if (error?.code === '42501') throw new NotAllowed(message)
  throw new Error(error?.message ?? message)
}

/**
 * The household half of the portal, against the real database.
 *
 * Every call goes through the client that holds the signed-in session, so PostgREST sees that
 * person's token and the policies answer for them. Using the anon key here would not fail —
 * it would quietly return nothing, which looks like an empty account rather than a bug.
 */
export function householdMethods(getClient: () => Promise<SupabaseClient>) {
  const rowsOf = async () => getClient()

  return {
    identify: async (email: string) => {
      const client = await rowsOf()
      const { data } = await table(client, 'households')
        .select('id,name,role')
        .eq('google_email', email.trim().toLowerCase())
        .maybeSingle()
      return (data as Pick<Household, 'id' | 'name' | 'role'> | null) ?? null
    },

    getHousehold: async (id: string) => {
      const client = await rowsOf()
      // No error branch on purpose: a household this person may not see comes back as no rows,
      // exactly as one that does not exist does. Telling those two apart is itself a leak.
      const { data } = await table(client, 'households').select(HOUSEHOLD_SELECT).eq('id', id).maybeSingle()
      return data ? toHousehold(data as HouseholdRow) : null
    },

    listHouseholds: async () => {
      const client = await rowsOf()
      const { data } = await table(client, 'households').select(HOUSEHOLD_SELECT).order('name')
      return ((data ?? []) as HouseholdRow[]).map(toHousehold)
    },

    addHousehold: async (draft: HouseholdDraft, viewer: Viewer) => {
      if (!isValidHousehold(draft)) throw new NotAllowed('that household is not complete')
      const client = await rowsOf()
      const { data, error } = await table(client, 'households')
        .insert(fromDraft(draft, isAdmin(viewer)))
        .select(HOUSEHOLD_SELECT)
        .single()
      if (error || !data) refuse('only the committee can add a household', error)

      await savePeople(client, (data as HouseholdRow).id, draft)
      return (await reread(client, (data as HouseholdRow).id))!
    },

    updateHousehold: async (id: string, draft: HouseholdDraft, viewer: Viewer) => {
      if (!isValidHousehold(draft)) throw new NotAllowed('that household is not complete')
      const client = await rowsOf()
      const { data, error } = await table(client, 'households')
        .update(fromDraft(draft, isAdmin(viewer)))
        .eq('id', id)
        .select('id')
        .maybeSingle()
      // No row back means the policy did not match it. Same answer as not existing.
      if (error) refuse('that household could not be saved', error)
      if (!data) throw new NotAllowed('no such household')

      await savePeople(client, id, draft)
      return (await reread(client, id))!
    },

    deleteHousehold: async (id: string) => {
      const client = await rowsOf()
      const { data, error } = await table(client, 'households').delete().eq('id', id).select('id').maybeSingle()
      if (error) refuse('that household could not be removed', error)
      // The policy matched nothing, so there was nothing here to remove — as far as you know.
      if (!data) throw new NotAllowed('no such household')
    },

    listDocuments: async () => {
      const client = await rowsOf()
      const { data } = await table(client, 'documents').select('*').order('added_on', { ascending: false })
      return ((data ?? []) as DocumentRow[]).map(toDocument)
    },

    listSignInAttempts: async () => {
      const client = await rowsOf()
      const { data } = await table(client, 'sign_in_attempts').select('*').order('last_tried_at', { ascending: false })
      return ((data ?? []) as AttemptRow[]).map(toAttempt)
    },

    resolveSignInAttempt: async (id: string) => {
      const client = await rowsOf()
      const { data, error } = await table(client, 'sign_in_attempts').update({ resolved: true }).eq('id', id).select('*').maybeSingle()
      if (error) refuse('that could not be marked done', error)
      if (!data) throw new NotAllowed('no such sign-in attempt')
      return toAttempt(data as AttemptRow)
    },

    listAttendance: async () => {
      const client = await rowsOf()
      const { data } = await table(client, 'event_attendance').select('*').order('held_on', { ascending: false })
      return ((data ?? []) as AttendanceRow[]).map(toAttendance)
    },

    recordAttendance: async (draft: AttendanceDraft) => {
      const client = await rowsOf()
      // One row per event: recording it again corrects the number rather than adding a second.
      const { data, error } = await table(client, 'event_attendance')
        .upsert(
          {
            event_slug: draft.eventId,
            held_on: draft.heldOn,
            households: draft.households,
            adults: draft.adults,
            children: draft.children,
            recorded_at: new Date().toISOString(),
          },
          { onConflict: 'event_slug' },
        )
        .select('*')
        .single()
      if (error || !data) refuse('only the committee can record that', error)
      return toAttendance(data as AttendanceRow)
    },

    exportHousehold: async (id: string) => {
      const client = await rowsOf()
      const household = await reread(client, id)
      // Not found and not allowed are the same answer here as everywhere else.
      if (!household) throw new NotAllowed('no such household')

      // Messages carry no household, only whatever address somebody typed into the form, so
      // they are matched on the addresses we hold. Anyone who wrote in from a work address is
      // missed, which is why the export says so rather than implying there were none.
      const addresses = [household.email, household.googleEmail].filter(Boolean).map((a) => a!.toLowerCase())
      const { data: messages } = addresses.length
        ? await table(client, 'contact_messages').select('*').in('email', addresses).order('created_at', { ascending: false })
        : { data: [] }

      const { data: attempts } = addresses.length
        ? await table(client, 'sign_in_attempts').select('*').in('email', addresses)
        : { data: [] }

      const { data: trail } = await table(client, 'audit_log')
        .select('action,at,changes')
        .eq('subject_kind', 'households')
        .eq('subject_id', id)
        .order('at', { ascending: false })

      return {
        takenAt: new Date().toISOString(),
        household,
        messages: ((messages ?? []) as { id: string; name: string; email: string; subject: string; message: string; created_at: string }[]).map(
          (m) => ({ id: m.id, name: m.name, email: m.email, subject: m.subject, message: m.message, createdAt: m.created_at }),
        ),
        signInAttempts: ((attempts ?? []) as AttemptRow[]).map((a) => ({
          email: a.email,
          lastTriedAt: a.last_tried_at,
          attempts: a.attempts,
        })),
        // Which fields moved, never who moved them: a household is entitled to know its
        // membership was marked lapsed; which admin did it is a fact about that admin.
        changes: ((trail ?? []) as { action: string; at: string; changes: Record<string, unknown> }[]).map((row) => ({
          action: row.action,
          at: row.at,
          fields: Object.keys(row.changes ?? {}),
        })),
        notes: [ATTENDANCE_NOTE, PHOTOGRAPH_NOTE, CONTACT_NOTE],
      }
    },
  }
}

async function reread(client: SupabaseClient, id: string): Promise<Household | null> {
  const { data } = await table(client, 'households').select(HOUSEHOLD_SELECT).eq('id', id).maybeSingle()
  return data ? toHousehold(data as HouseholdRow) : null
}

/**
 * Replaces the people of a household.
 *
 * **New rows go in before the old ones come out**, which is the opposite of the obvious order
 * and the reason is worth keeping. There is no transaction across two PostgREST calls, so if
 * the second fails, whatever the first did stands. Deleting first and failing to insert loses a
 * family's details; inserting first and failing to delete leaves everybody listed twice. One of
 * those a person can fix from the screen in a minute. The other is gone.
 *
 * An RPC would do both atomically and should, before this carries anybody's real details.
 */
async function savePeople(client: SupabaseClient, householdId: string, draft: HouseholdDraft): Promise<void> {
  const { data: existing } = await table(client, 'people').select('id').eq('household_id', householdId)
  const oldIds = ((existing ?? []) as { id: string }[]).map((row) => row.id)

  const { error } = await table(client, 'people').insert(peopleRows(householdId, draft))
  if (error) refuse('those people could not be saved', error)

  if (oldIds.length > 0) await table(client, 'people').delete().in('id', oldIds)
}


/**
 * The committee's inbox, against the real database.
 *
 * Kept beside the household methods because it is the same job — the back office reading
 * through the signed-in person's own session — even though it hangs off `contact` rather than
 * `portal` in the interface. The public website's half of this table is in `../supabase.ts`
 * and goes out under the anon key, because a visitor sending a message has no session.
 */
export function inboxMethods(getClient: () => Promise<SupabaseClient>) {
  return {
    listMessages: async (): Promise<ContactMessage[]> => {
      const client = await getClient()
      // Nothing comes back at all for anybody who is not an admin: the policy hides the rows
      // rather than refusing the request. An empty inbox is the correct answer to give them.
      const { data } = await table(client, 'contact_messages').select('*').order('created_at', { ascending: false })
      return ((data ?? []) as MessageRow[]).map(toMessage).sort(
        (a, b) =>
          // Takedowns nobody has dealt with, first — the same order the fixtures use, because
          // an inbox where one arrives between a parking question and a request to sing is an
          // inbox where it waits. Sorted here rather than in SQL so the two cannot drift.
          Number(b.kind === 'photo' && !b.handledBy) - Number(a.kind === 'photo' && !a.handledBy) ||
          b.createdAt.localeCompare(a.createdAt),
      )
    },

    markHandled: async (id: string, viewer: Viewer, note?: string): Promise<ContactMessage> => {
      const client = await getClient()

      // Who dealt with it, by name. The viewer carries a household id and the screen prints
      // whatever is in this column straight out, so the id would show a reader "handled by
      // 7f3a-…". A member gets no row back here, but they get no row back from the update
      // either, so the answer is the same refusal in both cases.
      const { data: who } = await table(client, 'households')
        .select('name')
        .eq('id', viewer?.householdId ?? '')
        .maybeSingle()

      const { data, error } = await table(client, 'contact_messages')
        .update({
          handled_by: (who as { name: string } | null)?.name ?? 'The committee',
          ...(note?.trim() ? { handled_note: note.trim() } : {}),
        })
        .eq('id', id)
        .select('*')
        .maybeSingle()

      /*
       * The takedown rule is a check constraint on the table, so a photograph marked dealt with
       * and no note comes back 23514 rather than silently saving. Translated here into the same
       * sentence the mock uses, because the raw Postgres text is not for a person to read.
       */
      if (error?.code === '23514') throw new NotAllowed('say what happened to the photograph')
      if (error) refuse('that could not be marked done', error)
      if (!data) throw new NotAllowed('no such message')
      return toMessage(data as MessageRow)
    },

    deleteMessage: async (id: string): Promise<void> => {
      const client = await getClient()
      const { data, error } = await table(client, 'contact_messages').delete().eq('id', id).select('id').maybeSingle()
      if (error) refuse('only the committee can do that', error)
      // The policy matched nothing, so there was nothing there to delete — as far as you know.
      if (!data) throw new NotAllowed('no such message')
    },
  }
}