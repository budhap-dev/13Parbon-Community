import { useState } from 'react'
import { Link } from 'react-router'
import { useSettings } from '@/app/SettingsContext'
import { newsflashesUp, stillClosed, type Newsflash, type NewsflashColour } from '@/domain/newsflash'
import { useNow } from '@/lib/clock'
import { Container } from './Container'
import { Icon, type IconName } from './Icon'
import styles from './NewsflashRibbon.module.css'

/**
 * Which newsflashes this visitor has closed, kept in their own browser and never sent anywhere.
 * The privacy notice says so; change one and change the other.
 */
export const NEWSFLASH_CLOSED_KEY = '13parbon:newsflash-closed'

function readClosed(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(NEWSFLASH_CLOSED_KEY) ?? '[]')
    return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

function writeClosed(ids: string[]) {
  try {
    localStorage.setItem(NEWSFLASH_CLOSED_KEY, JSON.stringify(ids))
  } catch {
    // A browser that will not store it shows the newsflash again next time. Nothing worse.
  }
}

const ICONS: Record<NewsflashColour, IconName> = {
  theme: 'sparkle',
  gold: 'sparkle',
  dark: 'megaphone',
  alert: 'info',
}

/**
 * The committee's newsflashes, in a ribbon under the header on every public page.
 *
 * Up to three share it, with arrows between them. Draws nothing when none is up.
 */
export function NewsflashRibbon() {
  const { newsflashes } = useSettings()
  const now = useNow()
  const [closed, setClosed] = useState<string[]>(readClosed)
  const [at, setAt] = useState(0)

  const up = newsflashesUp(newsflashes, now, closed)
  if (up.length === 0) return null
  const index = Math.min(at, up.length - 1)
  const flash = up[index]

  const close = () => {
    // Only ids still in the list are kept, so the key does not grow for ever.
    const next = stillClosed([...closed, flash.id], newsflashes)
    setClosed(next)
    writeClosed(next)
    setAt(0)
  }

  return (
    <section className={styles.ribbon} data-colour={flash.colour} data-animation={flash.animation} aria-label="News from the committee">
      <Container className={styles.inner}>
        <Body flash={flash} />
        {flash.to ? (
          <Link to={flash.to} className={styles.button}>
            {flash.button || 'Take a look'}
            <Icon name="chevronRight" size={16} />
          </Link>
        ) : null}
        {up.length > 1 ? (
          <div className={styles.pager}>
            <button
              type="button"
              className={styles.iconButton}
              aria-label="Previous newsflash"
              onClick={() => setAt((index - 1 + up.length) % up.length)}
            >
              <Icon name="chevronLeft" size={20} />
            </button>
            <span className={styles.position} aria-live="polite">
              {index + 1} of {up.length}
            </span>
            <button
              type="button"
              className={styles.iconButton}
              aria-label="Next newsflash"
              onClick={() => setAt((index + 1) % up.length)}
            >
              <Icon name="chevronRight" size={20} />
            </button>
          </div>
        ) : null}
        {/* Its room is kept when there is nothing to close, so the arrows stay where the
            pointer left them as the newsflashes change. */}
        {flash.closable ? (
          <button type="button" className={`${styles.iconButton} ${styles.close}`} aria-label="Close this newsflash" onClick={close}>
            <Icon name="close" size={20} />
          </button>
        ) : up.length > 1 ? (
          <span className={styles.close} aria-hidden="true" />
        ) : null}
      </Container>
    </section>
  )
}

type WordsOf = Pick<Newsflash, 'colour' | 'animation' | 'tag' | 'tagBn' | 'headlineBn' | 'headline' | 'line'>

/**
 * The words, run as a ticker when that is the animation picked: two copies end to end, sliding
 * half their width so the loop has no seam. Only the first is read out.
 */
function Body({ flash }: { flash: WordsOf }) {
  if (flash.animation !== 'marquee') return <Words flash={flash} />
  return (
    <div className={styles.marquee}>
      <div className={styles.track}>
        <Words flash={flash} />
        <Words flash={flash} hidden />
      </div>
    </div>
  )
}

/** The tag, the headline and the line. Shared with the portal's preview, so the two cannot differ. */
function Words({ flash, hidden }: { flash: WordsOf; hidden?: boolean }) {
  return (
    <div className={hidden ? `${styles.words} ${styles.copy}` : styles.words} aria-hidden={hidden || undefined}>
      <span className={styles.tag}>
        <Icon name={ICONS[flash.colour]} size={14} />
        {flash.tagBn ? (
          <>
            <span lang="bn" className={styles.bn}>
              {flash.tagBn}
            </span>
            <span aria-hidden="true"> · </span>
          </>
        ) : null}
        <span>{flash.tag}</span>
      </span>
      {/* Bengali on one line and English on the next, so neither has to be read through the other. */}
      <p className={styles.text}>
        {flash.headlineBn ? (
          <strong lang="bn" className={styles.headlineBn}>
            {flash.headlineBn}
          </strong>
        ) : null}
        {flash.headline || flash.line ? (
          <span className={styles.english}>
            {flash.headline ? <strong className={styles.headline}>{flash.headline}</strong> : null}
            {flash.headline && flash.line ? ' ' : null}
            {flash.line ? <span>{flash.line}</span> : null}
          </span>
        ) : null}
      </p>
    </div>
  )
}

/** The ribbon as it will look, for the portal: the same colours and words, nothing that moves. */
export function NewsflashPreview({ flash }: { flash: Newsflash }) {
  return (
    // Keyed by its animation, so picking "drops in" in the portal plays it again to be seen.
    <div key={flash.animation} className={`${styles.ribbon} ${styles.preview}`} data-colour={flash.colour} data-animation={flash.animation}>
      <div className={styles.inner}>
        <Body flash={{ ...flash, tag: flash.tag || 'New feature', headline: flash.headline || (flash.headlineBn ? '' : 'Your headline') }} />
        {flash.to ? (
          <span className={styles.button}>
            {flash.button || 'Take a look'}
            <Icon name="chevronRight" size={16} />
          </span>
        ) : null}
        {flash.closable ? <Icon name="close" size={20} /> : null}
      </div>
    </div>
  )
}
