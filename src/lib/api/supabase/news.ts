import { isAdmin, isMember, type Viewer } from '@/domain/household'
import {
  isValid,
  slugFrom,
  validateAnnouncement,
  validateNews,
  type Announcement,
  type AnnouncementDraft,
  type NewsDraft,
  type NewsPost,
  type Newsletter,
} from '@/domain/news'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NotAllowed } from '../mock'
import type { ApiClient } from '../types'
import type { SupabaseConfig } from '../supabase'
import { dataClient } from '@/lib/auth/supabaseAuth'

type PostRow = {
  id: string
  slug: string
  title: string
  excerpt: string
  body: string
  tags: string[] | null
  author: string
  published_at: string | null
  hidden: boolean
}

type NoticeRow = {
  id: string
  title: string
  body: string
  pinned: boolean
  audience: 'public' | 'members'
  publish_at: string
  expires_at: string | null
  link_label: string | null
  link_to: string | null
}

type NewsletterRow = { id: string; title: string; file_url: string; issued_on: string }

/**
 * Absent rather than null, because `NewsPost` marks these optional and every screen asks
 * `post.publishedAt ? …`. A null would read as published-at-nothing and sort to the bottom.
 */
export function toPost(row: PostRow): NewsPost {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body,
    tags: row.tags ?? [],
    author: row.author,
    ...(row.published_at ? { publishedAt: row.published_at } : {}),
    ...(row.hidden ? { hidden: true } : {}),
  }
}

export function toNotice(row: NoticeRow): Announcement {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    pinned: row.pinned,
    audience: row.audience,
    publishAt: row.publish_at,
    ...(row.expires_at ? { expiresAt: row.expires_at } : {}),
    ...(row.link_label && row.link_to ? { link: { label: row.link_label, to: row.link_to } } : {}),
  }
}

const fromNotice = (draft: AnnouncementDraft, fallbackPublishAt: string) => ({
  title: draft.title.trim(),
  body: draft.body.trim(),
  pinned: draft.pinned,
  audience: draft.audience,
  publish_at: draft.publishAt || fallbackPublishAt,
  expires_at: draft.expiresAt || null,
  link_label: draft.link?.label.trim() || null,
  link_to: draft.link?.to.trim() || null,
})

const fromPost = (draft: NewsDraft) => ({
  title: draft.title.trim(),
  excerpt: draft.excerpt.trim(),
  body: draft.body.trim(),
  tags: draft.tags.map((tag) => tag.trim()).filter(Boolean),
  author: draft.author.trim(),
})

/** Pinned first, then newest — the order a noticeboard is read in. */
const byPinnedThenNewest = (a: Announcement, b: Announcement) =>
  Number(b.pinned) - Number(a.pinned) || b.publishAt.localeCompare(a.publishAt)

/**
 * What the committee writes, against the real database.
 *
 * The read policies do the work here and the queries stay plain: a visitor asking for every
 * post gets the published ones because that is all the policy admits, not because the query
 * narrowed it. So a mistake in a `select` cannot leak a draft.
 *
 * The `isAdmin` checks below are the opposite — presentation, not protection. `listAllPosts`
 * promises an empty list to anybody who is not on the committee, and without them a member
 * would get the published posts rather than nothing. The drafts are hidden either way.
 */
export function newsMethods(getClient: () => Promise<SupabaseClient>, now = () => new Date()): ApiClient['news'] {
  /*
   * Synchronous, with the client awaited at each call site, the same shape as `portalData.ts`.
   *
   * `from()` is safe to hand back from an `async` helper — it is not thenable — but everything
   * after `select()` is, so the moment such a helper is extended one step further the `await`
   * meant to produce a builder silently runs the query instead. Not a trap worth leaving.
   */
  const table = (client: SupabaseClient, name: string) => client.schema('portal').from(name)

  const refuse = (message: string, error: { code?: string; message: string } | null): never => {
    if (error?.code === '23505') throw new NotAllowed('there is already a piece with that title')
    if (error?.code === '42501') throw new NotAllowed(message)
    throw new Error(error?.message ?? message)
  }

  const posts = async (): Promise<NewsPost[]> => {
    const { data } = await table(await getClient(), 'news_posts').select('*').order('published_at', { ascending: false })
    return ((data ?? []) as PostRow[]).map(toPost)
  }

  const rereadPost = async (id: string): Promise<NewsPost> => {
    const { data } = await table(await getClient(), 'news_posts').select('*').eq('id', id).maybeSingle()
    if (!data) throw new NotAllowed('no such piece')
    return toPost(data as PostRow)
  }

  return {
      listPosts: async (limit = 20) => (await posts()).filter((p) => p.publishedAt && !p.hidden).slice(0, limit),

      getPost: async (slug) => {
        const { data } = await table(await getClient(), 'news_posts').select('*').eq('slug', slug).maybeSingle()
        const post = data ? toPost(data as PostRow) : null
        // A draft reaching this by its address is not a published piece. The policy already
        // refuses it to anybody but the committee; this is so an admin's own preview of a
        // draft does not appear on the public page as though it were up.
        return post?.publishedAt && !post.hidden ? post : null
      },

      listAnnouncements: async (viewer: Viewer) => {
        /*
         * Both audiences are asked for, and the policies decide which come back: a visitor has
         * no policy admitting a members-only notice, so asking for one costs nothing and gets
         * nothing. Asking only for 'public' was the bug — it meant a notice written for members
         * was unreachable by them even once a policy existed to allow it.
         *
         * The dates are still Postgres's, sent as the literal `now`, which it resolves itself.
         * They are here as well as in the policies because of the admin: `admins read every
         * notice` admits drafts and expired ones, so without this an admin visiting the public
         * page would see notices nobody else could, including ones not published yet.
         */
        const { data } = await table(await getClient(), 'announcements')
          .select('*')
          .in('audience', isMember(viewer) ? ['public', 'members'] : ['public'])
          .lte('publish_at', 'now')
          .or('expires_at.is.null,expires_at.gt.now')
        return ((data ?? []) as NoticeRow[]).map(toNotice).sort(byPinnedThenNewest)
      },

      listNewsletters: async () => {
        const { data } = await table(await getClient(), 'newsletters').select('*').order('issued_on', { ascending: false })
        return ((data ?? []) as NewsletterRow[]).map(
          (row): Newsletter => ({ id: row.id, title: row.title, fileUrl: row.file_url, issuedOn: row.issued_on }),
        )
      },

      listAllPosts: async (viewer: Viewer) => (isAdmin(viewer) ? posts() : []),

      listAllAnnouncements: async (viewer: Viewer) => {
        if (!isAdmin(viewer)) return []
        const { data } = await table(await getClient(), 'announcements').select('*')
        return ((data ?? []) as NoticeRow[]).map(toNotice).sort(byPinnedThenNewest)
      },

      createPost: async (draft: NewsDraft) => {
        if (!isValid(validateNews(draft))) throw new NotAllowed('that piece is not finished')
        const { data, error } = await table(await getClient(), 'news_posts')
          .insert({
            ...fromPost(draft),
            slug: slugFrom(draft.title),
            published_at: draft.published ? now().toISOString() : null,
            hidden: false,
          })
          .select('*')
          .single()
        if (error || !data) refuse('only the committee can write here', error)
        return toPost(data as PostRow)
      },

      updatePost: async (id: string, draft: NewsDraft) => {
        if (!isValid(validateNews(draft))) throw new NotAllowed('that piece is not finished')
        const existing = await rereadPost(id)
        const { error } = await table(await getClient(), 'news_posts')
          .update({
            ...fromPost(draft),
            /*
             * Publishing stamps the date the first time only, and taking a piece down sets
             * `hidden` rather than clearing the date — so a round-up of April that came down
             * for a week goes back up dated April, where it belongs, instead of at the top.
             */
            published_at: draft.published ? (existing.publishedAt ?? now().toISOString()) : existing.publishedAt ?? null,
            hidden: !draft.published,
          })
          .eq('id', id)
        if (error) refuse('only the committee can write here', error)
        return rereadPost(id)
      },

      createAnnouncement: async (draft: AnnouncementDraft) => {
        if (!isValid(validateAnnouncement(draft))) throw new NotAllowed('that notice is not ready')
        const { data, error } = await table(await getClient(), 'announcements')
          .insert(fromNotice(draft, now().toISOString()))
          .select('*')
          .single()
        if (error || !data) refuse('only the committee can post a notice', error)
        return toNotice(data as NoticeRow)
      },

      updateAnnouncement: async (id: string, draft: AnnouncementDraft) => {
        if (!isValid(validateAnnouncement(draft))) throw new NotAllowed('that notice is not ready')
        const { data: before } = await table(await getClient(), 'announcements').select('publish_at').eq('id', id).maybeSingle()
        if (!before) throw new NotAllowed('no such notice')
        const { data, error } = await table(await getClient(), 'announcements')
          .update(fromNotice(draft, (before as { publish_at: string }).publish_at))
          .eq('id', id)
          .select('*')
          .maybeSingle()
        if (error) refuse('only the committee can post a notice', error)
        if (!data) throw new NotAllowed('no such notice')
        return toNotice(data as NoticeRow)
      },

      removePost: async (id: string) => {
        const { data, error } = await table(await getClient(), 'news_posts').delete().eq('id', id).select('id').maybeSingle()
        if (error) refuse('only the committee can do that', error)
        // The policy matched nothing, so there was nothing there to delete — as far as you know.
        if (!data) throw new NotAllowed('no such piece')
      },

      removeAnnouncement: async (id: string) => {
        const { data, error } = await table(await getClient(), 'announcements').delete().eq('id', id).select('id').maybeSingle()
        if (error) refuse('only the committee can take that down', error)
        // The policy matched nothing, so there was nothing there to take down — as far as you know.
        if (!data) throw new NotAllowed('no such notice')
      },
  }
}

/** The same methods, on the client that carries the signed-in session. */
export function withSupabaseNews(base: ApiClient, config: SupabaseConfig, now = () => new Date()): ApiClient {
  return { ...base, news: newsMethods(() => dataClient(config), now) }
}
