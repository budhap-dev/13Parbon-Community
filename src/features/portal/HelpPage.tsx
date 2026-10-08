import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router'
import { useSettings } from '@/app/SettingsContext'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Button } from '@/components/Button'
import { Icon, type IconName } from '@/components/Icon'
import { TAKEDOWN_PROMISE } from '@/domain/contact'
import styles from './Portal.module.css'
import help from './Help.module.css'

/*
 * The members' guide, inside the portal.
 *
 * Everything said here is something the portal actually does — the rules come from the screens
 * themselves (one vote per household, a vote that can change while the poll is open, children's
 * names never shown, sign-in by invitation). If one of those changes, this page changes with it,
 * and the test beside it checks the claims that matter most.
 *
 * The emoji are decoration and hidden from screen readers; every one sits beside words that say
 * the same thing. The animation is for people who have not asked for less of it.
 */

type Section = {
  id: string
  emoji: string
  icon: IconName
  title: string
  tagline: string
  points: ReactNode[]
}

/** One emoji, for looking at only. */
function Emoji({ children, className }: { children: string; className?: string }) {
  return (
    <span className={className ?? help.emoji} aria-hidden="true">
      {children}
    </span>
  )
}

export function HelpPage() {
  useDocumentTitle('Help')
  const { showPhotos } = useSettings()

  const sections: Section[] = [
    {
      id: 'getting-in',
      emoji: '🔑',
      icon: 'door',
      title: 'Getting in',
      tagline: 'No passwords to forget. Google remembers so you do not have to.',
      points: [
        <>
          Press <strong>Continue with Google</strong> on the sign-in page, and pick the Google account
          the committee has on record for your household.
        </>,
        <>
          Membership is by invitation. If it says your address is <em>not on the list yet</em>, the
          committee simply has not added it — <Link className={styles.inlineLink} to="/contact">send them a message</Link>{' '}
          with the Google address you used.
        </>,
        <>
          Close the tab and you are signed out. Sign out in one tab and every other tab follows — no
          stragglers left logged in on the family laptop. <Emoji>💻</Emoji>
        </>,
        <>
          The red <strong>Sign out</strong> button asks first, in case your elbow pressed it.
        </>,
      ],
    },
    {
      id: 'dashboard',
      emoji: '🏠',
      icon: 'home',
      title: 'Your dashboard',
      tagline: 'The front door. Everything for your household, on one screen.',
      points: [
        <>
          <strong>Next event</strong>, with a countdown and a button to book your places. The
          countdown is not a threat. Probably. <Emoji>⏳</Emoji>
        </>,
        <>
          <strong>Announcements</strong> from the committee — the things worth knowing this week.
        </>,
        <>
          <strong>Membership</strong>: Active or Lapsed, and the date it runs to.
        </>,
        <>
          <strong>Have your say</strong> pops up when there is a poll waiting for your vote or a quiz
          your household has not played yet.
        </>,
      ],
    },
    {
      id: 'household',
      emoji: '👪',
      icon: 'users',
      title: 'My household',
      tagline: 'What the committee holds about you — and you can fix it yourself.',
      points: [
        <>
          Open <Link className={styles.inlineLink} to="/portal/household">My household</Link> and press{' '}
          <strong>Edit</strong> to change a phone number, fix a spelling, or add a new arrival.{' '}
          <Emoji>👶</Emoji>
        </>,
        <>
          <strong>Anything the organisers should know</strong> is where a nut allergy or a wheelchair
          goes, so the evening is ready for you before you arrive.
        </>,
        <>
          Press <strong>Save changes</strong> when you are done. The portal is clever, but it is not a
          mind-reader. <Emoji>🔮</Emoji>
        </>,
        <>
          Your membership, renewal date and the Google address you sign in with are the committee's
          to change — ask them.
        </>,
      ],
    },
    {
      id: 'play',
      emoji: '🗳️',
      icon: 'sparkle',
      title: 'Polls and quizzes',
      tagline: 'One vote and one go per household — so settle it over dinner first.',
      points: [
        <>
          Pick an answer and press <strong>Vote</strong>. Changed your mind? <strong>Change our vote</strong>{' '}
          works for as long as the poll is open.
        </>,
        <>
          Votes are anonymous: nobody — the committee included — can see how your household voted.
          The only exception is a <em>named</em> poll, and it tells you so <em>before</em> you vote.{' '}
          <Emoji>🤫</Emoji>
        </>,
        <>
          Each poll says when its totals show: once you have voted, when it closes, or only to the
          committee.
        </>,
        <>
          Quizzes are one question at a time, with the answers and the reasons at the end. Untick the
          leaderboard box to appear as <em>a household</em> instead of by name.
        </>,
        <>
          Got a good question? <strong>Got an idea?</strong> on the{' '}
          <Link className={styles.inlineLink} to="/portal/play">Vote and play</Link> page sends it to
          the committee, who read every one. <Emoji>💡</Emoji>
        </>,
      ],
    },
    {
      id: 'photos',
      emoji: '📸',
      icon: 'image',
      title: 'Photographs',
      tagline: 'Our evenings, remembered — and only with your say-so.',
      points: [
        <>
          Photographs from our events go in the{' '}
          {showPhotos ? (
            <Link className={styles.inlineLink} to="/gallery">
              gallery
            </Link>
          ) : (
            'gallery'
          )}{' '}
          on the public website, once the committee has checked them.
        </>,
        <>
          Before any photograph goes up, the location, the camera and the date a phone hides inside it
          are taken out. Your street stays your business. <Emoji>📍</Emoji>
        </>,
        <>
          In one and would rather not be? You, or your child? Tell us and we will take it down —{' '}
          {TAKEDOWN_PROMISE}.
        </>,
      ],
    },
    {
      id: 'privacy',
      emoji: '🔒',
      icon: 'info',
      title: 'Your privacy, in one breath',
      tagline: 'Short version: we are a community, not an advertising company.',
      points: [
        <>
          Children's names are never shown publicly, and never to another household.
        </>,
        <>
          We do not sell or share your details with anyone outside the committee, and we do not use
          them for advertising. The site sets no cookies of its own. <Emoji>🍪</Emoji>
        </>,
        <>
          You can ask what we hold about you, ask us to correct it, or ask us to delete it. The whole
          story is in the <Link className={styles.inlineLink} to="/privacy">privacy notice</Link>.
        </>,
      ],
    },
  ]

  const questions: { q: string; a: ReactNode }[] = [
    {
      q: 'It says I am "not on the list yet". Have I been uninvited?',
      a: (
        <>
          Not at all. The committee has not recorded that Google address for your household yet.{' '}
          <Link className={styles.inlineLink} to="/contact">Message them</Link> with the address you
          tried, and they will add it.
        </>
      ),
    },
    {
      q: 'I signed in and everything is empty. Is the portal broken?',
      a: (
        <>
          Almost certainly your Google address is not joined up to your household yet. The committee
          can fix that in a minute — <Link className={styles.inlineLink} to="/contact">let them know</Link>.
        </>
      ),
    },
    {
      q: 'Can our household vote twice if we ask nicely?',
      a: <>No. <Emoji>😄</Emoji> One vote per household — but you can change it for as long as the poll is open.</>,
    },
    {
      q: 'Can we replay a quiz to climb the leaderboard?',
      a: <>One go per household, sorry. Read the answers at the end and you will be unbeatable next time. <Emoji>🧠</Emoji></>,
    },
    {
      q: 'We paid, but the dashboard still says Renew.',
      a: (
        <>
          The committee records payments by hand, so it can lag a little.{' '}
          <Link className={styles.inlineLink} to="/contact">Give them a nudge</Link> and they will
          update it.
        </>
      ),
    },
    {
      q: "Is my child's name on the website?",
      a: <>Never. Children's names are only used to plan seating and the children's programme.</>,
    },
  ]

  return (
    <div className={styles.page}>
      <section className={`${styles.panel} ${help.hero}`}>
        <div className={help.heroBody}>
          <Emoji className={help.wave}>👋</Emoji>
          <div>
            <h1 className={styles.title}>Help</h1>
            <p className={styles.sub}>
              Everything your household needs from the portal, explained in about the time it takes
              to boil the kettle. <Emoji>☕</Emoji>
            </p>
          </div>
        </div>
        <nav aria-label="On this page" className={help.jump}>
          {sections.map((section) => (
            <a key={section.id} href={`#${section.id}`} className={help.jumpLink}>
              <Emoji className={help.jumpEmoji}>{section.emoji}</Emoji>
              {section.title}
            </a>
          ))}
          <a href="#questions" className={help.jumpLink}>
            <Emoji className={help.jumpEmoji}>🙋</Emoji>
            Questions
          </a>
        </nav>
      </section>

      <div className={help.grid}>
        {sections.map((section, index) => (
          <section
            key={section.id}
            id={section.id}
            aria-labelledby={`${section.id}-title`}
            className={`${styles.panel} ${help.card}`}
            style={{ '--i': index } as CSSProperties}
          >
            <div className={help.cardHead}>
              <Emoji className={help.bigEmoji}>{section.emoji}</Emoji>
              <div>
                <h2 id={`${section.id}-title`} className={help.cardTitle}>
                  <Icon name={section.icon} size={18} />
                  {section.title}
                </h2>
                <p className={`${styles.muted} ${styles.tiny}`}>{section.tagline}</p>
              </div>
            </div>
            <ul className={help.points}>
              {section.points.map((point, i) => (
                <li key={i}>
                  <span className={help.tick} aria-hidden="true">
                    <Icon name="check" size={14} />
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section id="questions" aria-labelledby="questions-title" className={styles.panel}>
        <div className={styles.panelHead}>
          <h2 id="questions-title" className={help.cardTitle}>
            <Icon name="help" size={18} />
            Questions people actually ask <Emoji>🙋</Emoji>
          </h2>
        </div>
        <div className={styles.pad}>
          {questions.map(({ q, a }) => (
            <details key={q} className={help.faq}>
              <summary>
                <span>{q}</span>
                <Icon name="chevronRight" size={16} className={help.chevron} />
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={`${styles.panel} ${help.stuck}`} aria-labelledby="stuck-title">
        <Emoji className={help.bigEmoji}>🛟</Emoji>
        <div>
          <h2 id="stuck-title" className={help.cardTitle}>
            Still stuck?
          </h2>
          <p className={`${styles.muted} ${styles.tiny}`}>
            A name spelt wrong, a renewal you have paid, a photograph you would rather was not up — the
            committee would like to know. Real people answer, usually with a cup of tea in hand.
          </p>
        </div>
        <Button to="/contact" variant="gold" size="sm">
          Message the committee
        </Button>
      </section>
    </div>
  )
}
