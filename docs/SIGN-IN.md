# Turning member sign-in on

Sign-in is Google through Supabase, and it is off until three things are set. Nothing in the
repository can switch it on by itself: the project and the Google credentials are yours to
create.

## 1. The Supabase project

Project Settings → API gives you two values:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<the anon key>
```

Put them in `.env.local` for local work, and in Vercel → Settings → Environment Variables for
the live site. The anon key is meant to be public — it ends up in the built JavaScript either
way — and it is safe **only** because row level security decides what it can reach. See the
warning at the bottom.

## 2. Google as a provider

In Supabase: Authentication → Providers → Google.

It asks for a client ID and secret, which come from the Google Cloud console: APIs & Services →
Credentials → Create credentials → OAuth client ID → Web application. Google needs one
authorised redirect URI, and it is Supabase's, not ours:

```
https://<project>.supabase.co/auth/v1/callback
```

Then, back in Supabase under Authentication → URL Configuration, add the addresses people are
allowed to land back on:

```
http://localhost:5173/portal
https://13parbon.vercel.app/portal
```

Miss those and Google will sign someone in and then refuse to return them.

## 3. Who is allowed in

```
VITE_MEMBER_ALLOWLIST=you@gmail.com
```

While sign-in is being built this is the whole gate. Only addresses on this list get a session;
anyone else is signed straight back out of Google, and told they are not on the list yet.

Two behaviours worth knowing:

- **An empty list admits nobody.** A project configured with no list leaves sign-in switched
  off, rather than opening the door to the first stranger with a Google account.
- **An allowed address with no household still gets in**, as an admin with "No household yet".
  That is deliberate: your own address will not have a household until there is data to put it
  in.

## Opening it to everyone

Membership is by invitation, and the long-term gate is the `googleEmail` the committee records
against a household — the code already looks a household up by it and takes the role from
there. When you are ready, add the addresses to the households and widen or drop
`VITE_MEMBER_ALLOWLIST`.

Then set `showMemberSignIn: true` in `src/app/site.ts` to put the sign-in link back in the
header and footer. Until then the page still works for anyone who knows `/login`, which is how
you will test it.

## The part that is not done

**The allowlist is not a security boundary.** It runs in the browser, so it decides what the app
*shows*, not what the database *gives out*. Anyone who can run JavaScript can hold a session for
an address that is not on the list.

That is acceptable now, because the portal reads from fixtures and there is nothing real behind
it. It stops being acceptable the moment one household's details go into Supabase. Before that:

- Row level security on every table, so a signed-in person can read their own household and
  nothing else.
- `supabase/portal.sql` was drafted for this and is **not correct yet** — its helper functions
  reference `households` before it is created, `current_setting(...)::jsonb` can throw, and its
  `auth.users` triggers could block sign-in altogether. It is deliberately not committed.
