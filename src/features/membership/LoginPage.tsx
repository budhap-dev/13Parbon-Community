import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { site } from '@/app/site'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import { GoogleMark } from '@/lib/auth/GoogleMark'
import { useGoogleSignIn } from '@/lib/auth/GoogleSignIn'
import { previewAccounts, previewEnabled } from '@/lib/auth/previewAccounts'
import { useSession } from '@/lib/auth/session'
import styles from './Membership.module.css'

/**
 * Google through Supabase, and only for addresses that have been invited. Where this build
 * has no Supabase project, or nobody on the allowlist, the button says so rather than
 * pretending: the preview accounts below still let the portal be walked through.
 */
/** ", Subhendu" from "Subhendu Roy". Nothing at all when Google gave no name worth using. */
function greeting(name: string): string {
  const first = name.trim().split(/\s+/)[0]
  return first && !first.includes('@') ? `, ${first}` : ''
}

export function LoginPage() {
  useDocumentTitle('Member sign-in')
  const { signIn } = useSession()
  const navigate = useNavigate()
  const { state: locationState } = useLocation()
  const showPreview = previewEnabled(import.meta.env.MODE === 'development')
  const { state, signIn: withGoogle } = useGoogleSignIn()
  const { session } = useSession()

  /*
   * Somebody who is already signed in has no business on this page.
   *
   * It happens on the way back from Google — the return lands on /portal, the guard sent them
   * here while the session was still being read, and without this they stayed, looking at a
   * sign-in button having just signed in.
   */
  useEffect(() => {
    if (session.role === 'visitor') return
    const from = (locationState as { from?: string } | null)?.from
    navigate(from ?? (session.role === 'admin' ? '/admin' : '/portal'), { replace: true })
  }, [session, navigate, locationState])

  return (
    <Container className={styles.single}>
      <h1 className={styles.title}>
        Member <span className={styles.nowrap}>sign-in</span>
      </h1>
      <p className={styles.intro}>
        Members sign in with Google to see their own household and what the committee holds about them.
        Everything else on this website is open to everyone, no account needed.
      </p>

      {state.status === 'refused' ? (
        /*
         * Turned away, said kindly and with what happens next.
         *
         * They did nothing wrong: membership is by invitation and nobody has added this address
         * yet. The database noted the try on its way past, so the committee already sees them on
         * the People screen, and the page can honestly say there is nothing more to do. Without
         * that line people sign in again and again, or write in to ask, which is the same news
         * reaching the committee twice.
         */
        <section className={styles.turnedAway} role="status" aria-labelledby="turned-away-title">
          <h2 id="turned-away-title" className={styles.turnedAwayTitle}>
            Thanks for coming{greeting(state.name)}.
          </h2>
          <p className={styles.turnedAwayText}>
            Membership is by invitation, and <strong className={styles.address}>{state.email}</strong> is not on the
            members’ list yet.
          </p>
          <p className={styles.turnedAwayText}>
            <strong>We have let the committee know you tried</strong>, so there is nothing more you need to do. Once
            they have added your household, come back and sign in with this same Google account.
          </p>
          <div className={styles.cta}>
            <Button to="/contact">Message the committee</Button>
            <Button variant="line" onClick={withGoogle}>
              Use a different Google account
            </Button>
          </div>
        </section>
      ) : (
        <>
          <div className={styles.googleWrap}>
            <button
              type="button"
              className={styles.google}
              onClick={withGoogle}
              disabled={state.status === 'off' || state.status === 'working'}
            >
              <GoogleMark />
              {state.status === 'working' ? 'Taking you to Google…' : 'Continue with Google'}
            </button>
            {state.status === 'off' ? (
              <p className={styles.hint}>Not switched on yet. The committee is still setting it up.</p>
            ) : null}
            {state.status === 'failed' ? (
              <p role="alert" className={styles.hint}>
                Google sign-in did not go through: {state.message}. Try again in a moment.
              </p>
            ) : null}
          </div>

          <p className={styles.intro}>
            Membership is by invitation while we get started, so there is no sign-up form. If you would like to join
            {site.town.trim().startsWith('[') ? ' the community' : ` us in ${site.town}`}, send the committee a message
            and someone will be in touch.
          </p>
          <div className={styles.cta}>
            <Button to="/contact">Message the committee</Button>
            <Button to="/events" variant="line">
              What’s on
            </Button>
          </div>
        </>
      )}

      {showPreview ? (
        <section className={styles.preview} aria-labelledby="preview-title">
          <h2 id="preview-title" className={styles.previewTitle}>
            Walk through the portal
          </h2>
          <p className={styles.previewText}>
            For the committee, while the portal is being built. These are sample households with made-up data.
            Nothing you do inside is saved.
          </p>
          <ul className={styles.accounts}>
            {previewAccounts.map((account) => (
              <li key={account.householdId}>
                <button
                  type="button"
                  className={styles.account}
                  onClick={() => {
                    signIn(account)
                    navigate(account.role === 'admin' ? '/admin' : '/portal')
                  }}
                >
                  <span className={styles.accountName}>
                    {account.name}
                    <span className={account.role === 'admin' ? styles.rolePillAdmin : styles.rolePill}>
                      {account.role === 'admin' ? 'Admin' : 'Member'}
                    </span>
                  </span>
                  <span className={styles.accountBlurb}>{account.blurb}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Container>
  )
}
