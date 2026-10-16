import { accessToken, dataClient } from '@/lib/auth/supabaseAuth'
import type { Household } from '@/domain/household'
import { deletePhoto, keyOf, readUploadConfig, type UploadConfig } from '../uploads'
import type { ApiClient } from '../types'
import type { SupabaseConfig } from '../supabase'
import { householdMethods, inboxMethods } from './portalData'

/**
 * Swaps the back office over to the real database, leaving everything else on fixtures.
 *
 * The whole `portal` section at once, not half of it. A screen where the households are real
 * and the documents are sample data is a screen nobody can reason about — and the first thing
 * anybody would do with it is doubt the half that was right.
 *
 * The committee's inbox comes with it, for the same reason. `withSupabaseWrites` already posts
 * a visitor's message to the real table under the anon key; left on fixtures, the screen the
 * committee reads would show sample messages and never the ones actually arriving.
 *
 * Events, news and the gallery stay on fixtures for now, which is honest: they have no tables
 * yet. That line moves as each one gets them.
 */
export function withSupabasePortal(
  base: ApiClient,
  config: SupabaseConfig,
  env: Record<string, string | undefined> = {},
  photos: PhotoCleanup = {
    uploads: readUploadConfig(env),
    token: () => accessToken(config),
    remove: (uploads, key, token) => deletePhoto(uploads, key, token),
  },
): ApiClient {
  const client = () => dataClient(config)
  const methods = householdMethods(client)
  const takeDown = (before: Household | null, after: Household | null) => removeDropped(photos, before, after)
  const inbox = inboxMethods(client)
  return {
    ...base,
    contact: {
      // `send` is left alone: it belongs to the public website, which has no session and posts
      // under the anon key. Only the reading half moves here.
      ...base.contact,
      listMessages: () => inbox.listMessages(),
      markHandled: (id, viewer, note) => inbox.markHandled(id, viewer, note),
      deleteMessage: (id) => inbox.deleteMessage(id),
    },
    portal: {
      ...base.portal,
      identify: methods.identify,
      getHousehold: (id) => methods.getHousehold(id),
      listHouseholds: () => methods.listHouseholds(),
      listSignInAttempts: () => methods.listSignInAttempts(),
      listAttendance: () => methods.listAttendance(),
      addHousehold: (draft, viewer) => methods.addHousehold(draft, viewer),
      updateHousehold: async (id, draft, viewer) => {
        const before = await methods.getHousehold(id).catch(() => null)
        const saved = await methods.updateHousehold(id, draft, viewer)
        await takeDown(before, saved)
        return saved
      },
      deleteHousehold: async (id) => {
        const before = await methods.getHousehold(id).catch(() => null)
        await methods.deleteHousehold(id)
        await takeDown(before, null)
      },
      resolveSignInAttempt: (id) => methods.resolveSignInAttempt(id),
      recordAttendance: (draft) => methods.recordAttendance(draft),
      exportHousehold: (id) => methods.exportHousehold(id),
    },
  }
}

/** What taking down a dropped profile photograph needs. Handed in, so it can be tested. */
export type PhotoCleanup = {
  uploads: UploadConfig | null
  token: () => Promise<string | null>
  remove: (uploads: UploadConfig, key: string, token: string) => Promise<void>
}

/**
 * Takes out of the bucket the profile photographs a save has dropped — replaced, removed, or
 * gone with their person or their household.
 *
 * After the save, not before: a photograph taken down ahead of a save that then failed would
 * leave a person pointing at nothing. And quietly: the save has succeeded and is what somebody
 * is waiting to hear about. A file that stays behind is at an address nothing links to any more,
 * and the committee can still take it down by hand.
 */
export async function removeDropped(photos: PhotoCleanup, before: Household | null, after: Household | null): Promise<void> {
  if (!photos.uploads || !before) return
  const kept = new Set((after?.people ?? []).map((person) => person.photo).filter(Boolean))
  const dropped = before.people.map((person) => person.photo).filter((photo): photo is string => Boolean(photo) && !kept.has(photo))
  if (dropped.length === 0) return
  const token = await photos.token().catch(() => null)
  if (!token) return
  const uploads = photos.uploads
  await Promise.all(
    dropped.map(async (photo) => {
      const key = keyOf(uploads, photo)
      if (key) await photos.remove(uploads, key, token).catch(() => undefined)
    }),
  )
}
