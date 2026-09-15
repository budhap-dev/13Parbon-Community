# Turning member sign-in on

> What sign-in is *for* — the committee's back office, checked and amended — is in
> [MEMBER-LOGIN.md](MEMBER-LOGIN.md), and where the building has got to is in
> [MEMBER-LOGIN-BUILD.md](MEMBER-LOGIN-BUILD.md). This page is the setup, in order.

Sign-in is Google through Supabase, and it is off until this is done. Nothing in the repository
can switch it on by itself: the project and the Google credentials are yours to create.

Allow about an hour. Steps 1–3 are worth doing on their own first, even if you are not ready to
open sign-in to anybody — they prove the database rules work, which is the part that would be
expensive to get wrong.

---

## Before anything: what sharing a project does and does not mean

`supabase/portal.sql` is about six hundred lines that have never been executed, and it is going
into a database the planner is using. Two things make that safe, and one is worth watching.

**Its own schema.** Everything is created in `portal`. Nothing touches `public`, so nothing can
collide with the planner's tables, and `drop schema portal cascade` removes every trace of this
app in one line if it ever comes to that.

**Its own tables.** The planner's rows are never read or written by anything here.

**Shared sign-in, and this is the one to watch.** `auth.users` belongs to the project, not to a
schema, so anybody who signs into the planner has a session valid here too. They will not see
anything — the policies key on a Google address matching a household, and a planner user has
none — but the sign-in-attempts trigger will record each of them as somebody knocking. Expect
the People screen to list the committee the first time they use the planner after this goes in.
Mark them resolved, or give them households.

---

## 1. The project

**This shares the committee's existing event-planner project**, decided 2026-09-15 — the free
tier allows two projects per account and both were already spoken for.

Everything this app owns therefore lives in a schema called `portal`, not in `public`. That is
not tidiness. The planner owns `diary`, `diary_log`, `events`, `history` and **`people`** — and
`create table if not exists public.people` would have quietly done nothing, then switched row
level security on for *the planner's* table and left a policy on it referring to a column that
does not exist. The planner would have stopped being able to read its own people, with no error
anywhere to explain it.

So there is nothing to create here. If you ever do want a project of its own, everything still
works: it is the same SQL, into an empty database.

**One setting is required before anything in the browser can reach it.**

**Settings → API → Exposed schemas** — add `portal` alongside `public`. Miss it and every request
fails as though the tables were not there.

> The free tier **pauses a project after a week with no traffic**. It wakes on the next request,
> but the first one after a pause is slow. Worth knowing before somebody reports the site as
> broken.

## 2. The two settings the app needs

**Project Settings → API**. Copy:

```
Project URL   →  VITE_SUPABASE_URL
anon public   →  VITE_SUPABASE_ANON_KEY
```

Put them in `.env.local` for local work (copy `.env.example` first), and in
**Vercel → Settings → Environment Variables** for the live site.

The anon key is meant to be public — it ends up in the built JavaScript either way — and it is
safe **only** because row level security decides what it can reach. Which is step 3.

The `service_role` key on that page is the opposite: it bypasses every rule. It belongs in
nothing that runs in a browser, and this app never needs it.

## 3. The tables and the rules

**Database → SQL Editor → New query**. Run these three, in this order, one at a time:

| | What it does |
|---|---|
| `supabase/schema.sql` | The contact form's table. Insert-only for visitors |
| `supabase/portal.sql` | Households, people, documents, sign-in attempts, the audit trail, attendance — and every policy |
| `supabase/verify.sql` | Proves the rules hold. Runs in a transaction and rolls back, so it leaves nothing behind |

`verify.sql` should end with a single notice: **All portal rules hold.** Anything beginning
`FAIL:` names exactly what is wrong — send me the line and I will fix it.

Those last two are not in git yet, on purpose: policies nobody has run read as promises the
database has not made. They come out of `.gitignore` once this step has passed.

## 4. Google as a provider

Two consoles, and the order matters because each needs something from the other.

**In Supabase:** Authentication → Providers → **Google**. Leave it open; it shows you a callback
URL, which looks like:

```
https://<project>.supabase.co/auth/v1/callback
```

**In Google Cloud** (console.cloud.google.com):

1. Create a project, or pick one.
2. **APIs & Services → OAuth consent screen**: External, app name `13Parbon Community`, your
   email as support and developer contact. Save. It can stay in Testing — add the committee's
   addresses under Test users and nobody has to review anything.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID → Web application**.
4. Under **Authorised redirect URIs**, paste the Supabase callback from above. Google needs
   Supabase's address here, not ours.
5. Copy the **Client ID** and **Client secret**.

**Back in Supabase:** paste both into the Google provider, and enable it.

## 5. Where people are allowed to land

**Authentication → URL Configuration → Redirect URLs.** Add both:

```
http://localhost:5173/portal
https://13parbon.org.uk/portal
```

Miss these and Google will sign somebody in and then refuse to return them, which looks like a
broken site rather than a missing setting.

## 6. Who is allowed in

```
VITE_MEMBER_ALLOWLIST=you@gmail.com
```

While this is being built it is the whole gate. Only addresses on the list get a session;
anyone else is signed straight back out and listed for the committee on the People screen.

Two behaviours worth knowing:

- **An empty list admits nobody.** A project configured with no list leaves sign-in switched off,
  rather than opening the door to the first stranger with a Google account.
- **An allowed address with no household still gets in**, as an admin with "No household yet".
  That is deliberate: your own address will not have a household until you add one.

## 7. Check it

1. `npm run dev`, go to `/login`, sign in with Google.
2. You should land on `/portal`.
3. Add a household on `/admin/people` with somebody else's Google address.
4. Ask them to sign in. They should see their own household and nothing else.
5. While signed in as them, open the browser console and try to read another household. You
   should get nothing back. That is the whole point of step 3, and it is the one thing worth
   testing by hand.

## Opening it to everybody

Membership is by invitation, and the long-term gate is the `googleEmail` the committee records
against a household — the code already looks a household up by it and takes the role from there.
When you are ready, add the addresses to the households and drop `VITE_MEMBER_ALLOWLIST`.

Then turn the sign-in link on from **Content → What the site shows → Member sign-in**, which is a
switch in the admin now rather than a code change. Until then the page still works for anybody
who knows `/login`, which is how you will test it.

## What is still not done after all this

Photograph uploading needs a Cloudflare R2 token and a small endpoint to sign with it — separate
from Supabase, and covered in [PHOTOS.md](PHOTOS.md). Everything up to the sending is built; the
screen says so where it stops.
