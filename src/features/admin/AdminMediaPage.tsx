import { useState } from 'react'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Button } from '@/components/Button'
import { ACCEPTED_LABEL } from '@/domain/images'
import { describeMedia, type AlbumDraft, type AlbumWithMedia, type Media } from '@/domain/gallery'
import { formatLongDate } from '@/domain/dates'
import {
  useAllAlbums,
  useCreateAlbum,
  useDeleteMedia,
  useReorderMedia,
  useSetCaption,
  useSetCover,
  useUpdateAlbum,
} from '@/lib/api'
import styles from '@/features/portal/Portal.module.css'
import media from './AdminMedia.module.css'

const emptyDraft: AlbumDraft = { title: '', description: '', visibility: 'public' }

export function AdminMediaPage() {
  useDocumentTitle('Photographs')
  const { data: albums, isPending } = useAllAlbums()
  const [openId, setOpenId] = useState<string | null>(null)
  const [editing, setEditing] = useState<AlbumDraft | null>(null)

  const create = useCreateAlbum()
  const update = useUpdateAlbum()

  const open = albums?.find((a) => a.id === openId) ?? null

  const saveAlbum = (draft: AlbumDraft) => {
    if (open) update.mutate({ id: open.id, draft }, { onSuccess: () => setEditing(null) })
    else create.mutate(draft, { onSuccess: () => setEditing(null) })
  }

  if (editing) {
    return (
      <AlbumForm
        draft={editing}
        onChange={setEditing}
        onSave={() => saveAlbum(editing)}
        onCancel={() => setEditing(null)}
        saving={create.isPending || update.isPending}
        error={create.isError ? create.error.message : update.isError ? update.error.message : undefined}
        existing={Boolean(open)}
      />
    )
  }

  if (open) return <AlbumPage album={open} onBack={() => setOpenId(null)} onEdit={() => setEditing(draftOf(open))} />

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <h1 className={styles.title}>Photographs</h1>
          <p className={styles.sub}>
            The albums on the website. Photographs are kept in the bucket, never in the code, so that
            taking one down really takes it down.
          </p>
        </div>
        <Button variant="gold" size="sm" onClick={() => { setOpenId(null); setEditing({ ...emptyDraft }) }}>
          New album
        </Button>
      </div>

      {isPending ? (
        <p className={styles.empty} aria-busy="true">
          Loading…
        </p>
      ) : !albums?.length ? (
        <p className={styles.empty}>No albums yet.</p>
      ) : (
        <ul className={media.albums}>
          {albums.map((album) => (
            <li key={album.id}>
              <button type="button" className={media.albumCard} onClick={() => setOpenId(album.id)}>
                {album.cover ? (
                  <img src={album.cover.thumbnailUrl} alt="" className={media.albumThumb} loading="lazy" />
                ) : (
                  <span className={media.albumThumbEmpty} aria-hidden="true" />
                )}
                <span className={media.albumBody}>
                  <strong>{album.title}</strong>
                  <span className={`${styles.muted} ${styles.tiny}`}>
                    {album.media.length} {album.media.length === 1 ? 'photograph' : 'photographs'} ·{' '}
                    {formatLongDate(album.publishedAt)}
                  </span>
                  <span className={album.visibility === 'public' ? styles.pillLive : styles.pillWait}>
                    {album.visibility === 'public' ? 'On the website' : 'Members only'}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function draftOf(album: AlbumWithMedia): AlbumDraft {
  return {
    title: album.title,
    description: album.description ?? '',
    eventId: album.eventId,
    festivalId: album.festivalId,
    visibility: album.visibility,
  }
}

function AlbumForm({
  draft,
  onChange,
  onSave,
  onCancel,
  saving,
  error,
  existing,
}: {
  draft: AlbumDraft
  onChange: (draft: AlbumDraft) => void
  onSave: () => void
  onCancel: () => void
  saving?: boolean
  error?: string
  existing: boolean
}) {
  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <h1 className={styles.title}>{existing ? 'Edit album' : 'New album'}</h1>
          <p className={styles.sub}>An album is a night, or a morning. The photographs go in afterwards.</p>
        </div>
        <Button variant="line" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      <section className={styles.panel}>
        <form
          className={`${styles.pad} ${media.form}`}
          onSubmit={(e) => {
            e.preventDefault()
            onSave()
          }}
        >
          <label className={media.field}>
            <span className={media.label}>Name</span>
            <input
              className={media.input}
              value={draft.title}
              onChange={(e) => onChange({ ...draft, title: e.target.value })}
            />
          </label>

          <label className={media.field}>
            <span className={media.label}>A line about it</span>
            <input
              className={media.input}
              value={draft.description ?? ''}
              placeholder="Where and when, in a few words"
              onChange={(e) => onChange({ ...draft, description: e.target.value })}
            />
          </label>

          <label className={media.field}>
            <span className={media.label}>Who can see it</span>
            <select
              className={media.input}
              value={draft.visibility}
              onChange={(e) => onChange({ ...draft, visibility: e.target.value as AlbumDraft['visibility'] })}
            >
              <option value="public">Anybody — it goes on the website</option>
              <option value="members">Members only — signed in, and not in search results</option>
            </select>
          </label>
          <p className={`${styles.muted} ${styles.tiny}`}>
            Members only is how a picture is kept off the website without destroying it. Taking a
            photograph down for good is done from the album itself.
          </p>

          <div className={styles.actions}>
            <Button variant="gold" type="submit" size="sm" disabled={saving}>
              {saving ? 'Saving…' : existing ? 'Save the album' : 'Make the album'}
            </Button>
            {error ? (
              <span className={media.error} role="alert">
                {error}
              </span>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  )
}

function AlbumPage({
  album,
  onBack,
  onEdit,
}: {
  album: AlbumWithMedia
  onBack: () => void
  onEdit: () => void
}) {
  const setCover = useSetCover()
  const setCaption = useSetCaption()
  const reorder = useReorderMedia()
  const remove = useDeleteMedia()
  const [confirming, setConfirming] = useState<Media | null>(null)

  const ids = album.media.map((m) => m.id)
  const move = (index: number, by: number) => {
    const next = [...ids]
    const to = index + by
    if (to < 0 || to >= next.length) return
    ;[next[index], next[to]] = [next[to], next[index]]
    reorder.mutate({ albumId: album.id, mediaIds: next })
  }

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <h1 className={styles.title}>{album.title}</h1>
          <p className={styles.sub}>
            {album.media.length} {album.media.length === 1 ? 'photograph' : 'photographs'}.{' '}
            {album.coverMediaId
              ? 'One is pinned as the album’s face.'
              : 'No cover pinned, so the album shows a different one each visit.'}
          </p>
        </div>
        <span className={styles.actions}>
          <Button variant="line" size="sm" onClick={onBack}>
            All albums
          </Button>
          <Button variant="line" size="sm" onClick={onEdit}>
            Edit album
          </Button>
        </span>
      </div>

      <section className={styles.panel}>
        <div className={styles.pad}>
          <p className={`${styles.muted} ${styles.tiny}`}>
            Uploading takes {ACCEPTED_LABEL}. Every picture is resized and re-encoded in your browser
            before it is sent, so the location, camera and date a phone writes into a photograph never
            leave your computer.
          </p>
        </div>
      </section>

      {album.media.length === 0 ? (
        <p className={styles.empty}>Nothing in this album yet.</p>
      ) : (
        <ul className={media.grid}>
          {album.media.map((item, i) => (
            <li key={item.id} className={media.card}>
              <img src={item.thumbnailUrl} alt={item.caption ?? ''} className={media.thumb} loading="lazy" />

              <label className={media.field}>
                <span className={media.label}>Caption</span>
                <input
                  className={media.input}
                  defaultValue={item.caption ?? ''}
                  placeholder="Left empty is better than a guess"
                  onBlur={(e) => {
                    if (e.target.value !== (item.caption ?? '')) {
                      setCaption.mutate({ mediaId: item.id, caption: e.target.value })
                    }
                  }}
                />
              </label>

              <div className={media.cardActions}>
                <Button
                  variant={album.coverMediaId === item.id ? 'gold' : 'line'}
                  size="sm"
                  disabled={album.coverMediaId === item.id}
                  onClick={() => setCover.mutate({ albumId: album.id, mediaId: item.id })}
                >
                  {album.coverMediaId === item.id ? 'Album’s face' : 'Make it the face'}
                </Button>
                <Button variant="line" size="sm" aria-label={`Move ${describeMedia(item)} earlier`} disabled={i === 0} onClick={() => move(i, -1)}>
                  ←
                </Button>
                <Button
                  variant="line"
                  size="sm"
                  aria-label={`Move ${describeMedia(item)} later`}
                  disabled={i === album.media.length - 1}
                  onClick={() => move(i, 1)}
                >
                  →
                </Button>
                <Button variant="line" size="sm" onClick={() => setConfirming(item)}>
                  Take down
                </Button>
              </div>

              {confirming?.id === item.id ? (
                <div className={media.confirm} role="alert">
                  <p className={media.confirmText}>
                    Take this photograph down for good? It is removed from the bucket, so the address
                    stops working for everybody who has it. This cannot be undone.
                  </p>
                  <div className={styles.actions}>
                    <Button variant="line" size="sm" onClick={() => setConfirming(null)}>
                      Keep it
                    </Button>
                    <Button
                      variant="gold"
                      size="sm"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(item.id, { onSuccess: () => setConfirming(null) })}
                    >
                      Take it down
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
