import type { SupabaseClient } from '@supabase/supabase-js'
import { inOrder, pinnedCover, type Album, type AlbumDraft, type AlbumWithMedia, type Media } from '@/domain/gallery'
import { isAdmin, type Viewer } from '@/domain/household'
import { NotAllowed } from '../mock'
import type { ApiClient } from '../types'
import type { SupabaseConfig } from '../supabase'
import { deletePhoto, keyOf, readUploadConfig, type UploadConfig, type UploadedPhoto } from '../uploads'
import { accessToken, dataClient } from '@/lib/auth/supabaseAuth'

type AlbumRow = {
  id: string
  slug: string
  title: string
  description: string | null
  event_slug: string | null
  festival_id: string | null
  cover_media_id: string | null
  published_at: string
  visibility: 'public' | 'members'
}

type MediaRow = {
  id: string
  album_id: string
  type: 'photo' | 'video'
  url: string
  thumbnail_url: string
  caption: string | null
  approved: boolean
  position: number | null
}

export function toAlbum(row: AlbumRow): Album {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    publishedAt: row.published_at,
    visibility: row.visibility,
    ...(row.description ? { description: row.description } : {}),
    ...(row.event_slug ? { eventId: row.event_slug } : {}),
    ...(row.festival_id ? { festivalId: row.festival_id } : {}),
    ...(row.cover_media_id ? { coverMediaId: row.cover_media_id } : {}),
  }
}

export function toMedia(row: MediaRow): Media {
  return {
    id: row.id,
    albumId: row.album_id,
    type: row.type,
    url: row.url,
    thumbnailUrl: row.thumbnail_url,
    approved: row.approved,
    ...(row.caption ? { caption: row.caption } : {}),
    ...(row.position !== null ? { position: row.position } : {}),
  }
}

/** The same address the mock gives an album, so the two cannot disagree about a title. */
export const slugOf = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/**
 * What the adapter needs that is not the database.
 *
 * Taking a photograph down is two removals, and the bucket's is the one the privacy page is
 * about. So the adapter has to be able to reach the bucket — through the same function the
 * browser uploads with — and to sign that request as the person doing it.
 */
export type GalleryDeps = {
  uploads: UploadConfig | null
  token: () => Promise<string | null>
  removeObject: (config: UploadConfig, key: string, token: string) => Promise<void>
}

export function galleryMethods(getClient: () => Promise<SupabaseClient>, deps: GalleryDeps): ApiClient['gallery'] {
  const table = (client: SupabaseClient, name: 'albums' | 'media') => client.schema('portal').from(name)

  const refuse = (message: string, error: { code?: string; message: string } | null): never => {
    if (error?.code === '23505') throw new NotAllowed('there is already an album with that name')
    if (error?.code === '42501') throw new NotAllowed(message)
    throw new Error(error?.message ?? message)
  }

  /*
   * Albums with their photographs, the way every read here wants them.
   *
   * Which albums come back is the policies' decision, not this query's: a visitor asking for
   * every album is handed the public ones. `publicOnly` is for the public lists, which must
   * show public albums even to an admin who can see all of them.
   */
  const albumsWithMedia = async (publicOnly: boolean): Promise<AlbumWithMedia[]> => {
    const client = await getClient()
    let query = table(client, 'albums').select('*').order('published_at', { ascending: false })
    if (publicOnly) query = query.eq('visibility', 'public')
    const { data: albumRows } = await query
    const albums = ((albumRows ?? []) as AlbumRow[]).map(toAlbum)
    if (albums.length === 0) return []

    const { data: mediaRows } = await table(client, 'media')
      .select('*')
      .in('album_id', albums.map((a) => a.id))
    const media = ((mediaRows ?? []) as MediaRow[]).map(toMedia)

    return albums.map((album) => {
      const own = inOrder(media.filter((m) => m.albumId === album.id && m.approved))
      // A pinned cover wins. Where none is pinned — most albums — a different photograph fronts
      // it on each fetch, so one face is not the whole of an evening every time somebody visits.
      const cover = pinnedCover(album, own) ?? (own.length ? own[Math.floor(Math.random() * own.length)] : undefined)
      return { ...album, media: own, ...(cover ? { cover } : {}) }
    })
  }

  const reread = async (client: SupabaseClient, id: string): Promise<Album> => {
    const { data } = await table(client, 'albums').select('*').eq('id', id).maybeSingle()
    if (!data) throw new NotAllowed('no such album')
    return toAlbum(data as AlbumRow)
  }

  return {
    listRecentMedia: async (limit = 6) => {
      const pool = (await albumsWithMedia(true)).flatMap((a) => a.media)
      for (let i = pool.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[pool[i], pool[j]] = [pool[j], pool[i]]
      }
      return pool.slice(0, limit)
    },
    listAlbums: () => albumsWithMedia(true),
    getAlbum: async (slug) => (await albumsWithMedia(true)).find((a) => a.slug === slug) ?? null,
    // Presentation, not protection: the policies already hide members' albums from anybody
    // else. This keeps the contract's promise of an empty list rather than the public ones.
    listAllAlbums: async (viewer: Viewer) => (isAdmin(viewer) ? albumsWithMedia(false) : []),

    createAlbum: async (draft: AlbumDraft) => {
      if (draft.title.trim().length < 2) throw new NotAllowed('an album needs a name')
      const client = await getClient()
      const { data, error } = await table(client, 'albums')
        .insert({
          slug: slugOf(draft.title),
          title: draft.title.trim(),
          description: draft.description?.trim() || null,
          event_slug: draft.eventId || null,
          festival_id: draft.festivalId || null,
          visibility: draft.visibility,
        })
        .select('*')
        .single()
      if (error || !data) refuse('only the committee can make an album', error)
      return toAlbum(data as AlbumRow)
    },

    updateAlbum: async (id: string, draft: AlbumDraft) => {
      if (draft.title.trim().length < 2) throw new NotAllowed('an album needs a name')
      const client = await getClient()
      const { data, error } = await table(client, 'albums')
        .update({
          title: draft.title.trim(),
          description: draft.description?.trim() || null,
          event_slug: draft.eventId || null,
          festival_id: draft.festivalId || null,
          visibility: draft.visibility,
        })
        .eq('id', id)
        .select('*')
        .maybeSingle()
      if (error) refuse('only the committee can change an album', error)
      if (!data) throw new NotAllowed('no such album')
      return toAlbum(data as AlbumRow)
    },

    addMedia: async (albumId: string, photo: UploadedPhoto) => {
      const client = await getClient()
      const { count } = await table(client, 'media').select('id', { count: 'exact', head: true }).eq('album_id', albumId)
      const { data, error } = await table(client, 'media')
        .insert({
          album_id: albumId,
          type: 'photo',
          url: photo.url,
          thumbnail_url: photo.thumbnailUrl,
          approved: true,
          // At the end: the order the committee put them in is the order they arrived.
          position: count ?? 0,
        })
        .select('*')
        .single()
      if (error || !data) refuse('only the committee can do that', error)
      return toMedia(data as MediaRow)
    },

    setCover: async (albumId: string, mediaId: string) => {
      const client = await getClient()
      // A photograph from another album would front one evening with another's picture.
      const { data: inAlbum } = await table(client, 'media').select('id').eq('id', mediaId).eq('album_id', albumId).maybeSingle()
      if (!inAlbum) throw new NotAllowed('that photograph is not in this album')
      const { error } = await table(client, 'albums').update({ cover_media_id: mediaId }).eq('id', albumId)
      if (error) refuse('only the committee can do that', error)
      return reread(client, albumId)
    },

    setCaption: async (mediaId: string, caption: string) => {
      const client = await getClient()
      const { data, error } = await table(client, 'media')
        .update({ caption: caption.trim() || null })
        .eq('id', mediaId)
        .select('*')
        .maybeSingle()
      if (error) refuse('only the committee can do that', error)
      if (!data) throw new NotAllowed('no such photograph')
      return toMedia(data as MediaRow)
    },

    reorder: async (albumId: string, mediaIds: string[]) => {
      const client = await getClient()
      const { data } = await table(client, 'media').select('*').eq('album_id', albumId)
      const inAlbum = ((data ?? []) as MediaRow[]).map(toMedia)
      // Every photograph, once each: a partial list would silently drop the rest to the end.
      const same =
        inAlbum.length === mediaIds.length &&
        inAlbum.every((x) => mediaIds.includes(x.id)) &&
        new Set(mediaIds).size === mediaIds.length
      if (!same) throw new NotAllowed('that is not this album, in one piece')
      const results = await Promise.all(
        mediaIds.map((id, position) => table(client, 'media').update({ position }).eq('id', id)),
      )
      const failed = results.find((r) => r.error)?.error ?? null
      if (failed) refuse('only the committee can do that', failed)
      return inOrder(inAlbum.map((m) => ({ ...m, position: mediaIds.indexOf(m.id) })))
    },

    /**
     * The object first, then the row.
     *
     * The privacy page promises a photograph comes down on request, and a row deleted while the
     * file stays at its URL has broken that promise while appearing to keep it. So the bucket
     * goes first, and if it refuses, the row stays and the screen still shows the picture —
     * which is the truth. A photograph served from somewhere that is not our bucket is not ours
     * to delete there; only its row goes.
     */
    deleteMedia: async (id: string) => {
      const client = await getClient()
      const { data } = await table(client, 'media').select('*').eq('id', id).maybeSingle()
      if (!data) throw new NotAllowed('no such photograph')
      const media = toMedia(data as MediaRow)

      const key = deps.uploads ? keyOf(deps.uploads, media.url) : null
      if (key) {
        const token = await deps.token()
        if (!token) throw new NotAllowed('sign in first')
        await deps.removeObject(deps.uploads!, key, token)
      } else if (!deps.uploads && /\/full\/[a-z0-9-]+\.jpg$/.test(media.url)) {
        // It looks like one of ours and there is no bucket configured to remove it from.
        // Deleting the row alone would be the broken promise, so: refuse, and say why.
        throw new NotAllowed('the bucket is not configured, so this photograph cannot be taken down from here')
      }

      const { data: gone, error } = await table(client, 'media').delete().eq('id', id).select('id').maybeSingle()
      if (error) refuse('only the committee can do that', error)
      if (!gone) throw new NotAllowed('no such photograph')
    },
  }
}

/** The gallery on the client that carries the signed-in session, reaching the bucket as that person. */
export function withSupabaseGallery(base: ApiClient, config: SupabaseConfig, env: Record<string, string | undefined>): ApiClient {
  const deps: GalleryDeps = {
    uploads: readUploadConfig(env),
    token: () => accessToken(config),
    removeObject: (uploads, key, token) => deletePhoto(uploads, key, token),
  }
  return { ...base, gallery: galleryMethods(() => dataClient(config), deps) }
}
