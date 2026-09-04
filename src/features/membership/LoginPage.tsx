import { useLocation, useNavigate } from 'react-router'
import { site } from '@/app/site'
import { useDocumentTitle } from '@/app/useDocumentTitle'
import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import { useGoogleSignIn } from '@/lib/auth/GoogleSignIn'
import { previewAccounts, previewEnabled } from '@/lib/auth/previewAccounts'
import { useSession } from '@/lib/auth/session'
import styles from './Membership.module.css'

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6v-3.1h-4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
    </svg>
  )
}

/**
 * Google through Supabase, and only for addresses that have been invited. Where this build
 * has no Supabase project, or nobody on the allowlist, the button says so rather than
 * pretending: the preview accounts below still let the portal be walked through.
 */
export function LoginPage() {
  useDocumentTitle('Member sign-in')
  const { signIn } = useSession()
  const navigate = useNavigate()
  const { search } = useLocation()
  const showPreview = previewEnabled(import.meta.env.MODE === 'development', search)
  const { state, signIn: withGoogle } = useGoogleSignIn()

  return (
    <Container className={styles.single}>
      <h1 className={styles.title}>
        Member <span className={styles.nowrap}>sign-in</span>
      </h1>
      <p className={styles.intro}>
        Members sign in with Google to see their household, their registrations and the documents library.
        Everything else on this website is open to everyone, no account needed.
      </p>

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
        {state.status === 'refused' ? (
          <p role="alert" className={styles.hint}>
            {state.email} is not on the list yet. Membership is by invitation while we get started — send the
            committee a message and someone will add you.
          </p>
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
