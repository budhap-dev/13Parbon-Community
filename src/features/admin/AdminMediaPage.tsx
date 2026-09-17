import { useState } from 'react'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { Lightbox, type LightboxItem } from '@/components/Lightbox'
import { PhotoUpload } from '@/components/PhotoUpload'
import { ACCEPTED_LABEL } from '@/domain/images'
import { describeMedia, type AlbumDraft, type AlbumWithMedia } from '@/domain/gallery'
import { formatLongDate } from '@/domain/dates'
import { useAddMedia, useAllAlbums, useCreateAlbum, useDeleteMedia, useReorderMedia, useSetCaption, useUpdateAlbum } from '@/lib/api'
import { readSupabaseConfig } from '@/lib/api/supabase'
import { readUploadConfig, uploadPhoto, UploadNotConfigured } from '@/lib/api/uploads'
import { accessToken } from '@/lib/auth/supabaseAuth'
import { slugFrom } from '@/domain/slug'
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
            deleting one really deletes it.
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
  const setCaption = useSetCaption()
  const reorder = useReorderMedia()
  const remove = useDeleteMedia()
  const add = useAddMedia()
  const uploads = readUploadConfig(import.meta.env)
  const supabase = readSupabaseConfig(import.meta.env)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [open, setOpen] = useState<number | null>(null)
  /** The photograph being dragged, and the one it is currently over. */
  const [dragging, setDragging] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)

  const ids = album.media.map((m) => m.id)

  const move = (from: number, to: number) => {
    if (to < 0 || to >= ids.length || from === to) return
    const next = [...ids]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    reorder.mutate({ albumId: album.id, mediaIds: next })
  }

  const items: LightboxItem[] = album.media.map((m) => ({
    id: m.id,
    src: m.url,
    alt: m.caption ?? '',
    caption: m.caption,
  }))

  /**
   * Deleting from the viewer.
   *
   * On the last photograph the viewer closes, because there is nothing left to look at;
   * otherwise it stays open and steps back if it was showing the end of the album.
   */
  const deleteFromViewer = (id: string, index: number) => {
    remove.mutate(id, {
      onSuccess: () => {
        setConfirming(null)
        if (album.media.length <= 1) setOpen(null)
        else if (index >= album.media.length - 1) setOpen(album.media.length - 2)
      },
    })
  }

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <h1 className={styles.title}>{album.title}</h1>
          <p className={styles.sub}>
            {album.media.length} {album.media.length === 1 ? 'photograph' : 'photographs'}. Open one to
            see it large, and drag them to change the order — or focus one and use the arrow keys.
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
          <PhotoUpload
            canSend={Boolean(uploads && supabase)}
            label="Add photographs"
            multiple
            onSend={async (prepared, name, index) => {
              if (!uploads || !supabase) throw new UploadNotConfigured()
              // The function asks the database whether this person is on the committee, with
              // their own token, before it signs anything.
              const token = await accessToken(supabase)
              if (!token) throw new Error('Sign in first.')
              /*
               * The album's address and the next number in it. Keys are what the bucket is
               * organised by and what a takedown names, so they are made here rather than taken
               * from the filename — two phones both offering IMG_0042.jpg would otherwise have
               * the second quietly overwrite the first.
               *
               * `index` is what makes a batch safe. The album has not grown by the time the
               * second photograph is signed, so counting from its length alone would hand the
               * same number to every picture in the drop, and the bucket would keep the last.
               */
              const key = `${album.slug}-${String(album.media.length + 1 + index).padStart(2, '0')}-${slugFrom(name.replace(/\.[^.]+$/, '')).slice(0, 24) || 'photo'}`
              return uploadPhoto(uploads, key, prepared, token)
            }}
            onDone={(url) =>
              add.mutate({
                albumId: album.id,
                photo: { url, thumbnailUrl: url.replace('/full/', '/thumb/') },
              })
            }
          />
          {add.isError ? (
            <p className={`${styles.muted} ${styles.tiny}`} role="alert">
              It reached the bucket but the album did not take it. {add.error.message}
            </p>
          ) : null}
        </div>
      </section>

      {album.media.length === 0 ? (
        <p className={styles.empty}>Nothing in this album yet.</p>
      ) : (
        <ul className={media.grid}>
          {album.media.map((item, i) => (
            <li
              key={item.id}
              className={[media.card, dragging === i ? media.dragging : '', over === i && dragging !== i ? media.over : '']
                .filter(Boolean)
                .join(' ')}
              draggable
              onDragStart={(e) => {
                setDragging(i)
                e.dataTransfer.effectAllowed = 'move'
                // Firefox will not begin a drag unless something is on the transfer.
                e.dataTransfer.setData('text/plain', item.id)
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                setOver(i)
              }}
              onDrop={(e) => {
                e.preventDefault()
                if (dragging !== null) move(dragging, i)
                setDragging(null)
                setOver(null)
              }}
              onDragEnd={() => {
                setDragging(null)
                setOver(null)
              }}
            >
              <div className={media.frame}>
                <button
                  type="button"
                  className={media.open}
                  onClick={() => setOpen(i)}
                  aria-label={`Open ${describeMedia(item)}. Arrow keys move it.`}
                  onKeyDown={(e) => {
                    // Dragging is for a mouse and a thumb. This is the same job for a keyboard,
                    // and without it the only way to reorder would be one nobody can reach.
                    if (e.key === 'ArrowLeft') {
                      e.preventDefault()
                      move(i, i - 1)
                    } else if (e.key === 'ArrowRight') {
                      e.preventDefault()
                      move(i, i + 1)
                    }
                  }}
                >
                  <img src={item.thumbnailUrl} alt={item.caption ?? ''} className={media.thumb} loading="lazy" />
                </button>

                <button
                  type="button"
                  className={media.trash}
                  aria-label={`Delete ${describeMedia(item)}`}
                  onClick={() => setConfirming(item.id)}
                >
                  <Icon name="trash" />
                </button>
              </div>

              {/* No visible label — the placeholder says what the box is, and under a photograph
                  that is enough. It still needs a name for anybody not looking at it, and a
                  placeholder is not one: it goes the moment somebody starts typing. */}
              <input
                className={media.input}
                aria-label="Caption"
                defaultValue={item.caption ?? ''}
                placeholder="Caption"
                onBlur={(e) => {
                  if (e.target.value !== (item.caption ?? '')) {
                    setCaption.mutate({ mediaId: item.id, caption: e.target.value })
                  }
                }}
              />

              {confirming === item.id && open === null ? (
                <div className={media.confirm} role="alert">
                  <p className={media.confirmText}>
                    Delete this photograph? It goes from the bucket first, so the address stops working for
                    everybody who has it. This cannot be undone.
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
                      Delete
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <Lightbox
        items={items}
        index={open}
        onChange={setOpen}
        onClose={() => {
          setOpen(null)
          setConfirming(null)
        }}
        renderAction={(item) => {
          const index = album.media.findIndex((m) => m.id === item.id)
          if (confirming !== item.id) {
            return (
              <Button variant="line" size="sm" onClick={() => setConfirming(item.id)}>
                <Icon name="trash" /> Delete this photograph
              </Button>
            )
          }
          return (
            <span className={styles.actions}>
              <span className={media.confirmText}>Delete for good? This cannot be undone.</span>
              <Button variant="line" size="sm" onClick={() => setConfirming(null)}>
                Keep it
              </Button>
              <Button
                variant="gold"
                size="sm"
                disabled={remove.isPending}
                onClick={() => deleteFromViewer(item.id, index)}
              >
                Delete
              </Button>
            </span>
          )
        }}
      />
    </div>
  )
}
