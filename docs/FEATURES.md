# What this app does

A tour of every feature in 13Parbon Community, written for somebody who has just cloned the
repository and wants to know what is in it before changing anything.

Read [STORY.md](STORY.md) for *why* the project exists and [PLAN.md](PLAN.md) for the delivery
phases. This file is the *what*: every screen, every rule, and the handful of decisions that
explain why things are shaped the way they are.

---

## Contents

1. [The shape of it in one minute](#1-the-shape-of-it-in-one-minute)
2. [Running it](#2-running-it)
3. [How the code is layered](#3-how-the-code-is-layered)
4. [The public website](#4-the-public-website)
5. [The member portal](#5-the-member-portal)
6. [The committee's back office](#6-the-committees-back-office)
7. [Signing in — two doors](#7-signing-in--two-doors)
8. [Permissions, and the three places they live](#8-permissions-and-the-three-places-they-live)
9. [What the committee controls without a developer](#9-what-the-committee-controls-without-a-developer)
10. [The audit trail](#10-the-audit-trail)
11. [Privacy promises the code actually keeps](#11-privacy-promises-the-code-actually-keeps)
12. [Photographs](#12-photographs)
13. [Themes and look](#13-themes-and-look)
14. [The database](#14-the-database)
15. [Testing](#15-testing)
16. [Deployment and environments](#16-deployment-and-environments)
17. [Conventions, and traps to know about](#17-conventions-and-traps-to-know-about)

---

## 1. The shape of it in one minute

13Parbon is a community website for a Bengali community association. The name comes from
*baro mase tero parbon* — twelve months, thirteen festivals.

It is **three surfaces in one codebase**, sharing components, types and one API layer:

| Surface | Who | Access | Routes |
|---|---|---|---|
| **Public website** | Anybody | No account | `/`, `/events`, `/gallery`, `/news`, `/about`, `/contact`, `/feedback`, `/privacy`, `/login` |
| **Member portal** | Members | Google sign-in, matched to a household | `/portal/*` |
| **Back office** | The committee | Same sign-in, `admin` role | `/admin/*` |

Two ideas run through everything and explain most of the design:

**Membership is by invitation.** There is no sign-up form anywhere. An admin records a
household and the Google address it will sign in with; that address gets in and no other does.
An unrecognised address is turned away and listed for the committee as a knock at the door.

**The committee runs the site, not a developer.** Switches, wording, the order of the home
page, the season's colours, the festivals, the story, the committee list, the FAQ, the members'
roll, the social channels, the privacy notice, events, news, notices, albums and feedback are
all editable from the back office. Turning the gallery off is a decision somebody makes on the
night, not a pull request. [§9](#9-what-the-committee-controls-without-a-developer) has the
full list, and the short list of what is deliberately still code.

### What is intentionally *not* here

| Not built | Why |
|---|---|
| Event registration | A Google Form the committee already runs. Only a headcount crosses over, and a count has nobody in it. |
| Event logistics (tasks, teams) | A [separate planner app](https://13parbon-event-management.vercel.app/), its own repo and sign-in. This site owns *front of house*. |
| A forum, a directory, payments | In [PLAN.md](PLAN.md) as later phases. |
| Photographs in the repository | They live in a Cloudflare R2 bucket. See [§12](#12-photographs). |

---

## 2. Running it

```bash
nvm use                 # Node 20+, see .nvmrc
npm install
npm run dev             # http://localhost:5173

npm run check           # lint + typecheck + tests — run this before pushing
npm run test:watch
npm run build
```

With **no `.env.local`** everything runs on fixtures: every screen is populated with sample
data, and `api.delivers` is `false` so the contact and feedback forms say so and offer an email
address instead of pretending a message was sent. This is a perfectly good way to work.

With Supabase configured, the real database takes over. Copy [`.env.example`](../.env.example)
to `.env.local`:

| Variable | What it switches on |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | The database. Forms deliver; content is real. |
| `VITE_MEMBER_ALLOWLIST` | Member sign-in. Comma-separated addresses; **empty means nobody**. |
| `VITE_PHOTOS_SIGN_URL`, `VITE_PHOTOS_URL` | Uploading photographs (browser half). |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | The server half. **Vercel only, never in the browser.** |

The anon key is meant to be public — row level security is what protects the data. The
`service_role` key must never appear in this repo or in any `VITE_` variable.

`/api/photos` is a Vercel function, which Vite does not run. For upload work run
`npx vercel dev` alongside `npm run dev`; Vite proxies `/api` to it. Keep the page on **5173** —
that is the origin named in the bucket's CORS policy.

---

## 3. How the code is layered

```
src/
  app/          router, providers, layouts, theme, site content, settings
  domain/       pure types and functions — no React, no network, heavily tested
  lib/api/      the API contract, its adapters, and the React Query hooks
  lib/auth/     sign-in, session, permissions
  lib/images/   browser-side image re-encoding
  components/   shared UI
  features/     one folder per capability
  server/       the pure half of the Vercel function
api/            the Vercel function itself
supabase/       schema, policies, and scripts that prove the policies hold
```

Import with the `@/` alias: `import { Button } from '@/components/Button'`.

### The one rule worth internalising: components never call `fetch`

Everything goes through **`ApiClient`** ([src/lib/api/types.ts](../src/lib/api/types.ts)) — a
single interface describing every read and write the app can do. It is worth reading in full;
it is the map of the whole application, and its comments carry most of the design reasoning.

The client is assembled in [create.ts](../src/lib/api/create.ts) by layering adapters, each
replacing its own slice and passing the rest through:

```
createMockApi()            fixtures for everything
  └ withSupabaseWrites     contact form posts for real; delivers = true
    └ withSupabasePortal   households, people, attendance, the inbox
      └ withSupabaseSettings
        └ withSupabaseNews
          └ withSupabaseGallery
            └ withSupabaseFeedback
              └ withSupabaseEvents
                └ withAuditTrail     records every write (outermost, so nothing escapes)
                  └ withSupabaseAudit  reads the trail back from the database
```

With no project configured, the stack is just `withAuditTrail(createMockApi())`.

Consequences worth knowing:

- **The mock is not a toy.** It is written to refuse exactly what the database refuses, and
  [mock/rules.test.ts](../src/lib/api/mock/rules.test.ts) checks that claim. A screen built
  against a permissive mock is a screen that meets a wall of 403s on the day it goes live.
- **Every method that depends on who is asking takes a `Viewer`** (`{ householdId, role }` or
  `null`). It is passed per call, not held on the client, so there is no ambient state to go
  stale between signing out and the next query.
- **Hooks are the only way components touch the client** — `useUpcomingEvents`,
  `useSendFeedback` and so on, in [hooks.ts](../src/lib/api/hooks.ts). Queries that depend on
  the viewer include them in the cache key, or React Query would serve an admin's data to the
  member who signed in next.

---

## 4. The public website

### Home (`/`)

Sections in order, each drawn only when it has something to say. Most have an **audience**
(`public` / `members` / `admins`) the committee sets per section.

| Section | What it is |
|---|---|
| **Hero** | The Bengali wordmark, the tagline, an animated logo assembly. Nothing to press — the first screen is for what this *is*. |
| **Noticeboard** | Up to three live notices. High up, because a notice is the one thing here with a date on it. Notices expire by themselves, decided by the database, not the browser clock. |
| **Next event** | The coming evening, with a countdown. |
| **Who we are** | The committee's paragraph. |
| **Photographs** | A rotating carousel mixed from several albums; a photograph opens full size and says which album it came from. |
| **Our year** | The thirteen festivals, described for somebody who has never been. |
| **What is coming up** | The next few events after the featured one. |
| **Helping out** | A plain call for volunteers. |
| **What people say** | Up to three approved pieces of feedback. |
| **Join** | Come to something — there is no application form to point at. |

### Events (`/events`, `/events/:slug`)

Upcoming events grouped by month, past events below, filterable by festival
(`/events?festival=durga-puja`). Festivals with no date yet are named rather than skipped.

An event page carries the theme (in Bengali, with an English rendering), the running order, the
venue with a map, a booking link to the committee's Google Form, and separate calls for
volunteers and for performers — coming to an event and being on the stage at one are different
things to put your name down for.

**A cancelled event keeps its page and says it was cancelled.** Quietly dropping one is
indistinguishable from never having announced it, and that is how people end up outside a hall
on a Saturday.

### Gallery (`/gallery`, `/gallery/:slug`)

Albums with covers, a lightbox, and a standing notice that any photograph will be taken down on
request. Albums are `public` or `members`; photographs inherit their album's visibility.

### News (`/news`, `/news/:slug`)

Articles and newsletters. Off by default (`showNews`) until there is real news — a page of
placeholders reads worse than no page.

### About (`/about`)

The story, the committee, the members' roll, the FAQ. All of it committee-editable.

### Contact (`/contact`)

Goes to the committee's inbox. Arriving from the gallery's takedown notice
(`/contact?about=photo`) pre-fills the subject and marks the message as a **takedown request**,
which sorts to the top of the inbox — it is the one promise on the site with a person waiting
behind it.

### Feedback (`/feedback`)

A box for the public plus everything the committee has approved. Sign in with Google to put
your name to it, or send it anonymously. **Nothing appears until a committee member approves
it.** Off by default. Full detail in [FEEDBACK.md](FEEDBACK.md).

### Privacy (`/privacy`) and sign-in (`/login`)

The privacy notice is content, in [src/app/privacy.ts](../src/app/privacy.ts), and must be
updated whenever what the site collects changes. `/login` offers Google, explains that
membership is by invitation, and in development also offers **preview accounts** — sample
households for walking through the portal, whose data is fixtures and whose edits are not
saved.

---

## 5. The member portal

Behind `RequireSession`. A member reaches their own household and nothing else.

**Dashboard (`/portal`)** — the next event with a countdown, membership status and renewal
date, and the notices they are allowed to see (members see some that visitors do not).

**My household (`/portal/household`)** — everything held about them, and an edit form. A member
may change the household name, contact, email, phone, who is in the household, and what they
would help with. They may **not** change their role, their sign-in address, or their membership
status — those are the committee's, refused by a database trigger rather than merely hidden.

Children's names never leave their own household: no other member can reach them at all.

---

## 6. The committee's back office

All under `/admin`, all requiring the `admin` role.

### Overview (`/admin`)

Counters for what needs a decision — knocks at the door, unread messages, feedback waiting —
and a combined "Needs a decision" list linking straight to each. Plus the last recorded
headcount and what share of households came.

### People (`/admin/people`)

The whole invitation model. Add a household, record the Google address that will sign them in,
set roles, mark membership lapsed, remove a household.

- **"Tried to sign in, not on the list"** — Google accounts that knocked. Resolve one when
  you have added them or decided not to; resolved ones stop counting against the badge.
- **Save the list** downloads a CSV for the caterer or the door. Deliberately thin: no
  children's names, no notes, no sign-in addresses, and adults/children counted rather than
  listed. It is also protected against CSV formula injection, because a name beginning `=`
  would otherwise run as a formula when somebody opens the file.
- The **last admin** cannot be removed or demoted, guarded both in the app and by a trigger.

### Events (`/admin/events`)

The **Event Designer**: title, summary, date, venue and coordinates, cover photograph and its
animation, the Bengali theme, the running order, booking and performer links, volunteer call,
status and visibility — with a **live preview of the banner drawn beside the form** as it is
typed. Also records attendance (a headcount, typed in) and files finished evenings as past.

A panel explains which tool to use: *here* is what the public sees; *the planner* is getting it
to happen. Nothing syncs between them — the title, date and venue are worth keeping the same in
both by hand.

### Content (`/admin/content`)

Three tabs, each saving independently:

- **The pages** — everything in [§9](#9-what-the-committee-controls-without-a-developer),
  grouped by the page each thing changes, and a **gaps** panel that counts unfilled
  `[bracketed]` placeholders by reading the content itself. The form does not open until the
  saved settings have been read: opened on the code's own values it would offer to save them
  over the committee's.
- **Noticeboard** — short notices with an audience, a publish date, an optional expiry and an
  optional button. Capped at 500 characters: a noticeboard people can read at a glance is the
  whole point of one.
- **Writing** — news posts and newsletters. Unpublishing keeps the piece and its original date
  so it can go back up where it belongs; deleting is separate and asks first.

### Photographs (`/admin/media`)

Albums, uploads, captions, drag-to-reorder, choosing an album's cover, and deletion. Deleting
**removes the object from the bucket, not just the row** — a photograph that is merely unlisted
has not been taken down, because the URL still works.

### Messages (`/admin/messages`)

The contact inbox. Takedown requests sort to the top and cannot be marked handled without
saying what actually happened to the photograph.

### Feedback (`/admin/feedback`)

The review queue: approve, turn down, take back off the website, or delete. See
[FEEDBACK.md](FEEDBACK.md).

### What has changed (`/admin/audit`)

The audit trail, in plain English. See [§10](#10-the-audit-trail).

---

## 7. Signing in — two doors

Google is the only identity provider, and there is one Supabase token per tab. But there are
**two reasons** to sign in, and conflating them broke things:

| | **Members' door** (`/login`) | **Public door** (on `/feedback`) |
|---|---|---|
| Config read | `readAuthConfig` — needs a project **and** an allowlist | `readSupabaseConfig` — needs a project only |
| Unrecognised address | Turned away, signed out of Google, logged as a knock | Left alone; stays a visitor |
| What you get | A `Session`, the portal, your household | Your name on one piece of feedback |

The app records **which door was used** before redirecting
([signInPurpose.ts](../src/lib/auth/signInPurpose.ts), in `localStorage` beside the token it
describes), and the members' gate reads it on the way back. Without it, someone signing in to
leave feedback was signed straight back out, and the button appeared to do nothing.

Both doors are served by **one provider** — `GoogleSignInProvider`, which also supplies
`PublicSignInContext`. Two subscribers to `onAuthStateChange` would be two answers to "who is
here" that could disagree, and would race to sign each other out.

**None of this is a security boundary.** It all runs in a browser. What holds the line is
`supabase/portal.sql`: an account with no household matches no policy and reaches nothing. That
is precisely why opening Google sign-in to the public costs nothing.

The `Session` also supports **preview mode**: an admin can step into a sample household to see
what a member sees, keeping their own session to come back to. Preview sessions run on the
fixtures client, and the portal says so, so nobody is told their real edits are make-believe.

---

## 8. Permissions, and the three places they live

Three things enforce the same rules, and **they are not interchangeable**:

| | What it decides |
|---|---|
| `supabase/portal.sql` | What the database will actually hand over. **The only one that counts.** |
| `lib/api/mock` | What the app develops against. Written to refuse the same things. |
| `can()` in [permissions.ts](../src/lib/auth/permissions.ts) | Which button to draw, which route to allow. |

`can()` is the weakest and is meant to be. Anyone can edit their own JavaScript and make every
`can()` return true; they will still get nothing back. Its job is to avoid offering a button
that was only ever going to fail.

Every rule in `permissions.ts` names the policy it mirrors. When they disagree, **the database
is right and the file is the bug** — `mock/rules.test.ts` and `supabase/verify.sql` exist to
notice.

Roles are just `member` and `admin`. Lapsed membership is a *status on the household*, not a
role.

---

## 9. What the committee controls without a developer

[`SiteSettings`](../src/domain/settings.ts) — one row in `portal.site_settings`, edited under
**Content → The pages**.

| On the screen | Field | What it changes |
|---|---|---|
| What the public site shows | `showPhotos`, `showNews`, `showNextEventStrip`, `showFeedback`, `showMemberSignIn` | Whole sections, on or off. |
| The colours a visitor arrives to | `defaultTheme` | The look a first visit opens in. A visitor's own choice still wins. |
| The words on the public pages | `text` | The home page title, tagline, mission, the invitation at the foot of the home page, town, venue, address, email, gallery note. |
| Ways to reach us, and to help | `social`, `volunteerFormUrl` | The footer, the contact page, and where the Volunteer button on an event goes. |
| The home page | `homeOrder`, `home` | The order of the sections, and who each is for (public / members / committee). |
| The year's festivals | `festivals` | "Our year" on the home page and the filter on Events. An evening is filed under one in the Event Designer. |
| Our story, What we stand for | `story`, `values` | The About page. |
| The committee, the roll, the questions | `committee`, `members`, `faq` | The About page. |
| This year's theme, in photographs | `collage` | The then-and-now collage on an event's page: photographs, captions, credit. |
| The privacy notice | `privacy` | The privacy page. See the note below. |
| Other tools the committee runs | `tools` | Links in the portal's sidebar. |

**Still code, on purpose:** the name, the wordmark and the logo. They are baked into
`index.html`, the share card and the sitemap, which link previews and search engines read
without running the app. So are the five colour schemes themselves — the committee chooses
between them; adding a sixth is a stylesheet.

**The privacy notice is watched.** It is the one piece of wording that has to be true about the
code. A saved notice remembers the `updatedOn` date of the developer's notice it was edited
from (`basedOn`); when [privacy.ts](../src/app/privacy.ts) changes and its date moves on, the
editor tells the committee their wording describes an older site and offers the new one. So:
**move `updatedOn` on whenever you change that file.**

Six design decisions here are worth knowing:

1. **A fixed shape, not a bag of key–value pairs.** A settings table anybody can put anything
   into drifts: a key gets renamed in code and the stale row sits there meaning nothing. A
   switch that is not in the type does not exist.
2. **Nothing stored is trusted on the way out.** `mergeSettings` lays the saved row over the
   defaults key by key; anything missing, mistyped or obsolete falls back. A half-written row
   cannot blank the home page.
3. **[`site.ts`](../src/app/site.ts) holds the fallbacks**, and every default is the cautious
   answer. A site that loses its database must not start publishing what the committee switched
   off.
4. **Addresses are checked on the way out, not only on the way in.** Some of these values end
   up in an `href`, and the row is JSON any admin can write. `siteContent.ts` hands a page
   nothing as a link unless it starts with `http(s)://` — a `javascript:` address is a script
   that runs for whoever presses it.
5. **A festival's id never changes.** It is what an evening is filed under and what the address
   bar says. Renaming one keeps its id; a new one takes its id from its name.
6. **A switch takes the page with it, not just the link.** `SectionGate` makes `/gallery`,
   `/news` and `/feedback` answer as *not found* when their switch is off. Sign-in is
   deliberately excluded — a member already signed in should not be locked out of their own
   household by a switch about a header link.

---

## 10. The audit trail

Every committee write leaves a line: who, what, when, and the value before as well as after.
Read at `/admin/audit`, by admins only, written by nobody — there is no insert policy at all,
so the trail cannot be edited by anyone holding an anon key, admin or not.

It is written **twice over, deliberately**:

- **In the database**, by `record_change` triggers. Nothing reaching those tables can avoid it.
- **In the app**, by `withAuditTrail` wrapped around the whole client, for the fixtures build
  which has no triggers.

The app-side wrapper is weaker by construction — a new mutation is only audited once it is
added there — so [audit.test.ts](../src/lib/api/audit.test.ts) enumerates **every method on
the contract** and fails if one is not classified as a read, an audited write, or a
deliberately unaudited one. Adding a method to `ApiClient` without deciding breaks the build.

Two entries are deliberately *not* recorded: `contact.send` and `feedback.send`. A line per
visitor using a form says nothing the table does not already say.

Ordering uses a `seq` column, not the timestamp: `now()` is the transaction's start time, so
every row a single request writes shares a stamp, and a write and the write that undid it would
come back in arbitrary order.

---

## 11. Privacy promises the code actually keeps

This is the part of the codebase with the most care in it, because each item is a promise made
on a public page.

**Takedown.** Any photograph comes down on request, *within three days and with no reason
required* — one constant, `TAKEDOWN_PROMISE`, so the gallery, the form and the inbox cannot
each promise something slightly different. Deletion really deletes the bucket object.

**Subject access.** `exportHousehold` gathers everything held about one household — the record,
the people, messages matched by email, sign-in attempts, and which fields changed (never *who*
changed them: the household is entitled to know its membership was marked lapsed; which
committee member did it is a fact about that person). It also **says out loud what it cannot
answer**: nothing records who appears in which photograph, so an export that silently omitted
photographs would read as "there are none of you".

**Erasure.** Deleting a household removes the people and cascades to their attendance records,
thinning the history behind it. The screen says so and points at taking the export first.

**Data minimisation.** Registration stays on Google Forms so registrants' details never enter
this database — only a headcount crosses, and a count has nobody in it. Feedback keeps no email
address. Photographs are stripped of EXIF before upload.

**Analytics.** Vercel Web Analytics: no cookies, no IP addresses, no profile, totals only. The
privacy page describes exactly this and must be kept matching.

---

## 12. Photographs

Photographs are **never in the repository** — they are members' faces. They live in a
Cloudflare R2 bucket served from `photos.13parbon.org.uk`.

The upload path, and why it is shaped this way:

1. **The browser re-encodes the file** ([lib/images/prepare.ts](../src/lib/images/prepare.ts))
   to a 1600px full size and a 600px thumbnail. Re-encoding through a canvas is what strips
   EXIF — location, camera, timestamp — and the result is **checked for surviving metadata**
   before it is sent.
2. **The browser asks `/api/photos` for permission**, carrying the signed-in person's Supabase
   token. The function asks the *database* whether that person is an admin.
3. **It gets back two short-lived signed PUT URLs** and uploads directly to the bucket. The
   file never passes through a server of ours.
4. **It asks the function to verify** what landed; anything still carrying metadata is removed
   from the bucket.

R2 credentials exist only as Vercel environment variables — in the browser bundle anyone could
read them and write to the bucket. The object key is validated against a strict pattern, since
on `DELETE` it decides which objects go and `../` would be an interesting afternoon.

`node scripts/prepare-photos.mjs <folder> <album-slug>` does the same resizing and stripping
offline, for bulk back-catalogue work. See [PHOTOS.md](PHOTOS.md).

---

## 13. Themes and look

Five **public** themes tied to the community's year — Festival, Boishakhi, Saraswati Puja,
Holi, Mahalaya — each a full set of CSS custom properties in
[tokens.css](../src/app/theme/tokens.css), a drawn SVG motif behind the hero, and an optional
photograph. The header's picker stamps `data-theme` on the root and remembers the choice.

Which one a first visit opens in is the committee's (`defaultTheme`, under Content). The
browser remembers the committee's last answer under its own key, and the inline script in
`index.html` reads it before the first paint, so a returning visitor does not see Festival red
flash to Holi magenta while the settings load.

Three **portal** themes — Paper, Linen, Slate — deliberately quiet. Nobody chooses a festival
palette to spend an hour on a spreadsheet, and the committee's screens used to follow the
public ones, which meant doing the books against a magenta Holi background.

Styling is CSS Modules per component, always through tokens. Shared components live in
[src/components/](../src/components/): `Button`, `Container`, `Carousel`, `Lightbox`,
`ConfirmDialog`, `Icon`, `EventCard`, `HouseholdForm`, `PhotoUpload`, `ShareButton`,
`VenueMap`, `ErrorBoundary` and friends.

A share card for link previews is generated by `node scripts/make-share-card.mjs` — crawlers do
not run JavaScript, so it has to be a real file at a real address.

---

## 14. The database

Supabase Postgres. **Everything lives in the `portal` schema, not `public`** — the project is
shared with the committee's planner app, which already owns tables called `people`, `events`
and `history`, and `create table if not exists public.people` would have quietly done nothing
and then switched RLS on for *their* table. `portal` must be added under Settings → API →
Exposed schemas.

| File | What it is |
|---|---|
| [`schema.sql`](../supabase/schema.sql) | Contact messages. Run first. |
| [`portal.sql`](../supabase/portal.sql) | Households, people, events, albums, media, news, notices, newsletters, settings, attendance, sign-in attempts, the audit log — and every policy. |
| [`feedback.sql`](../supabase/feedback.sql) | Feedback from the public. |
| [`verify.sql`](../supabase/verify.sql) | Proves the portal rules hold. |
| [`verify-feedback.sql`](../supabase/verify-feedback.sql) | Proves the feedback rules hold. |
| [`superadmin.sql`](../supabase/superadmin.sql) | Names the one account the rest of the committee cannot remove or demote. The table and the guard are in `portal.sql`; this is only the address. Nothing in the app can read it. |
| `*-seed.sql` | Sample content. |

**These are first-run scripts, not migrations.** `create table if not exists` is a no-op
against a table that already exists, so changing a column and re-running changes nothing and
says nothing. Anything that might need to change later is written as an explicit `alter table`
so re-running upgrades it. New tables go in new files.

### The verify scripts are the good bit

They do not describe the rules; they **exercise them**. Seeding happens as the owner (who
bypasses RLS), then every check runs as `anon` or `authenticated` with `request.jwt.claims` set
by hand — the same claim the helper functions read. Each block raises if a rule is not doing
its job. A clean run is silence followed by one notice, and the whole thing rolls back.

Three helper functions decide everything: `portal.auth_email()`,
`portal.current_household_id()`, `portal.is_admin()` — all `security definer`, all reading the
caller's own token.

Two behaviours to keep in mind when reading them: a blocked `INSERT` raises, but a blocked
`UPDATE`/`DELETE` does not — the policy simply matches no rows — so those are checked by
looking afterwards. And `anon` holds no grant at all on most tables, so it is refused before
policies are consulted.

---

## 15. Testing

Vitest + Testing Library + jsdom. **929 tests across 93 files.** Query by role and text, not
test IDs. Every component gets a test file beside it.

Beyond ordinary unit and component tests, five suites do unusual and load-bearing work:

| Suite | What it guarantees |
|---|---|
| [`audit.test.ts`](../src/lib/api/audit.test.ts) | Every contract method is classified read / audited / deliberately-not. A new method with no decision fails the build. |
| [`mock/rules.test.ts`](../src/lib/api/mock/rules.test.ts) | The mock refuses exactly what the policies refuse, so the app is never developed against a more generous world than it will ship into. |
| [`supabase/wiring.test.ts`](../src/lib/api/supabase/wiring.test.ts) | Each adapter really replaces its slice. Catches the half-wired case where a form writes to the real table while the screen reading it stays on fixtures — invisible from a screenshot, because sample data looks like real data. |
| [`accessibility.test.tsx`](../src/app/accessibility.test.tsx) | Every page, public and private, swept with axe. |
| [`sectionGate.test.tsx`](../src/app/sectionGate.test.tsx) | A section switched off is gone, not merely unlinked. |

`src/test/render.tsx` provides `renderWithProviders`, `TestDataProviders`, `createTestApi`,
`createEmptyApi` (every query empty) and `createFailingApi` (every read throws), plus a fixed
clock, `TEST_NOW`.

> **Watch out:** tests default to `env={}`. A component that reads `import.meta.env` directly
> will pick up your real `.env.local` and hit the live Supabase project — one test file took
> **533 seconds** before this was found. Take settings as a prop or from context.

`npm run test:coverage` enforces per-metric thresholds set in `vite.config.ts`. **As of
2026-09-21 the branch is below three of them** (statements 85.6% vs 86, branches 77.9% vs 78)
— a pre-existing shortfall, not caused by the newest work.

---

## 16. Deployment and environments

Production is **https://13parbon.org.uk**, built by Vercel from `main`. The domain is
registered through Cloudflare, which serves its DNS unproxied so Vercel issues the certificate.
`www` and the old `13parbon.vercel.app` both redirect to the bare domain by a host rule in
`vercel.json`, matched exactly so preview URLs are unaffected. Every pull request gets a
preview URL.

CI ([.github/workflows/ci.yml](../.github/workflows/ci.yml)) runs lint, typecheck,
`test:coverage` and build on every PR and push to `main`.

`main` is protected: no direct pushes, PR with green CI required, force pushes blocked.
Branches are `feat/`, `fix/`, `chore/`, `docs/`, `test/`, and commits follow
[Conventional Commits](https://www.conventionalcommits.org/).

---

## 17. Conventions, and traps to know about

**Read the comments.** This codebase explains *why*, often at length, and frequently records
the bug that prompted the rule. If something looks over-engineered, the comment above it
usually says which afternoon it cost somebody.

**Placeholders are `[in square brackets]`.** Content not yet written is bracketed; pages hide
it rather than showing a placeholder, and `gaps.ts` counts it by reading the content — after a
hand-written count of "24 gaps" stayed on screen long after the committee had filled them in.

**Absent, not null.** Domain types use optional fields; adapters convert `null` to absent with
`...(row.x ? { x: row.x } : {})`. A null `publishedAt` reads as published-at-nothing and sorts
to the bottom.

**Dates are ISO 8601 strings** in domain types, formatted only at the edge by
[`domain/dates.ts`](../src/domain/dates.ts). "Now" is injected via `ClockProvider`, so
countdowns are testable.

### Traps

| Trap | What happens |
|---|---|
| `.select()` after an insert on a public-write table | `INSERT ... RETURNING` is a *read*, which answers to the SELECT policies — of which a visitor has none. The whole request fails. The contact form was broken live for a month over this. Return a receipt you built yourself. |
| Holding a mock row across a write | The mock mutates in place, so reading "before" values afterwards gives the new values twice and diffs to nothing — a **silently empty audit trail**. Use `snapshot()`. This bug was written three times before anyone noticed. |
| Forgetting the viewer in a React Query key | Signing out of an admin account and into a member one serves the member the admin's cached data. |
| Editing a column in `portal.sql` and re-running | `create table if not exists` does nothing. Write an `alter table`. |
| Seeding feedback with `status = 'approved'` | The `stamp_feedback` trigger has no exception for privileged callers. Insert, then update. |
| A component defined during render | React throws the subtree away each render — in a form, the cursor leaves the box after every keystroke. |

### Where to look first

| Question | File |
|---|---|
| What can the app do? | [`src/lib/api/types.ts`](../src/lib/api/types.ts) |
| Who is allowed to? | [`src/lib/auth/permissions.ts`](../src/lib/auth/permissions.ts) |
| What is *actually* allowed? | [`supabase/portal.sql`](../supabase/portal.sql) |
| What can the committee change? | [`src/domain/settings.ts`](../src/domain/settings.ts) |
| What do the pages say by default? | [`src/app/site.ts`](../src/app/site.ts), [`about.ts`](../src/app/about.ts), [`privacy.ts`](../src/app/privacy.ts) |
| Where does a URL go? | [`src/app/router.tsx`](../src/app/router.tsx) |
