import type { SupabaseClient } from '@supabase/supabase-js'
import { isAdmin, isValidHousehold, type Household, type HouseholdDraft, type Viewer } from '@/domain/household'
import { NotAllowed } from '../mock'
import { fromDraft, HOUSEHOLD_SELECT, peopleRows, toHousehold, type HouseholdRow } from './rows'

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
