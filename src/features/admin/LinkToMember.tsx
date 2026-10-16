import { useId, useMemo, useState, type FormEvent } from 'react'
import { ActionBar } from '@/components/ActionBar'
import { Button } from '@/components/Button'
import type { SignInAttempt } from '@/domain/document'
import { draftOfHousehold, plainName, type Household, type Person } from '@/domain/household'
import { folded, matchesEvery, searchWords } from '@/domain/search'
import { useUpdateHousehold } from '@/lib/api'
import styles from './LinkToMember.module.css'

type Choice = { household: Household; person: Person; index: number }

/** Shares a word with the name Google gave: the likeliest answer, so it goes to the top. */
function sharesAName(person: Person, googleName: string): boolean {
  const theirs = new Set(searchWords(plainName(googleName)))
  return searchWords(plainName(person.name)).some((word) => word.length > 1 && theirs.has(word))
}

/**
 * Somebody tried to sign in and the committee knows who they are: a grown-up already on the
 * list, in a household already here. This puts that Google address on that person, which is
 * what lets them in — to that household, with its role.
 *
 * Saved straight away rather than by opening the household's form, because the whole decision
 * is "which person is this", and the form has thirty fields that are not that.
 */
export function LinkToMember({
  attempt,
  households,
  onLinked,
  onCancel,
}: {
  attempt: SignInAttempt
  households: readonly Household[]
  onLinked: (message: string) => void
  onCancel: () => void
}) {
  const ids = useId()
  const update = useUpdateHousehold()
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<string | null>(null)
  const address = attempt.email.trim().toLowerCase()

  // Every grown-up, keyed by household and position: a save addresses people by where they sit.
  const everyone = useMemo<Choice[]>(() => {
    const all = households.flatMap((household) =>
      household.people.flatMap((person, index) => (person.ageGroup === 'adult' ? [{ household, person, index }] : [])),
    )
    const likely = (choice: Choice) => (sharesAName(choice.person, attempt.name) ? 0 : 1)
    return all.sort(
      (a, b) => likely(a) - likely(b) || a.person.name.localeCompare(b.person.name) || a.household.name.localeCompare(b.household.name),
    )
  }, [households, attempt.name])

  const words = searchWords(query)
  const shown = everyone.filter(({ household, person }) =>
    matchesEvery(words, folded(`${person.name}\n${household.name}\n${person.googleEmail ?? ''}`)),
  )
  const keyOf = (choice: Choice) => `${choice.household.id}:${choice.index}`
  const chosen = everyone.find((choice) => keyOf(choice) === picked)

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!chosen) return
    const draft = draftOfHousehold(chosen.household)
    draft.people = draft.people.map((person, i) => (i === chosen.index ? { ...person, googleEmail: address } : person))
    update.mutate(
      { id: chosen.household.id, draft },
      {
        onSuccess: () =>
          onLinked(`${address} now signs in as ${chosen.person.name}, in ${chosen.household.name}.`),
      },
    )
  }

  return (
    <form onSubmit={onSubmit} className={styles.form}>
      <ActionBar
        status={
          update.isError ? (
            <span className={styles.error} role="alert">
              That did not save, so nothing has changed. {update.error.message}
            </span>
          ) : undefined
        }
      >
        <Button variant="line" onClick={onCancel} disabled={update.isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={!chosen || update.isPending}>
          {update.isPending ? 'Linking…' : chosen ? `Link to ${chosen.person.name}` : 'Link'}
        </Button>
      </ActionBar>

      <p className={styles.lead}>
        <strong>{address}</strong>
        {attempt.name && attempt.name !== address.split('@')[0] ? ` (Google calls them ${attempt.name})` : ''} tried to
        sign in. Pick who they are, and that address will sign them in to their household.
      </p>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={`${ids}-find`}>
          Find a member
        </label>
        <input
          id={`${ids}-find`}
          className={styles.input}
          type="search"
          value={query}
          placeholder="A name, or a household"
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <fieldset className={styles.choices}>
        <legend className={styles.label}>Who is this?</legend>
        {everyone.length === 0 ? (
          <p className={styles.hint}>There are no grown-ups on the list yet. Add their household instead.</p>
        ) : shown.length === 0 ? (
          <p className={styles.hint}>Nobody matches “{query.trim()}”.</p>
        ) : (
          <ul className={styles.list}>
            {shown.map((choice) => (
              <li key={keyOf(choice)}>
                <label className={styles.choice}>
                  <input
                    type="radio"
                    name={`${ids}-who`}
                    value={keyOf(choice)}
                    checked={picked === keyOf(choice)}
                    onChange={() => setPicked(keyOf(choice))}
                  />
                  <span className={styles.who}>
                    <span className={styles.name}>{choice.person.name}</span>
                    <span className={styles.meta}>
                      {choice.household.name}
                      {choice.household.role === 'admin' ? ' · Committee' : ''}
                      {choice.person.googleEmail ? ` · signs in as ${choice.person.googleEmail}` : ''}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      {chosen?.person.googleEmail && chosen.person.googleEmail !== address ? (
        <p className={styles.warn} role="note">
          {chosen.person.name} already signs in as <strong>{chosen.person.googleEmail}</strong>. Linking replaces it, so
          that address will no longer get in.
        </p>
      ) : null}
      {chosen?.household.role === 'admin' ? (
        <p className={styles.warn} role="note">
          {chosen.household.name} is on the committee, so <strong>{address}</strong> will be able to see and change
          everything in the portal.
        </p>
      ) : null}
    </form>
  )
}
