import { useId, useRef, useState, type FormEvent } from 'react'
import { flushSync } from 'react-dom'
import { Button } from './Button'
import {
  normaliseGoogleEmail,
  validateHousehold,
  type Household,
  type HouseholdDraft,
  type HouseholdErrors,
  type MembershipStatus,
  type PersonInput,
  type Role,
  type Viewer,
} from '@/domain/household'
import { can } from '@/lib/auth/permissions'
import styles from './HouseholdForm.module.css'

type Props = {
  /** The household being edited, or nothing at all when one is being added. */
  household?: Household
  /**
   * A starting point for a household that does not exist yet — what we already know about
   * somebody who has been knocking. Ignored when `household` is given.
   */
  prefill?: Partial<HouseholdDraft>
  viewer: Viewer
  onSave: (draft: HouseholdDraft) => void
  saving?: boolean
  /** Set after a save so the form can say so without the page having to. */
  saved?: boolean
  error?: string
}


/**
 * A checkbox with a line of explanation under it.
 *
 * The explanation is tied on with `aria-describedby` rather than left inside the `<label>`.
 * Inside it, the accessible name of the box becomes the choice *and* the whole sentence after
 * it, which is what a screen reader then reads out every time focus lands there.
 */
function Check({
  id,
  label,
  note,
  checked,
  onChange,
}: {
  id: string
  label: string
  note: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className={styles.check}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        aria-describedby={`${id}-note`}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={styles.checkText}>
        <label htmlFor={id}>{label}</label>
        <span id={`${id}-note`} className={styles.checkNote}>
          {note}
        </span>
      </span>
    </div>
  )
}

const emptyPerson: PersonInput = { name: '', ageGroup: 'adult' }

function draftFrom(household?: Household, prefill?: Partial<HouseholdDraft>): HouseholdDraft {
  if (!household) {
    return {
      name: '',
      contactName: '',
      email: '',
      phone: '',
      people: [{ ...emptyPerson }],
      interests: [],
      listedInDirectory: false,
      shareEmail: false,
      sharePhone: false,
      googleEmail: null,
      role: 'member',
      membershipStatus: 'active',
      membershipPaidTo: '',
      ...prefill,
    }
  }
  return {
    name: household.name,
    contactName: household.contactName,
    email: household.email,
    phone: household.phone ?? '',
    people: household.people.map(({ name, ageGroup, age, note }) => ({ name, ageGroup, age, note })),
    interests: [...household.interests],
    listedInDirectory: household.listedInDirectory,
    shareEmail: household.shareEmail,
    sharePhone: household.sharePhone,
    googleEmail: household.googleEmail,
    role: household.role,
    membershipStatus: household.membership.status,
    membershipPaidTo: household.membership.paidTo,
  }
}

/**
 * Adding a household, and editing one.
 *
 * The same form does both jobs and serves both people who do them, because the alternative is
 * two forms that agree about a household until the day somebody changes one of them. What
 * differs is which fields appear, and that is decided by `can()` rather than by which page it
 * was rendered on — a member opening this on their own household sees their own details and
 * none of the committee's.
 */
export function HouseholdForm({ household, prefill, viewer, onSave, saving, saved, error }: Props) {
  const [draft, setDraft] = useState<HouseholdDraft>(() => draftFrom(household, prefill))
  const [errors, setErrors] = useState<HouseholdErrors>({})
  const ids = useId()

  const formRef = useRef<HTMLFormElement>(null)
  const adding = household === undefined
  const mayInvite = can(viewer, adding ? 'household:add' : 'household:setSignInAddress')
  const maySetRole = can(viewer, 'household:setRole')
  const maySetMembership = can(viewer, 'household:setMembership')
  const onTheCommittee = mayInvite || maySetRole || maySetMembership

  const set = <K extends keyof HouseholdDraft>(key: K, value: HouseholdDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  const setPerson = (index: number, changes: Partial<PersonInput>) => {
    setDraft((d) => ({ ...d, people: d.people.map((p, i) => (i === index ? { ...p, ...changes } : p)) }))
  }

  const addPerson = () => setDraft((d) => ({ ...d, people: [...d.people, { ...emptyPerson }] }))

  const removePerson = (index: number) => {
    setDraft((d) => ({ ...d, people: d.people.filter((_, i) => i !== index) }))
    // Errors are keyed by position, so they mean the wrong person once the list shifts.
    setErrors((e) => ({ ...e, person: undefined }))
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const found = validateHousehold(draft)

    let googleEmail = draft.googleEmail ?? null
    if (onTheCommittee && typeof draft.googleEmail === 'string') {
      const checked = normaliseGoogleEmail(draft.googleEmail)
      if (checked.error) found.googleEmail = checked.error
      else googleEmail = checked.email
    }

    // flushSync so the fields are marked invalid in the DOM before we go looking for the
    // first one. After a failed submit the cursor belongs on the thing that is wrong: a long
    // form that refuses and leaves somebody to scroll for the reason is one people give up on,
    // and on a phone the offending field is usually off screen.
    flushSync(() => setErrors(found))
    if (Object.keys(found).length > 0) {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }
    onSave({ ...draft, googleEmail })
  }

  const fieldProps = (name: 'name' | 'contactName' | 'email' | 'googleEmail') => {
    const message = errors[name]
    return {
      id: `${ids}-${name}`,
      className: styles.input,
      'aria-invalid': message ? true : undefined,
      'aria-describedby': message ? `${ids}-${name}-error` : undefined,
    }
  }

  // A plain function, not a component: one declared here would be a new type on every render,
  // which throws away anything inside it each time. Nothing is inside this one, but the habit
  // is worth keeping and the linter is right to say so.
  const errorFor = (name: 'name' | 'contactName' | 'email' | 'googleEmail' | 'people') =>
    errors[name] ? (
      <p id={`${ids}-${name}-error`} className={styles.error}>
        {errors[name]}
      </p>
    ) : null

  return (
    <form ref={formRef} className={styles.form} onSubmit={onSubmit} noValidate>
      <fieldset className={styles.section}>
        <legend className={styles.legend}>The household</legend>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={`${ids}-name`}>
              Household name
            </label>
            <input {...fieldProps('name')} value={draft.name} onChange={(e) => set('name', e.target.value)} />
            {errorFor('name')}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor={`${ids}-contactName`}>
              Who the committee speaks to
            </label>
            <input
              {...fieldProps('contactName')}
              value={draft.contactName}
              onChange={(e) => set('contactName', e.target.value)}
            />
            {errorFor('contactName')}
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={`${ids}-email`}>
              Email
            </label>
            <input
              {...fieldProps('email')}
              type="email"
              value={draft.email}
              onChange={(e) => set('email', e.target.value)}
            />
            {errorFor('email')}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor={`${ids}-phone`}>
              Phone <span className={styles.hint}>(optional)</span>
            </label>
            <input
              id={`${ids}-phone`}
              className={styles.input}
              type="tel"
              value={draft.phone ?? ''}
              onChange={(e) => set('phone', e.target.value)}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className={styles.section}>
        <legend className={styles.legend}>Who lives here</legend>
        <p className={styles.hint}>
          Adults and children are counted separately, so the caterer knows the numbers and the
          children’s programme knows the ages. Names of children are never shown to anybody outside
          the household.
        </p>
        {errorFor('people')}

        {draft.people.map((person, i) => (
          <div className={styles.person} key={i}>
            <div className={styles.personTop}>
              <span className={styles.personWho}>Person {i + 1}</span>
              {draft.people.length > 1 ? (
                <Button variant="line" size="sm" onClick={() => removePerson(i)}>
                  Remove
                </Button>
              ) : null}
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor={`${ids}-person-${i}-name`}>
                  Name
                </label>
                <input
                  id={`${ids}-person-${i}-name`}
                  className={styles.input}
                  value={person.name}
                  aria-invalid={errors.person?.[i]?.name ? true : undefined}
                  aria-describedby={errors.person?.[i]?.name ? `${ids}-person-${i}-name-error` : undefined}
                  onChange={(e) => setPerson(i, { name: e.target.value })}
                />
                {errors.person?.[i]?.name ? (
                  <p id={`${ids}-person-${i}-name-error`} className={styles.error}>
                    {errors.person[i].name}
                  </p>
                ) : null}
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor={`${ids}-person-${i}-group`}>
                  Adult or child
                </label>
                <select
                  id={`${ids}-person-${i}-group`}
                  className={styles.select}
                  value={person.ageGroup}
                  onChange={(e) =>
                    setPerson(i, {
                      ageGroup: e.target.value as PersonInput['ageGroup'],
                      // An adult carries no age, so switching back clears one left behind.
                      age: e.target.value === 'child' ? person.age : undefined,
                    })
                  }
                >
                  <option value="adult">Adult</option>
                  <option value="child">Child</option>
                </select>
              </div>

              {person.ageGroup === 'child' ? (
                <div className={styles.field}>
                  <label className={styles.label} htmlFor={`${ids}-person-${i}-age`}>
                    Age
                  </label>
                  <input
                    id={`${ids}-person-${i}-age`}
                    className={styles.input}
                    type="number"
                    min={0}
                    max={120}
                    value={person.age ?? ''}
                    aria-invalid={errors.person?.[i]?.age ? true : undefined}
                    aria-describedby={errors.person?.[i]?.age ? `${ids}-person-${i}-age-error` : undefined}
                    onChange={(e) =>
                      setPerson(i, { age: e.target.value === '' ? undefined : Number(e.target.value) })
                    }
                  />
                  {errors.person?.[i]?.age ? (
                    <p id={`${ids}-person-${i}-age-error`} className={styles.error}>
                      {errors.person[i].age}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${ids}-person-${i}-note`}>
                Anything the organisers should know <span className={styles.hint}>(optional)</span>
              </label>
              <input
                id={`${ids}-person-${i}-note`}
                className={styles.input}
                value={person.note ?? ''}
                placeholder="Vegetarian · sings · dance group"
                onChange={(e) => setPerson(i, { note: e.target.value })}
              />
            </div>
          </div>
        ))}

        <div className={styles.actions}>
          <Button variant="line" size="sm" onClick={addPerson}>
            Add someone
          </Button>
        </div>
      </fieldset>

      <fieldset className={styles.section}>
        <legend className={styles.legend}>What other members can see</legend>
        <p className={styles.hint}>
          Nothing here is public. These choices decide what other signed-in members see in the
          directory, and they are the household’s to make — not the committee’s.
        </p>

        <div className={styles.checks}>
          <Check
            id={`${ids}-listed`}
            label="Appear in the member directory"
            note="Leave this off and no other member can find you at all."
            checked={draft.listedInDirectory}
            onChange={(v) => set('listedInDirectory', v)}
          />
          <Check
            id={`${ids}-shareEmail`}
            label="Show our email address"
            note="Only to members, and only if listed above."
            checked={draft.shareEmail}
            onChange={(v) => set('shareEmail', v)}
          />
          <Check
            id={`${ids}-sharePhone`}
            label="Show our phone number"
            note="Same again. Off by default, and easy to turn back off."
            checked={draft.sharePhone}
            onChange={(v) => set('sharePhone', v)}
          />
        </div>
      </fieldset>

      {onTheCommittee ? (
        <fieldset className={`${styles.section} ${styles.committee}`}>
          <legend className={styles.legend}>Committee only</legend>
          <p className={styles.hint}>
            A household never sees or sets any of this. Changing it is recorded against your name.
          </p>

          {mayInvite ? (
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${ids}-googleEmail`}>
                Google address they sign in with
              </label>
              <input
                {...fieldProps('googleEmail')}
                type="email"
                value={draft.googleEmail ?? ''}
                placeholder="Leave empty until you know it"
                onChange={(e) => set('googleEmail', e.target.value)}
              />
              {errorFor('googleEmail')}
              <p className={styles.hint}>
                This is the whole invitation. Nobody signs in without it, and nobody can set their own.
              </p>
            </div>
          ) : null}

          <div className={styles.row}>
            {maySetRole ? (
              <div className={styles.field}>
                <label className={styles.label} htmlFor={`${ids}-role`}>
                  Role
                </label>
                <select
                  id={`${ids}-role`}
                  className={styles.select}
                  value={draft.role ?? 'member'}
                  onChange={(e) => set('role', e.target.value as Role)}
                >
                  <option value="member">Member</option>
                  <option value="admin">Committee</option>
                </select>
              </div>
            ) : null}

            {maySetMembership ? (
              <>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor={`${ids}-status`}>
                    Membership
                  </label>
                  <select
                    id={`${ids}-status`}
                    className={styles.select}
                    value={draft.membershipStatus ?? 'active'}
                    onChange={(e) => set('membershipStatus', e.target.value as MembershipStatus)}
                  >
                    <option value="active">Active</option>
                    <option value="lapsed">Lapsed</option>
                  </select>
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor={`${ids}-paidTo`}>
                    Paid up to
                  </label>
                  <input
                    id={`${ids}-paidTo`}
                    className={styles.input}
                    type="date"
                    value={draft.membershipPaidTo ?? ''}
                    onChange={(e) => set('membershipPaidTo', e.target.value)}
                  />
                </div>
              </>
            ) : null}
          </div>
        </fieldset>
      ) : null}

      <div className={styles.actions}>
        <Button variant="gold" type="submit" disabled={saving}>
          {saving ? 'Saving…' : adding ? 'Add the household' : 'Save changes'}
        </Button>
        {saved ? (
          <p className={styles.saved} role="status">
            Saved.
          </p>
        ) : null}
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  )
}
