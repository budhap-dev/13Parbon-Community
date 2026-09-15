import { diff, isEmpty, type AuditEntry } from '@/domain/audit'
import { isAdmin, type Viewer } from '@/domain/household'
import type { ApiClient } from './types'

/**
 * Records what changed, around the client rather than inside it.
 *
 * In the database this is a trigger on each table (`public.record_change`), and the point of
 * putting it there is that nothing reaching those tables can avoid it. A trail the caller has
 * to remember to write is a trail with holes exactly where somebody was in a hurry.
 *
 * A mock has no triggers, so this is the nearest honest equivalent: the wrapper goes around
 * the whole client, and the methods underneath neither know nor can opt out. A new mutation is
 * still only audited once it is added here — which is the one place this is weaker than the
 * database by construction, so `audit.test.ts` checks every mutation the contract has.
 *
 * Applied outermost, so a write goes through it whichever adapter ends up handling it.
 */
/**
 * A household as a flat set of fields, so two versions of it can be compared field by field.
 * `people` is compared as a whole: who is in a household is one fact about it, and a trail
 * saying person 3's name moved by one position is noise.
 */
function flatten(household: Record<string, unknown>): Record<string, unknown> {
  const { people, membership, ...rest } = household
  return {
    ...rest,
    people: JSON.stringify(people),
    membership: JSON.stringify(membership),
  }
}

/**
 * The fields of a row, copied out now.
 *
 * The mock changes rows in place, so holding the row and reading it after the write gives the
 * new values twice and a diff of nothing — a silently empty trail, which is the one failure an
 * audit trail must not have. Every "before" in this file goes through here: the bug is easy to
 * write, invisible when you do, and it has already been made three times.
 */
function snapshot<T extends object, K extends keyof T>(row: T | undefined, ...fields: K[]): Record<string, unknown> {
  if (!row) return {}
  return Object.fromEntries(fields.map((field) => [String(field), row[field]]))
}

export function withAuditTrail(base: ApiClient, now: () => Date = () => new Date()): ApiClient {
  const entries: AuditEntry[] = []

  function record(
    viewer: Viewer,
    action: string,
    subject: { kind: string; id: string },
    before: Record<string, unknown>,
    after: Record<string, unknown>,
  ): void {
    const changes = diff(before, after)
    // A write that moved nothing is not worth a row, same as the trigger's early return.
    if (isEmpty(changes)) return
    entries.push({
      id: `audit-${entries.length + 1}`,
      actorHouseholdId: viewer?.householdId ?? '',
      action,
      subject,
      changes,
      at: now().toISOString(),
    })
  }

  return {
    ...base,
    contact: {
      ...base.contact,
      // `send` is not recorded, matching the trigger: it is attached to contact_messages for
      // updates only. Every visitor using the form would otherwise write a line saying a
      // visitor used the form, which the table already says.
      markHandled: async (id, viewer) => {
        // Read the old value out now, not a reference to the row it lives on. The mock changes
        // rows in place, so holding the object and reading it after the write gives the new
        // value twice and a diff of nothing — which is a silently empty trail, the one failure
        // an audit trail must not have.
        const was = (await base.contact.listMessages(viewer)).find((m) => m.id === id)?.handledBy
        const after = await base.contact.markHandled(id, viewer)
        record(viewer, 'messages:handle', { kind: 'contact_messages', id }, { handledBy: was }, { handledBy: after.handledBy })
        return after
      },
    },
    settings: {
      ...base.settings,
      save: async (draft, viewer) => {
        const was = await base.settings.get()
        const saved = await base.settings.save(draft, viewer)
        // Flattened, because a nested object compared with Object.is is always a change.
        record(
          viewer,
          'settings:save',
          { kind: 'settings', id: 'site' },
          { ...was, home: JSON.stringify(was.home) },
          { ...saved, home: JSON.stringify(saved.home) },
        )
        return saved
      },
    },
    news: {
      ...base.news,
      createPost: async (draft, viewer) => {
        const post = await base.news.createPost(draft, viewer)
        record(viewer, 'news:create', { kind: 'news_posts', id: post.id }, {}, { title: post.title, publishedAt: post.publishedAt })
        return post
      },
      updatePost: async (id, draft, viewer) => {
        const was = snapshot(
          await base.news.listAllPosts(viewer).then((all) => all.find((p) => p.id === id)),
          'title',
          'publishedAt',
          'hidden',
        )
        const post = await base.news.updatePost(id, draft, viewer)
        // Whether a piece is on the website is the change somebody asks about later, so it is
        // recorded by name rather than left inside a diff of the whole post.
        record(
          viewer,
          !was.hidden && post.hidden ? 'news:unpublish' : 'news:edit',
          { kind: 'news_posts', id },
          was,
          { title: post.title, publishedAt: post.publishedAt, hidden: post.hidden },
        )
        return post
      },
      createAnnouncement: async (draft, viewer) => {
        const announcement = await base.news.createAnnouncement(draft, viewer)
        record(viewer, 'announcement:create', { kind: 'announcements', id: announcement.id }, {}, { title: announcement.title })
        return announcement
      },
      updateAnnouncement: async (id, draft, viewer) => {
        const was = snapshot(
          await base.news.listAllAnnouncements(viewer).then((all) => all.find((a) => a.id === id)),
          'title',
          'pinned',
          'audience',
        )
        const announcement = await base.news.updateAnnouncement(id, draft, viewer)
        record(
          viewer,
          'announcement:edit',
          { kind: 'announcements', id },
          was,
          { title: announcement.title, pinned: announcement.pinned, audience: announcement.audience },
        )
        return announcement
      },
      removeAnnouncement: async (id, viewer) => {
        const was = snapshot(
          await base.news.listAllAnnouncements(viewer).then((all) => all.find((a) => a.id === id)),
          'title',
        )
        await base.news.removeAnnouncement(id, viewer)
        record(viewer, 'announcement:remove', { kind: 'announcements', id }, was, {})
      },
    },
    gallery: {
      ...base.gallery,
      createAlbum: async (draft, viewer) => {
        const album = await base.gallery.createAlbum(draft, viewer)
        record(viewer, 'album:create', { kind: 'albums', id: album.id }, {}, { ...album })
        return album
      },
      updateAlbum: async (id, draft, viewer) => {
        const was = snapshot(
          await base.gallery.listAllAlbums(viewer).then((all) => all.find((a) => a.id === id)),
          'title',
          'description',
          'visibility',
        )
        const album = await base.gallery.updateAlbum(id, draft, viewer)
        record(viewer, 'album:edit', { kind: 'albums', id }, was, {
          title: album.title,
          description: album.description,
          visibility: album.visibility,
        })
        return album
      },
      setCover: async (albumId, mediaId, viewer) => {
        const was = snapshot(
          await base.gallery.listAllAlbums(viewer).then((all) => all.find((a) => a.id === albumId)),
          'coverMediaId',
        )
        const album = await base.gallery.setCover(albumId, mediaId, viewer)
        record(viewer, 'album:setCover', { kind: 'albums', id: albumId }, was, { coverMediaId: mediaId })
        return album
      },
      setCaption: async (mediaId, caption, viewer) => {
        const was = await base.gallery
          .listAllAlbums(viewer)
          .then((all) => all.flatMap((a) => a.media).find((m) => m.id === mediaId)?.caption)
        const media = await base.gallery.setCaption(mediaId, caption, viewer)
        record(viewer, 'media:caption', { kind: 'media', id: mediaId }, { caption: was }, { caption: media.caption })
        return media
      },
      reorder: async (albumId, mediaIds, viewer) => {
        const media = await base.gallery.reorder(albumId, mediaIds, viewer)
        record(viewer, 'album:reorder', { kind: 'albums', id: albumId }, {}, { order: mediaIds.join(',') })
        return media
      },
      deleteMedia: async (id, viewer) => {
        // Read before it goes: a takedown is the one thing somebody will ask about afterwards.
        const was = snapshot(
          await base.gallery.listAllAlbums(viewer).then((all) => all.flatMap((a) => a.media).find((m) => m.id === id)),
          'url',
          'albumId',
        )
        await base.gallery.deleteMedia(id, viewer)
        record(viewer, 'media:remove', { kind: 'media', id }, was, {})
      },
    },
    portal: {
      ...base.portal,
      recordAttendance: async (draft, viewer) => {
        const was = snapshot(
          await base.portal.listAttendance(viewer).then((all) => all.find((x) => x.eventId === draft.eventId)),
          'households',
          'adults',
          'children',
        )
        const saved = await base.portal.recordAttendance(draft, viewer)
        record(viewer, 'attendance:record', { kind: 'event_attendance', id: draft.eventId }, was, {
          households: saved.households,
          adults: saved.adults,
          children: saved.children,
        })
        return saved
      },
      addHousehold: async (draft, viewer) => {
        const household = await base.portal.addHousehold(draft, viewer)
        record(viewer, 'household:add', { kind: 'households', id: household.id }, {}, flatten(household))
        return household
      },
      // The trail lives here, so the part of an export that comes from it is filled in here
      // too. Which fields moved, never who moved them: a household is entitled to know its
      // membership was marked lapsed; which committee member did it is a fact about them.
      resolveSignInAttempt: async (id, viewer) => {
        const attempt = await base.portal.resolveSignInAttempt(id, viewer)
        record(viewer, 'signInAttempts:resolve', { kind: 'sign_in_attempts', id }, { resolved: false }, { resolved: true })
        return attempt
      },
      deleteHousehold: async (id, viewer) => {
        // Read before the row is gone, or there is nothing left to say what was removed.
        const was = await base.portal.getHousehold(id, viewer).then((h) => (h ? flatten(h) : {}))
        await base.portal.deleteHousehold(id, viewer)
        record(viewer, 'household:remove', { kind: 'households', id }, was, {})
      },
      exportHousehold: async (id, viewer) => {
        const result = await base.portal.exportHousehold(id, viewer)
        return {
          ...result,
          changes: entries
            .filter((e) => e.subject.kind === 'households' && e.subject.id === id)
            .map((e) => ({ action: e.action, at: e.at, fields: Object.keys(e.changes) })),
        }
      },
      updateHousehold: async (id, draft, viewer) => {
        // Flattened now, before the write: the mock changes rows in place, so holding the row
        // and reading it afterwards gives the new values twice and a diff of nothing.
        const was = await base.portal.getHousehold(id, viewer).then((h) => (h ? flatten(h) : {}))
        const household = await base.portal.updateHousehold(id, draft, viewer)
        record(viewer, 'household:edit', { kind: 'households', id }, was, flatten(household))
        return household
      },
    },
    audit: {
      /**
       * Newest first, and newest means newest — not "newest by timestamp, then whatever order
       * they happened to be in". Two changes inside the same millisecond are common (a write
       * and the write that undid it, a script, a test) and sorting on the stamp alone leaves
       * them in the order they were made, which is exactly backwards.
       */
      list: async (viewer, limit = 50) =>
        isAdmin(viewer)
          ? entries
              .map((entry, i) => ({ entry, i }))
              .sort((a, b) => b.entry.at.localeCompare(a.entry.at) || b.i - a.i)
              .map(({ entry }) => entry)
              .slice(0, limit)
          : [],
    },
  }
}
