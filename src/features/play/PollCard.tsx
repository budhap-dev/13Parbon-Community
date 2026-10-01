import { useState, type FormEvent } from 'react'
import { Button } from '@/components/Button'
import { formatLongDate } from '@/domain/dates'
import { share, stateOf, votesLabel, type PollView } from '@/domain/polls'
import { useVote } from '@/lib/api'
import { useNow } from '@/lib/clock'
import portal from '@/features/portal/Portal.module.css'
import styles from './Play.module.css'

/** Totals as bars, with this household's choice marked. */
export function Tally({ options, tally, mine }: { options: string[]; tally: number[]; mine?: number }) {
  return (
    <div className={styles.tally}>
      {options.map((option, i) => (
        <div key={i} className={styles.tallyRow}>
          <div className={`${styles.tallyHead} ${mine === i ? styles.tallyMine : ''}`}>
            <span>
              {option}
              {mine === i ? ' — your choice' : ''}
            </span>
            <span>
              {share(tally[i] ?? 0, tally)}% · {votesLabel(tally[i] ?? 0)}
            </span>
          </div>
          <div className={portal.bar} aria-hidden="true">
            <div className={portal.barFill} style={{ width: `${share(tally[i] ?? 0, tally)}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * One poll, as a member answers it.
 *
 * A form with radios rather than a row of buttons that vote on a tap: a vote is a decision, and
 * the household's one, so it takes a choice and then a press. Changing it later works the same
 * way, for as long as the poll is open.
 */
export function PollCard({ view, canVote }: { view: PollView; canVote: boolean }) {
  const { poll, myVote, tally } = view
  const now = useNow()
  const vote = useVote()
  const [choice, setChoice] = useState<number | undefined>(myVote)
  const [changing, setChanging] = useState(false)
  const open = stateOf(poll, now) === 'open'
  const voted = myVote !== undefined
  const asking = open && canVote && (!voted || changing)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (choice === undefined) return
    vote.mutate({ pollId: poll.id, option: choice }, { onSuccess: () => setChanging(false) })
  }

  const whenTotals =
    poll.results === 'committee'
      ? 'Only the committee sees the totals on this one.'
      : poll.results === 'after_close'
        ? poll.closesAt
          ? `The totals show when it closes on ${formatLongDate(poll.closesAt)}.`
          : 'The totals show when it closes.'
        : 'The totals show once your household has voted.'

  const titleId = `poll-${poll.id}`
  return (
    <section className={portal.panel} aria-labelledby={titleId}>
      <div className={portal.panelHead}>
        <h3 id={titleId} className={portal.panelTitle}>
          {poll.title}
        </h3>
        <span className={open ? portal.pillLive : portal.pillPast}>{open ? 'Open' : 'Closed'}</span>
      </div>
      <div className={portal.pad} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {poll.detail ? <p className={portal.muted}>{poll.detail}</p> : null}
        {poll.named ? (
          <p className={portal.note}>
            <strong>A named poll.</strong> The committee will see which choice your household made.
          </p>
        ) : null}

        {asking ? (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <fieldset className={styles.choices}>
              <legend className="sr-only">{poll.title}</legend>
              {poll.options.map((option, i) => (
                <label key={i} className={`${styles.choice} ${choice === i ? styles.choiceOn : ''}`}>
                  <input type="radio" name={titleId} value={i} checked={choice === i} onChange={() => setChoice(i)} />
                  <span className={styles.letter} aria-hidden="true">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className={styles.choiceText}>{option}</span>
                </label>
              ))}
            </fieldset>
            <div className={portal.actions}>
              <Button variant="gold" size="sm" type="submit" disabled={choice === undefined || vote.isPending}>
                {vote.isPending ? 'Sending…' : voted ? 'Change our vote' : 'Vote'}
              </Button>
              {changing ? (
                <Button variant="line" size="sm" onClick={() => setChanging(false)}>
                  Keep it as it was
                </Button>
              ) : null}
            </div>
            {!voted ? <p className={`${portal.muted} ${portal.tiny}`}>One vote per household. {whenTotals}</p> : null}
          </form>
        ) : tally ? (
          <Tally options={poll.options} tally={tally} mine={myVote} />
        ) : voted ? (
          <p>
            Your household chose <strong>{poll.options[myVote]}</strong>. {whenTotals}
          </p>
        ) : (
          <p className={portal.muted}>{open ? whenTotals : 'This poll closed before your household voted.'}</p>
        )}

        {!asking && voted && open && canVote ? (
          <div>
            <Button variant="line" size="sm" onClick={() => setChanging(true)}>
              Change our vote
            </Button>
          </div>
        ) : null}
        {open && poll.closesAt ? <p className={`${portal.muted} ${portal.tiny}`}>Closes {formatLongDate(poll.closesAt)}.</p> : null}
        {vote.isError ? (
          <p className={portal.note} role="alert">
            {vote.error.message}
          </p>
        ) : null}
      </div>
    </section>
  )
}
