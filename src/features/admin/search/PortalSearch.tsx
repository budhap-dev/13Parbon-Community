import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'
import { useSettings } from '@/app/SettingsContext'
import { Button } from '@/components/Button'
import { Icon, type IconName } from '@/components/Icon'
import {
  useAllAlbums,
  useAllAnnouncements,
  useAllEvents,
  useAllFeedback,
  useAllPolls,
  useAllPosts,
  useAllQuizzes,
  useContactMessages,
  useHouseholds,
} from '@/lib/api'
import { useNow } from '@/lib/clock'
import { buildSearchIndex, searchIndex, type SearchItem, type SearchKind } from './searchIndex'
import styles from './PortalSearch.module.css'

export type SearchScreen = { label: string; to: string; icon: IconName }

const KIND_ICON: Record<Exclude<SearchKind, 'screen'>, IconName> = {
  household: 'users',
  event: 'calendar',
  post: 'file',
  notice: 'megaphone',
  album: 'image',
  message: 'message',
  feedback: 'heart',
  poll: 'sparkle',
  quiz: 'sparkle',
  setting: 'layout',
}

/** ⌘ on a Mac, Ctrl everywhere else: the label says whichever this keyboard has. */
const onAMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)

/**
 * The committee's search: one box that finds a household, an evening, a message, a festival,
 * and takes you to it already open.
 *
 * Committee only, by where it is put rather than by anything in here — the portal's member
 * screens are three, and there is nothing of theirs to look for. It opens from ⌘K / Ctrl+K
 * anywhere in the portal, or from a `SearchButton`: the one at the top of the sidebar, or on a
 * phone the one in the bar, where the sidebar is a drawer and two taps away.
 */
export function PortalSearch({
  screens,
  open,
  setOpen,
}: {
  screens: readonly SearchScreen[]
  open: boolean
  setOpen: (next: boolean | ((now: boolean) => boolean)) => void
}) {
  useEffect(() => {
    const keys = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((now) => !now)
      }
    }
    window.addEventListener('keydown', keys)
    return () => window.removeEventListener('keydown', keys)
  }, [setOpen])

  return open ? <SearchDialog screens={screens} onClose={() => setOpen(false)} /> : null
}

/**
 * What opens the search, in the header: a box that says Search and ⌘K on a wide screen, and on a
 * phone just the glass — the same button, so it has one name to a screen reader either way.
 */
export function SearchButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      className={[styles.trigger, className].filter(Boolean).join(' ')}
      aria-haspopup="dialog"
      aria-keyshortcuts="Meta+K Control+K"
      onClick={onClick}
    >
      <Icon name="search" size={18} />
      <span className={styles.label}>Search</span>
      <kbd className={styles.kbd} aria-hidden="true">
        {onAMac() ? '⌘K' : 'Ctrl K'}
      </kbd>
    </button>
  )
}

/**
 * The box and its answers. Only mounted while open, so the lists it searches are asked for when
 * somebody goes to search and not on every screen of the portal — and most of them are already
 * in hand, because they are the same queries the committee's screens make.
 */
function SearchDialog({ screens, onClose }: { screens: readonly SearchScreen[]; onClose: () => void }) {
  const navigate = useNavigate()
  const settings = useSettings()
  // The moment the box opened, which is close enough to say whether a poll is open yet.
  const [now] = useState(useNow())
  const households = useHouseholds()
  const events = useAllEvents()
  const posts = useAllPosts()
  const notices = useAllAnnouncements()
  const albums = useAllAlbums()
  const messages = useContactMessages()
  const feedback = useAllFeedback()
  const polls = useAllPolls()
  const quizzes = useAllQuizzes()
  const lists = [households, events, posts, notices, albums, messages, feedback, polls, quizzes]
  const stillLoading = lists.some((list) => list.isPending)
  // A list that failed is not a list with nothing in it: what somebody is looking for may well
  // be in the one that did not arrive.
  const failed = lists.filter((list) => list.isError)
  const retry = () => failed.forEach((list) => void list.refetch())

  const index = useMemo(
    () =>
      buildSearchIndex({
        screens,
        households: households.data,
        events: events.data,
        posts: posts.data,
        notices: notices.data,
        albums: albums.data,
        messages: messages.data,
        feedback: feedback.data,
        polls: polls.data?.map((row) => row.poll),
        quizzes: quizzes.data?.map((row) => row.quiz),
        settings,
        now,
      }),
    // Rebuilt when a list arrives or changes, not on every keystroke.
    [screens, households.data, events.data, posts.data, notices.data, albums.data, messages.data, feedback.data, polls.data, quizzes.data, settings, now],
  )

  const [query, setQuery] = useState('')
  const groups = useMemo(() => searchIndex(index, query), [index, query])
  const flat = groups.flatMap((group) => group.items)
  const [active, setActive] = useState(0)
  // A new search starts at the top of its own answers.
  const [answeredFor, setAnsweredFor] = useState(query)
  if (answeredFor !== query) {
    setAnsweredFor(query)
    setActive(0)
  }
  const current = flat[Math.min(active, flat.length - 1)] as SearchItem | undefined

  const id = useId()
  const optionId = (item: SearchItem) => `${id}-${item.key}`
  const panel = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  /** Whether closing should hand the focus back to where it was, which choosing should not. */
  const giveBack = useRef(true)

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    input.current?.focus()
    return () => {
      if (giveBack.current) before?.focus?.()
      // Somewhere to be when the address changed only after the `?`, which moves nothing else.
      else document.getElementById('portal-main')?.focus({ preventScroll: true })
    }
  }, [])

  // The chosen row stays in sight as the arrows move past the bottom of the list.
  const currentId = current ? optionId(current) : undefined
  useEffect(() => {
    if (currentId) document.getElementById(currentId)?.scrollIntoView?.({ block: 'nearest' })
  }, [currentId])

  const choose = (item: SearchItem) => {
    // The screen it opens takes the focus, the way arriving on any screen of the portal does.
    giveBack.current = false
    onClose()
    navigate(item.to)
  }

  const keys = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onClose()
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (flat.length === 0) return
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((Math.min(active, flat.length - 1) + step + flat.length) % flat.length)
      return
    }
    if (event.key === 'Enter' && current && event.target === input.current) {
      event.preventDefault()
      choose(current)
      return
    }
    if (event.key !== 'Tab') return
    // The box and the close button, and round again: the page behind is not reachable from here.
    const focusable = panel.current?.querySelectorAll<HTMLElement>('input, button') ?? []
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }

  const found = flat.length
  const typed = query.trim()

  return createPortal(
    <div
      className={styles.backdrop}
      onKeyDown={keys}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div ref={panel} className={styles.panel} role="dialog" aria-modal="true" aria-label="Search the portal">
        <div className={styles.field}>
          <Icon name="search" size={19} className={styles.fieldIcon} />
          <input
            ref={input}
            className={styles.input}
            type="search"
            role="combobox"
            aria-label="Search households, evenings, messages and settings"
            aria-expanded={found > 0}
            aria-controls={`${id}-results`}
            aria-autocomplete="list"
            aria-activedescendant={currentId}
            placeholder="Search households, evenings, messages, settings…"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="button" className={styles.close} onClick={onClose}>
            Esc<span className={styles.srOnly}> — close the search</span>
          </button>
        </div>

        <div className={styles.results}>
          {found === 0 && stillLoading ? (
            <p className={styles.empty}>Still fetching the lists…</p>
          ) : found === 0 && failed.length > 0 ? (
            <div className={styles.empty} role="alert">
              <p style={{ margin: '0 0 12px' }}>
                Nothing matches “{typed}” in what arrived, but some of the lists could not be fetched just now, so it may
                still be there.
              </p>
              <Button onClick={retry} variant="line" size="sm">
                Try again
              </Button>
            </div>
          ) : found === 0 ? (
            <p className={styles.empty}>Nothing matches “{typed}”.</p>
          ) : (
            <div id={`${id}-results`} role="listbox" aria-label="Results">
              {groups.map((group) => (
                <div key={group.kind} role="group" aria-labelledby={`${id}-${group.kind}`} className={styles.group}>
                  <div id={`${id}-${group.kind}`} role="presentation" className={styles.groupLabel}>
                    {group.label}
                    {group.more > 0 ? <span className={styles.more}> · {group.more} more, keep typing to narrow it</span> : null}
                  </div>
                  {group.items.map((item) => {
                    const on = item.key === current?.key
                    const icon = item.kind === 'screen' ? (screens.find((s) => s.to === item.to)?.icon ?? 'grid') : KIND_ICON[item.kind]
                    return (
                      <div
                        key={item.key}
                        id={optionId(item)}
                        role="option"
                        aria-selected={on}
                        className={on ? styles.optionOn : styles.option}
                        // Keeps the focus in the box, so the arrows still work after a click lands.
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseMove={() => {
                          if (!on) setActive(flat.indexOf(item))
                        }}
                        onClick={() => choose(item)}
                      >
                        <Icon name={icon} size={17} className={styles.optionIcon} />
                        <span className={styles.optionText}>
                          <span className={styles.optionTitle}>{item.title}</span>
                          {item.detail ? <span className={styles.optionDetail}>{item.detail}</span> : null}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        <p className={styles.foot} role="status">
          {typed ? `${found} ${found === 1 ? 'result' : 'results'}${stillLoading ? ', still fetching some lists' : failed.length > 0 ? ', though some lists could not be fetched' : ''}.` : 'Type to search, or pick a screen.'}{' '}
          <span aria-hidden="true">↑↓ to move · Enter to open</span>
        </p>
      </div>
    </div>,
    document.body,
  )
}
