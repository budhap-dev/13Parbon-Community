import { useState } from 'react'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { useOpenFromAddress } from '@/app/useOpenFromAddress'
import { useScrollToTopOn } from '@/app/useScrollToTopOn'
import { ActionBar } from '@/components/ActionBar'
import { Button } from '@/components/Button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Icon } from '@/components/Icon'
import { Lightbox, type LightboxItem } from '@/components/Lightbox'
import { LoadFailed } from '@/components/LoadFailed'
import { PhotoUpload } from '@/components/PhotoUpload'
import { ACCEPTED_LABEL } from '@/domain/images'
import { describeMedia, type AlbumDraft, type AlbumWithMedia } from '@/domain/gallery'
import { formatLongDate } from '@/domain/dates'
import { useAddMedia, useAllAlbums, useCreateAlbum, useDeleteMedia, useReorderMedia, useSetCaption, useUpdateAlbum } from '@/lib/api'
import { readSupabaseConfig } from '@/lib/api/supabase'
import { photoKey, readUploadConfig, uploadPhoto, UploadNotConfigured } from '@/lib/api/uploads'
import { accessToken } from '@/lib/auth/supabaseAuth'
import styles from '@/features/portal/Portal.module.css'
import media from './AdminMedia.module.css'

// A new album starts unpublished, so its photographs can be checked before anybody else sees them.
const emptyDraft: AlbumDraft = { title: '', description: '', visibility: 'members' }

export function AdminMediaPage() {
  useDocumentTitle('Photographs')
  const { data: albums, isPending, isError, refetch } = useAllAlbums()
  const [openId, setOpenId] = useState<string | null>(null)
  const [editing, setEditing] = useState<AlbumDraft | null>(null)
  /** What the last album save did, said on the screen it lands on. */
  const [saved, setSaved] = useState<string | null>(null)
  // Opening an album, and opening the album form, are both swaps rather than navigations.
  useScrollToTopOn(`${openId ?? ''}|${editing ? 'form' : ''}`)
  useOpenFromAddress(albums, (album) => {
    setEditing(null)
    setOpenId(album.id)
  })

  const create = useCreateAlbum()
  const update = useUpdateAlbum()

  const open = albums?.find((a) => a.id === openId) ?? null

  const saveAlbum = (draft: AlbumDraft) => {
    setSaved(null)
    const done = (text: string) => () => {
      setEditing(null)
      setSaved(text)
    }
    if (open) update.mutate({ id: open.id, draft }, { onSuccess: done('The album is saved.') })
    else create.mutate(draft, { onSuccess: done(`${draft.title.trim() || 'The album'} is made. Open it to add the photographs.`) })
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

  if (open) {
    return (
      <AlbumPage
        album={open}
        saved={saved}
        onBack={() => {
          setSaved(null)
          setOpenId(null)
        }}
        onEdit={() => {
          setSaved(null)
          setEditing(draftOf(open))
        }}
      />
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <h1 className={styles.title}>Photographs</h1>
          <p className={styles.sub}>
            Your albums of photographs. They are kept in the site's own photo storage, so deleting
            one really deletes it.
          </p>
        </div>
        <Button variant="gold" size="sm" onClick={() => { setOpenId(null); setSaved(null); setEditing({ ...emptyDraft }) }}>
          New album
        </Button>
      </div>

      {saved ? (
        <p className={media.tookDown} role="status">
          {saved}
        </p>
      ) : null}

      {isPending ? (
        <p className={styles.empty} aria-busy="true">
          Loading…
        </p>
      ) : isError ? (
        <LoadFailed what="the albums" onRetry={() => void refetch()} />
      ) : !albums?.length ? (
        <p className={styles.empty}>No albums yet.</p>
      ) : (
        <ul className={media.albums}>
          {albums.map((album) => (
            <li key={album.id}>
              <button
                type="button"
                className={media.albumCard}
                onClick={() => {
                  setSaved(null)
                  setOpenId(album.id)
                }}
              >
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
                    {album.visibility === 'public' ? 'On the website' : 'Not published yet'}
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
          <ActionBar
            status={
              error ? (
                <span className={media.error} role="alert">
                  {error}
                </span>
              ) : null
            }
          >
            <Button variant="gold" type="submit" size="sm" disabled={saving}>
              {saving ? 'Saving…' : existing ? 'Save the album' : 'Make the album'}
            </Button>
          </ActionBar>
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
            <span className={media.label}>Published</span>
            <select
              className={media.input}
              value={draft.visibility}
              onChange={(e) => onChange({ ...draft, visibility: e.target.value as AlbumDraft['visibility'] })}
            >
              <option value="members">Not yet — only in the portal while it is checked</option>
              <option value="public">Yes — on the public website for anybody to see</option>
            </select>
          </label>
          <p className={`${styles.muted} ${styles.tiny}`}>
            Upload the photographs, look through them here, then come back and choose Yes to put the
            album on the website. Switching it back to Not yet takes it off again. Taking a photograph
            down for good is done from the album itself.
          </p>
        </form>
      </section>
    </div>
  )
}

function AlbumPage({
  album,
  saved,
  onBack,
  onEdit,
}: {
  album: AlbumWithMedia
  /** Said once the album's details have just been saved. */
  saved?: string | null
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
  /** What the last takedown did, so the screen is not silent about the one irreversible action. */
  const [taken, setTaken] = useState<{ ok: boolean; text: string } | null>(null)
  const [open, setOpen] = useState<number | null>(null)
  /** The photograph being dragged, and the one it is currently over. */
  const [dragging, setDragging] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)
  /**
   * Photographs that uploaded but did not make it into the album. Counted from each call's own
   * promise: several go at once, and the mutation's own error only remembers the last of them,
   * so one failure followed by a success would otherwise vanish.
   */
  const [notAdded, setNotAdded] = useState<{ count: number; why: string } | null>(null)

  const ids = album.media.map((m) => m.id)

  const move = (from: number, to: number) => {
    if (to < 0 || to >= ids.length || from === to) return
    // The grid only moves once the new order is saved, so a second move before then would be
    // worked out from the old one and undo the first.
    if (reorder.isPending) return
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
   * Taking a photograph down, with something to show for it either way.
   *
   * There was no failing path at all: the button disabled itself, the request went, and if the
   * bucket refused, the dialog simply sat there with the button live again. On the one action
   * the privacy page makes a promise about, a silent failure reads exactly like success — and
   * the person walks away believing a picture came down that did not.
   */
  const stopAsking = () => {
    setConfirming(null)
    // A failure belongs to the question it answered, not to the next one.
    if (taken && !taken.ok) setTaken(null)
  }

  const takeDown = (id: string, afterwards?: () => void) => {
    setTaken(null)
    remove.mutate(id, {
      onSuccess: () => {
        setConfirming(null)
        setTaken({
          ok: true,
          text: 'Taken down. It has been deleted from storage, so its address stops working for everybody who had it.',
        })
        afterwards?.()
      },
      onError: (error: unknown) => {
        setTaken({
          ok: false,
          text: `It has not been taken down. ${error instanceof Error ? error.message : 'Something went wrong.'}`,
        })
      },
    })
  }

  /**
   * Deleting from the viewer.
   *
   * On the last photograph the viewer closes, because there is nothing left to look at;
   * otherwise it stays open and steps back if it was showing the end of the album.
   */
  const deleteFromViewer = (id: string, index: number) => {
    takeDown(id, () => {
      if (album.media.length <= 1) setOpen(null)
      else if (index >= album.media.length - 1) setOpen(album.media.length - 2)
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

      {saved ? (
        <p className={media.tookDown} role="status">
          {saved}
        </p>
      ) : null}

      {/* A failure is said in the question that is still open, where it can be seen. */}
      {taken?.ok ? (
        <p className={media.tookDown} role="status">
          {taken.text}
        </p>
      ) : null}

      {reorder.isError ? (
        <p className={media.error} role="alert">
          The new order was not saved, so the photographs are still in the order they were. {reorder.error.message}
        </p>
      ) : null}

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
            onSend={async (prepared, name) => {
              if (!uploads || !supabase) throw new UploadNotConfigured()
              // The function asks the database whether this person is on the committee, with
              // their own token, before it signs anything.
              const token = await accessToken(supabase)
              if (!token) throw new Error('Sign in first.')
              /*
               * The album's address, the file's name, and something random. Keys are what the
               * bucket is organised by and what a takedown names, and they used to be the
               * album's count plus one — which comes round again after a deletion, so the new
               * photograph replaced an old one that another row still pointed at.
               */
              const key = photoKey(album.slug, name.replace(/\.[^.]+$/, '').slice(0, 24))
              return uploadPhoto(uploads, key, prepared, token)
            }}
            onDone={(url) => {
              setNotAdded(null)
              add
                .mutateAsync({
                  albumId: album.id,
                  photo: { url, thumbnailUrl: url.replace('/full/', '/thumb/') },
                })
                .catch((error: unknown) =>
                  setNotAdded((was) => ({
                    count: (was?.count ?? 0) + 1,
                    why: error instanceof Error ? error.message : 'Something went wrong.',
                  })),
                )
            }}
          />
          {add.isPending ? (
            <p className={`${styles.muted} ${styles.tiny}`} role="status">
              Adding it to the album…
            </p>
          ) : null}
          {notAdded ? (
            <p className={`${styles.muted} ${styles.tiny}`} role="alert">
              {notAdded.count === 1
                ? 'It uploaded, but could not be added to the album.'
                : `${notAdded.count} photographs uploaded, but could not be added to the album.`}{' '}
              {notAdded.why}
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
              {/* Under the box it belongs to: the caption saves on its own as somebody moves on,
                  so a failure anywhere else would be read as being about something else. */}
              {setCaption.variables?.mediaId === item.id ? (
                setCaption.isError ? (
                  <span className={media.error} role="alert">
                    That caption did not save. {setCaption.error.message}
                  </span>
                ) : setCaption.isSuccess ? (
                  <span className={`${styles.muted} ${styles.tiny}`} role="status">
                    Saved.
                  </span>
                ) : null
              ) : null}

              <ConfirmDialog
                // Not while the viewer is open: that one asks in its own action bar, because a
                // second modal over a modal would be two focus traps arguing.
                open={confirming === item.id && open === null}
                title="Delete this photograph?"
                confirmLabel="Delete"
                busyLabel="Removing…"
                busy={remove.isPending}
                error={taken && !taken.ok ? taken.text : undefined}
                onCancel={stopAsking}
                onConfirm={() => takeDown(item.id)}
              >
                It is deleted from storage first, so the address stops working for everybody who has it.
                This cannot be undone.
              </ConfirmDialog>
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
          stopAsking()
        }}
        renderAction={(item) => {
          const index = album.media.findIndex((m) => m.id === item.id)
          if (confirming !== item.id) {
            return (
              <Button variant="danger" size="sm" onClick={() => setConfirming(item.id)}>
                <Icon name="trash" /> Delete this photograph
              </Button>
            )
          }
          return (
            <span className={styles.actions}>
              <span className={media.confirmText}>Delete this photograph? This cannot be undone.</span>
              <Button variant="line" size="sm" disabled={remove.isPending} onClick={stopAsking}>
                Keep it
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={remove.isPending}
                onClick={() => deleteFromViewer(item.id, index)}
              >
                {remove.isPending ? 'Removing…' : 'Delete'}
              </Button>
              {taken && !taken.ok ? (
                <span className={media.error} role="alert">
                  {taken.text}
                </span>
              ) : null}
            </span>
          )
        }}
      />
    </div>
  )
}
