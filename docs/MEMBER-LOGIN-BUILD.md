# Member login — the build

> **Branch:** `feat/member-login`. Nothing here goes near main until the committee is happy.
> No pull request, no merge, until then.
>
> **What this is:** the order of work from [MEMBER-LOGIN.md](MEMBER-LOGIN.md), broken into steps
> that can be ticked off. That document says *what* and *why*; this one says *where we are*.
>
> **Last updated:** 2026-09-17 · **Current step:** 6 · **Ticked:** 100 of 107

## How this is kept

- A box is ticked **in the same commit as the work it describes**, so the file never claims
  something that is not on the branch.
- Every step has a **Done when** — something observable, not "wrote the code". If it cannot be
  demonstrated, it is not ticked.
- `~` marks a box that is started but not finished, so a step in progress is visible.
- The log at the bottom gets a dated line per step completed. Over five weeks that is the only
  honest record of how long any of this actually took.
- **Merge `main` into this branch every week or so.** Main keeps moving — albums, fixes — and one
  large reconciliation at the end is worse than six small ones.

## The order this is being built in

**Decided 2026-09-15: finish the interface first, stand the database up at the end.**

It works because the app was built for it — `ApiClient` with a mock adapter — and because of
what 0.2 fixed. The mock used to be *more permissive* than the database, which would have meant
every screen written in the belief that it could ask for anything. It now refuses exactly what
the policies refuse, `can()` states the same rules a third time, and `mock/rules.test.ts` mirrors
`verify.sql` block for block. Screens built on that are built against real constraints.

It also makes the decisions better. Two of the best calls so far — registration stays on Google
Forms, events stay in the planner app — were "we already have that", and both were easier to see
with something concrete in front of us.

**One thing is not deferred with the rest: proving the SQL runs.** `portal.sql` is ~600 lines
nobody has executed, and every week of interface work adds screens resting on it. An RLS mistake
is a leak, not a glitch, and the cost of finding one grows the whole time. That does not need
*the* project, though — a throwaway Supabase project, ten minutes, `schema.sql` then `portal.sql`
then `verify.sql`, read the output, delete it. No Google sign-in, no domain, nothing committed to.
It also catches the fixtures drifting from the `check` constraints, which they will over another
twenty screens.

**What the interface cannot finish on its own**, so "done" stays honest:

| | |
|---|---|
| Persistence *is* the feature in places | 0.2's "survives a reload" cannot be met by any mock |
| The Supabase adapter | Every method exists twice and the real half is currently zero. Mechanical, because the contract is narrow — but it all arrives at once |
| Real failure states | A policy's 403, a conflicting write, a dropped connection. Simulable; which ones actually happen, Postgres tells you |
| Media upload | Wants R2 credentials rather than Supabase — same shape of blocker, different key |

## Where it stands

| Step | | Days | Status |
|---|---|---|---|
| — | The story, checked and amended | — | ✅ done 2026-09-15 |
| 0 | Foundations | 8–11 | ✅ **done** — the policies are run and pass |
| 1 | The smallest write, end to end | 0.5 | **mostly done** — brought forward into 0.2 |
| 2 | Households | ~5 | ✅ **done** |
| 3 | Events | ~2 | **design screen built**; the planner owns the logistics |
| 4 | Media | ~4 | ✅ **done 2026-09-17** — a photograph went up and came down again, against the real bucket |
| 5 | Content | ~4.5 | ✅ **done** bar the nested content (FAQ, committee list, theme captions) |
| 6 | Ready to merge | ~2 | **in progress** — the gate is what is left |
| | **Total** | **~32–36** *(incl. tests, adapters, states)* | |

**Cheapest useful stopping point:** end of step 2. That is PLAN's phase 2 exit criterion — a
committee member adds a household, that household signs in with Google and sees their dashboard —
and it is about a third of the way in.

---

## Step 0 — Foundations · 8–11 days

Twenty per cent of the days and eighty per cent of the ways this goes wrong. Nothing real can be
stored until this is right, and it is free to get right while the data is still fixtures.

### 0.1 Row level security · 5–7 days

> **Run, and it passed** *(2026-09-15)*. Against the committee's existing planner project, into
> a `portal` schema of its own. `verify.sql` raised nothing, which is how it reports success —
> every check in it fails by raising. Eight tables, sixteen policies, six functions, two triggers,
> and the planner's five tables untouched beside them.
>
> **The round trip works** *(2026-09-16)*. Google → Supabase → PostgREST → the policies → the
> dashboard. Doing it found three things no mock could have: the guard treated "still working out
> who is here" as "nobody", and sent somebody who had just signed in back to the sign-in page; the
> sign-in page had no idea what to do with somebody already signed in; and the Google button wore
> its disabled styling in every state, so the only way to learn it was live was to click something
> that looked dead.
>
> What is still unproven is the part that needs two accounts: signing in as an ordinary member
> with a household, and finding that another household simply is not there.

- [x] Rewrite `supabase/portal.sql`: tables now come before the functions that query them
- [x] Replace `current_setting(...)::jsonb` with `auth.jwt()`, which folds the empty string to null
- [x] Make the `auth.users` triggers unable to fail, so a note to the committee cannot take the door down
- [x] `households` table + policy: a member reads their own household and no other
- [x] `households` policy: an admin reads and writes all
- [x] Policy on `people`, `documents`, `sign_in_attempts` *(`registrations` went with the booking data)*
- [x] `contact_messages`: admins can read and handle; it stays insert-only for everyone else
- [x] And the inbox *screen* actually reads it *(the policy was written; nothing used it — found 2026-09-16)*
- [x] `kind` and `handled_note` columns, so a takedown is still a takedown once it reaches the table
- [x] A visitor may insert only the five columns the form sends, not `handled_by`
- [x] **`verify.sql` caught the contact form failing against the real database** — 2026-09-16
- [x] `return=minimal`: the app stops asking for a row a visitor is not allowed to read back
- [x] **`portal.sql` and `verify.sql` run again, amended** — passed 2026-09-16
- [x] And again with the gallery and the events tables — 2026-09-16. Every table the app reads now exists in the project
- [x] Explicit grants, rather than trusting Supabase's default privileges *(found on the way)*
- [x] Keep `service_role` executing the helpers after revoking them from `public` *(found on the way)*
- [x] Rewrite `verify.sql` so it exercises the policies, not only the helper functions *(found on the way)*
- [x] **Run `portal.sql`, then `verify.sql`, in the project** — passed 2026-09-15, first time
- [x] Sign in with Google against the real project — works end to end, 2026-09-16
- [x] Sign in as a *member* with a household and confirm another household is not there — done
      2026-09-17, and asked of the database rather than of the screen: four tables queried with
      the member's own token, bypassing the app. One household, its own people, nothing from the
      inbox or the sign-in attempts. All four answered 200, which is the point — a 401 would have
      meant the gateway refused and told us nothing about the policies
- [x] Take `supabase/portal.sql` and `supabase/verify.sql` out of `.gitignore` and commit them

**Done when:** a signed-in member, using the browser console and their own token, cannot read
another household. Demonstrated, not assumed.

**One scare, and it was mine.** The check I wrote to prove the planner was untouched asked
whether `public.people` had row level security on, and expected `false`. It came back `true` —
which is the planner's own doing, because Supabase switches RLS on by default for tables made
through its dashboard, and that table has four policies of its own. I had written the wrong
expectation, not found a problem. The evidence that settles it is simpler than any query: the
planner still works, and it could not if something here had enabled RLS on its table without a
policy.

**What changed, and why**

| | |
|---|---|
| Order | A `language sql` body is parsed when the function is created, so a helper written above `households` failed on a table that did not exist. Tables first now |
| `auth.jwt()` | `current_setting('request.jwt.claims', true)::jsonb` throws on an empty string, and an empty string is exactly what an unauthenticated request leaves behind |
| Triggers that cannot fail | A trigger on `auth.users` runs inside the transaction that signs somebody in. If it raises, that sign-in fails — so a bug in *recording that a stranger knocked* would lock out every member and admin, including the one person who could fix it. The body now swallows its own failure |
| `on conflict` | `set attempts = public.sign_in_attempts.attempts + 1` is not valid there: the target is in scope under its own name or an alias, never schema-qualified. Aliased now |
| Grants | Policies were being written against tables that might hold no grant for `authenticated`. That fails closed and looks exactly like a policy bug. Said out loud now |
| `service_role` | Revoking the helpers from `public` would have taken them from `service_role` too, breaking any later server-side function — the R2 presign endpoint among them |
| The directory view | Kept as a definer view, and the reasoning written down. Supabase's linter flags it; the alternative leaks more, because a row-level policy admitting members to listed households exposes `phone` to anyone querying `households` directly, and the view's masking would then be decoration |

**Still keyed on email, deliberately.** Matching a household by `google_email` rather than
`auth.users.id` is what the invitation model requires: the committee records an address before
that person has ever signed in, so there is no user id to record. The cost is that a changed
Google address needs changing here too — for fifty households, a smaller problem than a linking
step that can go wrong.

### 0.2 A contract that can write · 1–2 days

> Done on mocks, which covers all of it bar the Supabase half. Taken together with the first
> half of step 1, because the smallest write was the thing worth proving the pattern on.

**The trap this closed first.** The mock was *more permissive than the database*.
`listDirectory()` returned whole `Household` objects — `email`, `phone`, and `people[]` with
children's names — and the masking happened afterwards, in the browser, at `DirectoryPage.tsx`.
That is the allowlist mistake again: a decision about what to **show** standing in for a
decision about what to **give out**. Harmless against fixtures; a leak the moment the obvious
adapter (`select * from households where listed_in_directory`) is written to satisfy the
interface. Building every screen against a mock that permits more than Postgres will is how an
app gets written in the belief that it may ask for anything.

- [x] `DirectoryEntry` type, and `listDirectory` narrowed to it — the API cannot hand over a
      phone number it should not, because the type will not carry one
- [x] Masking moved out of the page and into the API, where it cannot be refactored away
- [x] `Viewer` threaded through every portal read, so each says in its own signature that the
      answer depends on who is asking
- [x] The mock refuses exactly what the policies refuse — not found and not allowed give the
      same answer, because "it exists but is not yours" is itself a fact about a household
- [x] The viewer is part of every query key: without it, signing out of an admin and into a
      member serves the member whatever the admin already fetched
- [x] `portal.identify()` for sign-in — which used to call `listHouseholds()`, *before anyone
      is signed in*, and would otherwise have needed a hole in the rules to keep working
- [x] `contact.markHandled()`, the first mutation, with the invalidate-after-write pattern
- [x] Mock implementations, so the parked site and the suite keep working
- [x] 27 new tests: `mock/rules.test.ts` mirrors `verify.sql` block for block
- [x] A disabled style for `Button` — nothing had used `disabled` until this, and a button that
      ignores a click while looking ready to take one reads as a broken page
- [x] The Supabase adapter for the whole `portal` section — reads and writes, against the real database
- [x] The site's own switches — `site_settings`, read by everybody, written by the committee
- [x] News: posts, notices and newsletters — published content readable by everybody, drafts by the committee
- [x] The gallery — albums and photographs in the database, with the bucket reached through `/api/photos`
- [x] Events — `portal.events`, designed and published from `/admin/events`
- [x] Per-resource mutations land with their own steps, not speculatively up front — followed: every resource above arrived with the step that needed it

**Done when:** one value can be changed from the UI and survives a reload. *Changed from the UI
and proven by test; surviving a reload needs somewhere to persist, so this closes with 0.1.*

**Three enforcers, one set of rules:** `supabase/portal.sql` (the truth), the mock (what the app
develops against), `can()` (what the UI draws). `mock/rules.test.ts` and `verify.sql` check the
first two say the same thing. If they ever disagree, the database is right.

### 0.3 The audit table · 1 day

Before the first write, not after. A trail added later starts empty and misses the months where
the mistakes were made.

- [x] Table: who, what, which record, when, and the value **before** as well as after
- [x] Written by a trigger in the database and by a wrapper around the client, not by each caller
- [x] Readable by admins; writable by nobody, including admins — no insert or update policy exists
- [x] A guard that fails if any method is added to the contract without deciding whether it audits
- [x] Run the trigger against the project

**Done when:** changing a value leaves a row behind, without the calling code asking it to.
*True on mocks, and tested. The trigger is written but unrun, like the rest of 0.1.*

**Before, not just after.** The question asked six months later is never "did this change" — it
is "who unpublished that", "when did she become an admin", "what was the number before". A trail
that only records that a row moved answers none of them.

**Where the mock is honestly weaker.** In Postgres the trail is a trigger on the table, so
nothing reaching it can opt out. A mock has no triggers, so `withAuditTrail` wraps the whole
client instead — the methods underneath neither know nor can refuse — but a *new* mutation is
only recorded once it is added there. That gap is the one thing a wrapper cannot close, so
`audit.test.ts` reflects over the client and fails if any method exists that nobody has classed
as a read, an audited write, or a deliberate exception.

**Found while writing it:** the wrapper read the old value off the row *after* the write. The
mock changes rows in place, so it was reading the new value twice and diffing to nothing — a
silently empty trail, which is the one failure an audit trail must not have. There is a
regression test for it now, and for the matching case in the trigger: a write that changed
nothing writes no line.

**A retention question this raises.** `on delete set null` means erasing a household leaves its
trail behind with nobody named in it. That is the right way round — somebody asking to be
forgotten should not stay named in a log — but the committee should export the trail before
deleting anybody, or lose the account of what that household did.

### 0.4 One place that answers "may they?" · 0.5–1 day

- [x] `can(viewer, action, resource)` in `src/lib/auth/permissions.ts` — planned in PLAN §2, never written until now
- [x] Table-driven tests for every role × action — 82 of them
- [x] `RequireSession`, the portal navigation and the first button all ask `can()`
- [x] `canStopBeingAdmin()`, so the committee cannot lock itself out
- [x] A database guard for the last admin — `portal.guard_last_admin`, refusing in the same words as the mock

**Done when:** the permission tests fail if a rule changes. *Better than that in the end: the
table is typed `Record<Action, …>`, so adding an action without deciding who may do it fails to
compile. A permission with no stated answer is exactly the kind that defaults to whatever the
first caller assumed.*

**Deliberately the weakest of the three enforcers.** It runs in the browser, so it decides what
the app *shows*, never what anybody can *reach* — someone editing their own JavaScript can make
every `can()` return true and still get nothing back, because the policies do not ask this file's
opinion. Its job is to stop a person being offered a button that was only ever going to fail.
Every rule in it names the policy it mirrors.

**Left alone on purpose:** the role *pills* in `PortalLayout`, `AdminPeoplePage` and `LoginPage`.
Those display what somebody is; they do not decide what somebody may do. Routing a label through
a permission check would make `can()` look like it governs more than it does.

---

## Step 1 — The smallest write, end to end · 0.5 days

Marking a contact message handled. The point is not the feature; it is proving all four
foundation pieces work together on something with nothing at stake.

- [x] Mark a message handled from `/admin/messages` — done early, as 0.2's proof of the pattern
- [x] A member cannot do it, and cannot read the inbox to try
- [x] It persists past a reload and it audits — and the committee can read the trail at `/admin/audit`

**Done when:** the committee can clear their inbox, and the audit table says who cleared what.

---

## Step 2 — Households · ~5 days

The data everything else hangs off.

- [x] `validateHousehold()` in the domain, every rule matching a `check` constraint in `portal.sql`
- [x] The nested `people[]` form: adults and children added and removed inline, with ages and notes
- [x] One form for adding and editing, and for the committee and the household — which fields
      appear is decided by `can()`, not by which page rendered it
- [x] Wire it to `/admin/people` (add, and edit any household)
- [x] Wire it to `/portal/household` (a household editing its own)
- [x] The mutations behind it: `addHousehold` and `updateHousehold`, both audited
- [x] Record and change `googleEmail` — this is what "reset password" actually means here
- [x] Set membership status (`active` / `lapsed`) and `paidTo`
- [x] Assign the `admin` role, **and refuse to remove the last admin** — refused at the API now, not only by the button; still no constraint behind it in Postgres
- [x] Sign-in attempts: add them, or mark resolved — and "add them" arrives knowing the address,
      because retyping one we were already given is how somebody gets locked out
- [x] A member editing their own household: same form, different permissions
- [x] A member's own privacy choices: `listedInDirectory`, `shareEmail`, `sharePhone`
- [x] Export a household as the GDPR subject-access answer — readable on the page, and savable
      as a file
- [x] The committee's working list as a spreadsheet — counts, not names; safe to open
- [x] Delete a household — erasure, with the copy offered first and the name typed to confirm

**Done when:** a committee member adds a household that is not their own, that household signs in
with Google, sees their dashboard, and edits their own details. *(PLAN phase 2 exit criterion.)*

**Parked: the spreadsheet import** *(2026-09-15)*. It was to be the first job here, on the
grounds that re-typing what the committee already has is a poor first day. Set aside for now,
so households get added through the form to begin with. Picking it up needs nothing but the
spreadsheet's column headings, and the sooner it happens the fewer rows there are to reconcile.

**One form, not two.** Adding and editing are the same form, and so are the committee's version
and the household's. Two forms agree about what a household is right up until the day somebody
changes one of them. What differs is which fields appear, and `can()` decides that rather than
the page — so a member who reaches the committee's route still cannot see the committee's fields.

**No form library.** PLAN §5 proposed React Hook Form and Zod; neither is installed, and the
contact form was hand-rolled against a `validate…()` helper in the domain. This follows that,
rather than adding two dependencies to a mobile-first site that scores 100 on Lighthouse. Worth
revisiting only if the forms get much harder than this one.

**Erasure takes the registrations with it** *(decided 2026-09-15)*. The cleaner reading, and what
the schema already does. The cost is real and the screen says it out loud: past events lose those
headcounts, so the attendance history thins out behind you. Three guards — never your own
household, never the last admin, and the household's name typed to confirm, because a dialog is
something people click through and this is not an action to lose to a misclick. The copy is
offered in the same panel rather than somewhere else: afterwards it is the only record of that
household that will exist, and *you should have taken one first* is a poor thing to say then.

**Both exports now exist.** Subject access is readable on the page with the file alongside;
the committee's list is a CSV of households and headcounts. They were one box, and they wanted
opposite instincts.

**Two exports, not one.** The box said "export" and was hiding two different jobs. *Subject
access* answers a household asking what we hold: it errs towards completeness and goes to them.
The *committee's working export* — the caterer's list, the spreadsheet — wants the opposite, and
carries no notes, no children's names and no sign-in addresses, because that file gets emailed
about. Only the first is built; the second is still open.

**Three things the obvious version would have missed:**

| | |
|---|---|
| `contact_messages` holds no household | It is keyed by whatever address was typed into the form, so an export built by joining on `household_id` silently omits every message they ever sent. Matched on address instead — and the export says so, or an empty list reads as "you sent none" |
| The notes on each person | "Vegetarian", "Dance group" — free text about a person is data about that person, and it is the part that gets forgotten |
| `sign_in_attempts` | Their address and the name Google gave, from before the committee had recorded them |

**And one it cannot answer: photographs.** The privacy page promises to take down any photograph
somebody appears in, but nothing records who is in which picture — so no export can say which
show them. It says that out loud, because a silence there would read as "there are none of you".

**Whose data is in it.** The trail names the committee member who made each change. A household
is entitled to know its membership was marked lapsed; which admin did it is a fact about that
admin. So the export lists the date and which fields moved, and never the actor.

**Export before erasure.** `on delete set null` leaves a deleted household's trail anonymous —
right for privacy, but the account of what they did goes with it. So the delete flow should offer
this as its first step rather than leave it as a separate feature somewhere else.

**The rule a form cannot keep.** A draft is whatever the browser chose to send. The form does not
draw the committee's fields for a member — but that is a fact about the form, not about the
request, so `updateHousehold` refuses a member's draft carrying a role, a sign-in address or a
membership change rather than quietly ignoring it. The same answer the trigger in `portal.sql`
gives, in the same words, and tested from the API rather than through the form: testing it through
the form would only prove the form.

**Found while writing it:** every privacy checkbox had its explanatory sentence *inside* its
`<label>`, so the accessible name of each box was the choice plus the whole sentence — read out
in full every time focus landed there. The notes are tied on with `aria-describedby` now.

---

## Step 3 — Events · ~2 days *(was ~4.5)*

> **Mostly gone, 2026-09-15.** The committee already runs
> [budhap-dev/event-management](https://github.com/budhap-dev/event-management) for this, live at
> `13parbon-event-management.vercel.app` and already linked from the portal. Events are managed
> there; this site shows what is on. Building a second event back office here would be a second
> place to keep the same dates correct.

- [x] **Decided 2026-09-16: it does not.** The designer here owns the public evening; the planner keeps the logistics. They overlap on a title, a date and a venue and nowhere else, and neither reads the other
- [x] A design screen for how an event looks to the public — the other half of the planner
- [x] Add an event here, because front of house has to be able to create what it owns
- [x] Archive an evening that has been and gone
- [x] A cover photograph and a programme, neither of which the model had
- [x] Five quiet ways for the cover to move, and the cover drawn on the public event page
- [x] Render `cancelled` on the public pages — and make a cancelled evening reachable at all
- [x] The `Registration` fixtures are gone from `/admin/events` and the dashboard — removed, not filled
- [ ] Volunteer roles and sign-up — in the domain, in PLAN phase 3, and not covered by the other app either

**The design screen** *(2026-09-15)*. The planner holds the logistics — tasks, teams, who is
bringing the urn. This holds front of house: what somebody sees on arriving to find out what is
on. They overlap on the title, the date and the venue, and nowhere else, so it is the other half
of the same evening rather than a second copy of the planner.

It previews as you type, beside the form. A theme in Bengali with a subtitle and an English
rendering is hard to picture from four text boxes, and these fields end up on a page nobody edits
them next to. The preview also says *why* there is no booking button — closed, or no address yet
— rather than just not drawing one.

Two fields the model never had: a cover photograph (an address in the bucket, never a file in the
repository, because an event cover is usually last year's evening with members' faces in it) and
a programme. **Not "speakers":** nobody is booked here, the stage is filled by members who put
their names down, which is what `performerCall` asks for.

**A cancelled evening used to vanish** *(fixed 2026-09-15)*. It was filtered out of every
listing *and* out of `getBySlug`, so its page answered as though it had never existed. Anybody
holding the link, or who saw it last week, learned nothing — which is how somebody ends up
outside a hall on a Saturday. It is reachable now, it stays in the calendar marked, and the page
says what happened before anything else.

Said as a sentence rather than a badge, and it names the venue: whoever is reading has almost
certainly come to find out what time to turn up, and a small grey pill beside the title is easy
to read straight past.

Everything that invites somebody to it goes with it — the booking button even when booking was
left open, the call for performers, the call for volunteers, and the countdown, which is removed
rather than hidden so nothing reads it aloud. *Ask a question* stays, because somebody wanting to
know what happened is exactly who is on that page.

The home page skips it when choosing the next event: the next event means the next one that is
actually happening.

**Where a new event comes from** *(2026-09-15)*. Here. The design screen could only edit what
already existed, and nothing could add one — so with events arriving from the planner still
undecided, the answer was "nowhere". Front of house has to be able to create what it owns.
Title, date and venue get typed twice, three fields perhaps thirteen times a year, and if the
planner ever grows an export it fills those same three and the typing stops.

A new evening **arrives as a draft whatever the form says.** Nothing should reach the website
because somebody opened a form and was called away.

**Archiving is offered, not automatic.** A date passing is not the same as the committee being
finished with an evening, and one that tidied itself away while somebody was writing the
round-up would be its own small annoyance. The Archive button appears only on an evening that
has been and gone and has not been filed.

**Editing something live says so.** A published event carries a line before the form: *this is
on the website, anything you save changes what visitors see straight away.* Changing a venue on
the morning of the event should not feel the same as writing a draft.

**The cover can move, a little** *(2026-09-15)*. Five choices — still, slow zoom, slow drift,
fade in, and into colour, which is the same idea as this year's theme photographs. Still leads,
because it is the right answer more often than not, and the list stays short on purpose: a
handful of quiet options is a choice, twenty is a way of making an event page into a slideshow.

All of them are CSS on `transform`, `opacity` or `filter`, which the browser animates on its own
thread. Nothing runs JavaScript on a timer on a page that scores 100 on Lighthouse.

**Anybody who has asked their machine for less movement gets none**, and the screen says so where
the choice is made. `index.css` already shortens every animation to a hair, which stops motion
but leaves each one on its last frame — a zoom would sit permanently zoomed in. These are turned
off properly rather than hurried.

One component draws it in both places, so the designer's preview and the public page cannot
disagree about what a choice looks like. A preview that flatters is worse than no preview.

**Dropped, because the other app owns them:** creating and editing events, publish/unpublish,
cancelling, copying last year's, and the cancellation email.

**Done when:** the next event on the home page is the one the committee entered in the planner,
without anybody typing it twice.

### How the event gets here — the choice to make

| | Cost | Risk |
|---|---|---|
| **Type it twice** — committee re-enters the handful of fields the public page shows | Nothing to build | Two places to be right, and the public one goes stale first. It is also what we do today |
| **Export a JSON file** the planner publishes, which this site reads | Small, on both sides | Needs the other app to grow an endpoint, and a stale file is silent |
| **One shared database** — both apps read the same Supabase project | Largest, and it couples them | The two apps then have to agree about what an event is, forever |

My read: the export. It keeps the two apps independent, and the fields this site shows are few —
title, date, venue, a line of description, the registration link. Worth confirming before anything
is built, and worth a look at what the planner already stores.

---

## Step 4 — Media · ~4 days

The takedown promise stops depending on a macOS script and a person remembering to run it.

- [x] The browser half of uploading: choose, prepare, check, send
- [x] **Presign endpoint** — `api/photos.ts`, signing an upload and removing an object; logic and tests in `src/server/photos.ts`
- [x] **Set the six R2 values in Vercel** — see `docs/PHOTOS.md`. Done 2026-09-17, and eight rather than six: the two Supabase values had never been put there either
- [x] Client-side re-encode to 1600 and 600, which never writes metadata rather than stripping it
- [x] Apply EXIF orientation before discarding it, or portrait photographs come out sideways
- [x] HEIC: **decided 2026-09-15** — JPG, JPEG and PNG only, and the screen says so
- [x] Verify in the browser before anything is sent — the script's refusal, carried over
- [x] Verify the object again server-side — done 2026-09-17. The object is read back out of the
      bucket by the function and put through the same rules the browser used. Pinning the signed
      PUT to image/jpeg constrains what an upload *claims*, not what its bytes are, and every
      check before this ran on the machine being defended against. Anything that carries metadata
      is taken out of the bucket and no row is written, so a refused photograph is never at a URL
- [ ] Compare quality against `sips` at q70/q68 before switching over
- [x] Create and edit albums
- [x] ~~Pin an album cover~~ — **taken off the screen 2026-09-15 at the committee's request.**
      The API and its tests remain, unreachable; strip them or keep them for later
- [x] Edit captions
- [x] Order photographs explicitly — an explicit `position`, because reordering a page by
      renaming objects in a bucket is not a thing to ask of anybody
- [x] Delete a photograph — the contract says in as many words that an adapter hiding the row
      and leaving the file has broken the promise while appearing to keep it
- [x] Somewhere for a takedown request to land, with a promised turnaround

**Done when:** a committee member on a laptop, with no terminal, puts an album up — and a
photograph with GPS in it arrives in the bucket with none.

**Met 2026-09-17, and checked from outside the app.** The uploaded file was fetched back from
`photos.13parbon.org.uk` and walked segment by segment: JFIF, an ICC colour profile, and the
picture. No EXIF, no GPS, no XMP, no IPTC, and no camera or date string anywhere in the bytes.
Then deleted from the screen, and both sizes gone from the bucket.

**One gap, found in that last check.** The first fetch after the delete still returned the
photograph: Cloudflare's edge had cached it from an earlier download, and went on serving a copy
of a file R2 no longer had. A taken-down photograph therefore stays reachable at its public
address until that cache expires. The promise is *tell us and we will take it down*, so this
wants either a short cache TTL on the bucket's custom domain or a purge when the object goes.
Not fixed: both change how every photograph is served, which is not a thing to guess at.

**It does not strip metadata; it never writes any.** The picture is re-encoded from a pixel
buffer, so EXIF, GPS, camera, date, XMP, IPTC and the little preview image EXIF carries — which
is the pre-crop picture, and the one people forget — are gone by construction rather than by
having been carefully removed. And the original never leaves the machine: sending a 12MB
photograph to a server to have its GPS taken off means the GPS was on the server.

**Orientation is the trap.** The rotation a phone records lives in EXIF — inside the thing being
thrown away. Decode without applying it first and every portrait photograph comes out on its
side; it is the commonest bug in browser-side EXIF stripping. `imageOrientation: 'from-image'`
is the whole fix.

**It checks its own work.** The output is read back byte by byte and refused if anything survived,
so the promise rests on the bytes rather than on the canvas having behaved. That refusal — *"do
not upload"* and a non-zero exit — is the best line in `prepare-photos.mjs`.

**How the photographs are handled** *(reworked 2026-09-15)*. The picture is the way in: click it
and it opens large, with left and right through the album and a delete there too. Delete is a
trash on the picture itself rather than one of a row of lookalike buttons underneath. Order is
changed by dragging.

**Dragging has no keyboard path**, which is why the arrows did not simply disappear: the picture
button also takes arrow keys, so reordering stays reachable without a mouse. Nothing is drawn for
it — it lives in the button's accessible name and in the line under the album title.

**The cover rotation was not a bug.** It looked like one — a random pick on every fetch — but
there is a comment saying why: one photograph is not the whole of an evening, and a different
face each visit says so. So pinning *overrides* rotation rather than replacing it. Most albums
keep rotating; the one with the picture that actually says what the night was gets pinned.

**Two refusals worth keeping.** A cover has to be a photograph from that album, or one evening
fronts with another's picture. And a reorder has to be the whole album, once each — a partial
list would quietly drop everything missing to the end, which is the kind of thing nobody notices
until an album is in the wrong order for a year.

**The screen it is all driven from** is `/admin/media`, which did not exist — the route was in
PLAN's map and never built. Albums on one screen, the photographs of one album on the next:
caption, pin as the face, move earlier or later, take down. It says what the upload accepts
before anybody tries, and it says the metadata never leaves the machine, because that is the
promise and a promise nobody is told about is not much of one.

**The takedown promise has a route now** *(2026-09-15)*. The gallery has always said *tell us and
we will take it down* — and it linked to the ordinary contact form, so a request arrived between a
parking question and somebody asking to sing, with nothing marking it and nothing recording that
the picture actually came out. A promise made in public with no process behind it.

Four small things, none of them clever. The link carries why somebody is there, so they are not
retyping *please take down the photograph of my daughter* into a blank box under a heading that
says Contact us. The promise is one constant, so the gallery, the form and the inbox cannot
promise slightly different things. Requests nobody has dealt with sort above everything else and
are counted separately. And **marking one done requires saying what was done** — "handled" on its
own does not tell anybody whether the photograph came out of the bucket, which is the only part
that matters.

It also meets somebody where the contact form is switched off, which it is on a build with no
Supabase: the notice appears anyway and points at the email address. The promise does not depend
on the form working.

**Uploading, from the screen** *(2026-09-15)*. The cover field used to say "an address in the
photo bucket, never a file from this repository", which told the committee what not to do without
giving them a way to do anything. There is a file picker now: choose a photograph, it is prepared
in the browser, and the field fills itself in.

What it says when it is ready is the point — *1600×1200, 214KB and 31KB for the grid. **No
location, camera or date** — the picture was re-made here, so there was none to carry.* Not
"stripped": there was never any to strip.

**The last step is off until there is a bucket to talk to**, and it says so rather than offering
a button that fails: *there is nowhere to put it yet — everything above is real, prepare the rest
with `prepare-photos.mjs` and upload by hand for now.* The same shape as the contact form
offering an email address when there is nowhere for a message to go. Two settings switch it on,
`VITE_PHOTOS_SIGN_URL` and `VITE_PHOTOS_URL`, and then the endpoint behind the first one has to
exist.

**The file never passes through a server.** The browser asks a small endpoint for a one-off
permission and puts the photograph in the bucket itself — R2 credentials cannot live in the
bundle, and a server that relayed the file would be a server holding somebody's photograph.

**What is not covered, honestly.** The canvas itself cannot be exercised in the test environment,
so the three-line wrapper around `createImageBitmap` and `toBlob` has no test; everything it is
handed to does. And the quality against `sips` at q70/q68 still wants one side-by-side look in a
real browser before the back catalogue's successor goes through it.

---

## Step 5 — Content · ~4.5 days

Last, because a page of placeholders reads worse than no page.

- [x] Announcements: create, pin, set audience, expire, take off the board
- [x] News posts — **and there is no spike.** The model is plain paragraphs (`paragraphs()`
      splits on blank lines), so a textarea is the honest editor and no rich text is needed
- [x] Unpublish rather than delete, with the change recorded as its own kind of change
- [x] The FAQ is edited from `/admin/content` — the last of the nested lists to leave the files
- [x] Edit the pending strings in `src/app/site.ts` — mission, venue, address, email, gallery note
- [x] Move the `site.home` section switches into the admin
- [x] Move `showNextEventStrip` into the admin — and `showPhotos`, `showNews` and `showMemberSignIn` with it
- [ ] Write the first real news before turning `showNews` on

**Done when:** the committee publishes something without a developer.

**The gap count was a lie, and is now counted** *(2026-09-15)*. The content screen announced
*24 gaps still showing publicly* — 7, 13 and 4, hand-written when the pages were built and never
recounted. There was one. The committee had filled in the rest months ago and the screen was
still nagging them about twenty-three things they had done. It walks `site.ts`, `about.ts` and
`privacy.ts` for bracketed strings now, and **names** them: *"13 to fill in"* sends somebody
looking through a file, *"missionStatement"* sends them to the line.

**Seven of those lines are editable** — tagline, who we are, mission and vision, venue, address,
email, the gallery note. Flat strings only, and the screen says so: the FAQ, the committee list
and the captions under the theme photographs are nested arrays and stay in the files until
somebody needs to change one without a developer. It also says when a line is still in brackets,
because that convention is the one thing about these files somebody has to be told, and the form
is where they would meet it.

**The switches are the committee's now.** `showPhotos`, `showNews`, `showNextEventStrip`,
`showMemberSignIn` and the five home page audiences were a typed const in `site.ts` — turning the
news section on meant a pull request and a deploy, for a decision that is entirely theirs and
that they may want to reverse on the night. `site.ts` still holds what each one falls back to, so
a project with nothing saved behaves exactly as the code says, and a database that cannot be
reached does not suddenly publish what was switched off.

It is a fixed shape, not a bag of key–value pairs: a settings table anybody can put anything in
drifts, and a row driving a key that no longer exists fails silently. A switch not in the type
does not exist.

**`nav.ts` had to stop being a constant.** Its arrays were built once, when the module was first
imported — fine while the answer lived in a file that only changed with a deploy. Turning the
gallery off would have left *Gallery* in the header until somebody reloaded.

**Found while doing it:** the sitemap test only ever checked pages that are currently navigable,
so nothing had accounted for `/news`. The day the committee switches news on it becomes a page in
the header that crawlers have never been told about — and nobody will think of the sitemap at
that moment, because they will be thinking about the news. There is a test naming it now.

**The screen** is `/admin/content`, where three buttons had been wired to nothing. A noticeboard
panel that says whether each notice is waiting, showing or finished; the news list with its real
status; and one form each. The news form is a textarea, and says so: *leave a blank line between
paragraphs, that is all the formatting there is.* The notice form counts down from 500 and tells
you a long one wants to be a news post.

**Draft and taken down are not the same thing**, and the list says which. A piece that was never
published is a draft; one that went up and came off is taken down, and keeps the date it first
went up. Writing the tests caught a new post being marked *taken down* the moment it was saved.

**No rich text, and none needed.** The plan budgeted news as the spike. `NewsPost.body` is plain
paragraphs split on blank lines by `paragraphs()`, so a textarea is the honest editor. Third time
this project has got smaller by reading what is already there.

**Notices and pieces are taken away differently, on purpose.** An announcement is a note on a
noticeboard: once it stops being true there is no version of it worth keeping, so removing it
removes it. A news post is a piece of writing, so it is hidden instead — the writing stays, and
so does the date it first went up.

**Two bugs found while writing it, both mine:**

*Drafts were never filtered.* `listPosts` returned every post regardless, because nothing could
be a draft until now. Anything unfinished would have been on the website.

*Taking a post down lost the date it belonged to.* Clearing `publishedAt` meant a round-up of
April that came down for a week came back dated today, sitting at the top of the list as though
it were new. `hidden` carries the taking-down; the date stays.

---

## Step 6 — Ready to merge · ~2 days

The gate, not a formality. Nothing above matters if this is skipped.

**Two of the project's own standards were not being met, and nothing said so** *(fixed
2026-09-15)*. PLAN §7 asked for `vitest-axe` on every page-level component; it had never been
installed, so a dozen screens went up on a project whose story says grandparents are first-class
users with nothing checking them. And `vite.config.ts` set a coverage floor of 70% that CI never
ran — it called `npm run test`, not `test:coverage`, so the threshold had been decoration since
it was written and the suite would have passed at 40%.

Both are real now: seventeen pages audited one test each, so a failure names the page, and the
floor is raised to where the suite actually sits. A floor well under where you are never catches
anything, and the point of one is to notice the day a screen arrives with nothing behind it.

**The audit is the automated half, and the helper says so.** axe finds missing labels, unlabelled
controls, bad heading order and broken landmarks. It cannot tell whether a label makes sense,
whether focus lands anywhere useful, or whether alt text describes the picture. Contrast is off
because jsdom does not paint — that one belongs in a browser.

- [x] Coverage above the floor, the floor raised, **and CI actually checking it**
- [x] `vitest-axe` passing on every page — public, portal and committee
- [x] **Run `supabase/gallery-seed.sql`** — the 63 photographs on the live gallery were two arrays
      in `fixtures.ts`, and this branch reads the gallery from the database. Merging without it
      would have emptied the public gallery while every file sat untouched in R2, referenced by
      nothing. Run 2026-09-17: 28 and 35, checked back out of the database with the anon key, as
      a stranger rather than as an admin
- [x] RLS verified once more, from a browser, as a member — 2026-09-17, the same run as 0.1
- [ ] The audit table has rows in it from real use, not tests
- [x] `main` merged in — nothing to merge; main has not moved since the branch was cut (checked 2026-09-16)
- [x] **Preview belongs to the committee** — `?preview` no longer opens the back office to anybody who knows the trick; an admin opens the walkthrough from inside the portal, and it runs on fixtures — chosen 2026-09-16
- [ ] Decide the release gate: does `showMemberSignIn` go `true` on merge, or does this land dark?
- [ ] Ask before pushing, before the PR, and before the merge

**Done when:** the committee says they are happy. Not before.

---

## Open decisions, and what each one blocks

| Still open | Blocks |
|---|---|
| Should committee titles live on households, so the About page's list is derived rather than typed twice? *Left for now, 2026-09-16* | Nothing — it works as two lists |
| Does `setCover` get a way back onto a screen? Kept 2026-09-15, and unreachable meanwhile | Step 4 |
| Event summaries: written, or drafted for editing? | Step 5 |
| How an event reaches this site from the planner app | Step 3 |
| Backups: does the R2 bucket need a second copy? *(to discuss)* | Step 6 |

### Answered 2026-09-15

| | |
|---|---|
| **Video** | Not needed now. A placeholder where it will go, and no hosting decision taken |
| **Profile photographs** | Placeholders, not real ones — which also means no faces stored, and so no takedown obligation created |
| **Sponsors** | None. Dropped from step 4 |
| **Uploads** | JPG, JPEG and PNG only |
| **Retention** | Moot, in the end: the committee types the count in, so no attendance row naming a household is ever held. Nothing to retain and nothing to delete |
| **Erasure** | The registrations go too — decided 2026-09-15, and what `on delete cascade` already does |
| **Committee CSV** | Built 2026-09-15 — household, contact, email, phone, adults, children, membership, paid to, role, in directory. **Columns still to review** |

**Two consequences worth reading before those are final.**

*No HEIC is a step back from the script.* `prepare-photos.mjs` accepts HEIC today because `sips`
decodes it, and an iPhone shoots HEIC by default. So a committee member dragging photographs
straight off a phone will be refused where the script would have coped. It is usually survivable —
iOS converts to JPEG when a photo is shared or emailed rather than copied off the device — but the
upload screen has to say which formats it takes, out loud, rather than silently ignoring the
files it cannot read.

*The retention question dissolved.* It was asked because attendance rows named households. They
never will: the committee types the count in after the night, so `event_attendance` holds a
number per event and nothing about who. There is no retention rule because there is nothing
personal to retain — which is a better answer than a `pg_cron` line nobody remembers to check.

**Settled already:** event management lives in the separate planner app · registration stays on Google Forms and stays separate · no separate CMS,
content goes in Supabase behind narrow admin forms · two roles, no role builder · membership is by
invitation, so nothing to approve and no passwords to reset.

---

## Log

| Date | Step | |
|---|---|---|
| 2026-09-17 | 4 | **The bucket is real, and a photograph has been the whole way through it.** Eight settings, not six — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `VITE_MEMBER_ALLOWLIST` had never been in Vercel at all, so every "against the real database" session so far had been somebody's laptop reading `.env.local`. The uploaded file was fetched back and read segment by segment from outside the app: JFIF, a colour profile, the picture, nothing else. Deleted, and gone from the bucket. Found that Cloudflare's edge serves a taken-down photograph until its cache expires. 769 → 773 tests. |
| 2026-09-17 | 4 | A takedown that failed said nothing: the button disabled itself, the request went, and a refusal left the dialog sitting there with no reason given — a silent failure reading exactly like success, on the one action the privacy page makes a promise about. |
| 2026-09-17 | 4 | Several photographs at once, by picker or dropped on. The key was built from the album's own length, which has not grown when the second one is signed, so a whole evening would have gone up under one key and the bucket would have kept the last of it. |
| 2026-09-17 | 4 | **The upload refused every photograph taken on a phone.** APP2 is where the browser writes the colour profile, a phone picture is usually Display P3, and the check refused everything from APP1 to APP15 — so it was rejecting its own encoder's output. Nothing here could have caught it: the tests assemble JPEGs a byte at a time and jsdom has no canvas, so the first real camera file in a real browser was the first run of the real path. And the refusal could not be read when it came: `--error` was used in fifteen stylesheets and defined in none. |
| 2026-09-17 | 0.2 | `/api/photos` died on every request with ERR_MODULE_NOT_FOUND. Vercel transpiles `api/` rather than bundling it, so an import with no `.js` on the end reached Node's ESM resolver unchanged. `tsconfig.api.json` said in a comment that bundling made extensionless imports safe; the compiler is made to agree with Node instead. |
| 2026-09-15 | — | The committee's eight-section list checked against the repo and amended. Branch opened. |
| 2026-09-15 | 0.1 | `portal.sql` and `verify.sql` rewritten. Three known faults fixed, three more found. Not run: no Supabase project yet. |
| 2026-09-15 | 0.2 | Contract narrowed and given a viewer; the mock now refuses what the policies refuse. Found the directory handing whole households to the browser. First write shipped. 228 → 255 tests. |
| 2026-09-15 | 0.4 | `can()` written, every rule naming the policy it mirrors. Route guard, navigation and the first button all ask it. 255 → 337 tests, coverage 90%. |
| 2026-09-15 | 0.3 | Audit trail: trigger in SQL, wrapper around the client, contract guard. Caught the wrapper diffing a row against itself. 337 → 346 tests. Foundations done bar the running. |
| 2026-09-15 | 2 | Household validation and the shared add/edit form, with the nested people list. Caught the checkbox notes being read as part of each box's name. 346 → 378 tests. |
| 2026-09-15 | 2 | `addHousehold` / `updateHousehold`, audited, with the committee's columns refused from a member at the API. Wired into both pages. 378 → 397 tests. |
| 2026-09-15 | 3 | Event management dropped: the committee already runs a separate planner app. Step 3 cut from ~4.5 days to ~1. |
| 2026-09-15 | 2 | Subject-access export: readable on the page, savable as a file. Matched messages by address because they carry no household, and said out loud what it cannot answer about photographs. 397 → 414 tests. |
| 2026-09-15 | — | Six decisions answered: no video for now, placeholder avatars, no sponsors, JPG/PNG/JPEG only, one-year retention, committee CSV to review. |
| 2026-09-15 | 2 | Committee CSV: counts not names, and guarded against a household name that opens as a formula. 414 → 425 tests. |
| 2026-09-15 | 2 | Erasure, taking the registrations with it. Copy offered first, name typed to confirm, never your own and never the last admin. 425 → 437 tests. |
| 2026-09-15 | 2 | Sign-in attempts answered from the screen; "add them" carries the address across. **Step 2 done.** 437 → 443 tests. |
| 2026-09-15 | — | Order settled: interface first, database at the end — but the SQL gets run against a throwaway project early, rather than accumulating screens on top of SQL nobody has executed. |
| 2026-09-15 | 4 | Photograph preparation: re-encode rather than strip, orientation applied first, output checked byte by byte before anything is sent. 443 → 472 tests. |
| 2026-09-15 | 4 | Albums, covers, captions, order and takedown — all audited. Found the random cover was deliberate, so pinning overrides it rather than replacing it. 472 → 489 tests. |
| 2026-09-15 | 4 | `/admin/media` built — the route was in PLAN's map and never existed. 489 → 503 tests. |
| 2026-09-15 | 5 | Announcements and news posts, with drafts and unpublishing. No rich text needed. Caught the audit wrapper recording nothing on two writes. 503 → 520 tests. |
| 2026-09-15 | 4 | Photographs page reworked after review: open large, drag to reorder, trash on the picture. Kept arrow keys, since dragging has no keyboard path. 522 → 525 tests. |
| 2026-09-15 | 5 | `/admin/content` wired — three buttons had done nothing. Caught a new post reading as "taken down". 525 → 533 tests. |
| 2026-09-15 | — | Retention settled: the count is kept for good, the names for twelve months. `close_year()` counts before it deletes. 533 → 537 tests. |
| 2026-09-15 | 3 | The committee types the headcount in. 537 → 551 tests. |
| 2026-09-16 | 0.4 | Events have a table. The designer was built weeks ago and had nowhere to save to, so a published evening lasted until the next reload. Settled the open question with it: the planner is not read from here at all — front of house is what this site owns. A cancelled evening keeps its page on purpose, in the policy as well as the adapter. 757 → 768 tests. |
| 2026-09-16 | 0.6 | The gallery is real, rows and pictures. `albums` and `media` with the album deciding who sees what and the photograph following; `api/photos.ts` signing an upload and removing an object, with the database deciding who may. A takedown removes the object *first* — a row deleted while the file is still at its URL is the privacy promise broken while appearing kept, and the adapter refuses to do that even with no bucket configured. 731 → 757 tests. |
| 2026-09-16 | 0.3 | The portal follows the five themes. It sat on ink whatever the theme and carried its own cream text — the cause of the unreadable-on-two-themes bug, and of the `--page-*` machinery that fixed it. Both gone: page background, page text, raised cards, and the same switcher as the public header in the sidebar. Chosen over new portal-only looks. |
| 2026-09-16 | 0.3 | The FAQ leaves the files. Edited beside the committee and the roll, read from what was saved, and its gaps link to the box that fills them. Found the gap counter had never seen "[N] weeks" at all — it only caught a string that *started* with a bracket, so About us read "Done" while the page shipped a hole in a sentence. The count is honest now, and went up. 721 → 730 tests. |
| 2026-09-16 | 0.2 | `verify.sql` learned it runs against a working database. Three checks were asserting things about the committee's history rather than the rules: two counted the whole audit trail, one assumed the only admins were its own. All scoped to what the run itself did — the last-admin check now stands the real committee down inside the rolled-back transaction, so the test household genuinely is the last one. Found the trigger's delete path relied on `or` short-circuiting, which SQL does not promise. Passed. |
| 2026-09-16 | 0.3 | The audit trail got a reader. Two writers and no readers until now: the triggers wrote to `audit_log` and `withAuditTrail` kept a list in one browser tab, and no screen showed either. `/admin/audit` reads the database's, which is the one that cannot be skipped. Found `now()` stamping every row of a request identically, so the trail could not be put in order. 710 → 721 tests. |
| 2026-09-16 | 0.2 | The last admin cannot be demoted or deleted — a trigger now, not a courtesy. Its own SQLSTATE so the sentence the database raises is the one the person reads. |
| 2026-09-16 | 0.3 | **The member directory removed** — the committee decided against having one. The page, the route, `listDirectory`, `DirectoryEntry`, the view and the three sharing columns are gone rather than switched off: a column nothing reads is one somebody later assumes means something. 732 → 712 tests, and twenty fewer is the point. |
| 2026-09-16 | 0.2 | Messages can be deleted — asked for first, and audited, because a message is the only record the committee holds of what somebody asked and the subject-access export finds them by address. 724 → 732 tests. |
| 2026-09-16 | 0.4 | News made real: posts, notices and newsletters. The read policies do the work, so a query that forgot to filter still cannot leak a draft, and a notice's dates are applied by Postgres rather than by the browser. Found the announcement audience had no `admins` — the check constraint said otherwise. 715 → 724 tests. |
| 2026-09-16 | 0.3 | `site_settings` is real: the switches, the words, the committee and the roll now survive a reload. Until today an admin could throw a switch on the live site and lose it — three of the five admin screens still work that way. |
| 2026-09-16 | 0.3 | Preview became a committee tool. `?preview` let any visitor into the back office of the live site; it is now offered inside the portal, to admins. The bigger half: a preview had to stop using the real client, because a sample household is not a row the database has — `hh-sen` is not even a uuid, so the walkthrough would have shown an error rather than fixtures. 705 → 708 tests. |
| 2026-09-16 | 0.3 | **First real sign-in, three bugs no mock could show.** A household with no renewal date crashed the portal outright — the mapper turned a null date into `''` to satisfy `paidTo: string`, and Intl threw on it. The Preview banner was unconditional, so a real admin was told their edits were make-believe. And an unmatched address is treated as an admin by the app and a stranger by the database, so every screen loaded empty with nothing saying why. 700 → 705 tests. |
| 2026-09-16 | 0.1 | `verify.sql` passed with the amended schema: the takedown rule holds in the database, a visitor can reach the committee and still cannot read the inbox. |
| 2026-09-16 | 0.2 | **The contact form never worked against the real database.** `Prefer: return=representation` makes the insert an `INSERT ... RETURNING`, RETURNING is a read, and a visitor has no select policy on the inbox by design — so every submission on the live site failed. Narrowed to `return=minimal`; `send` now returns a receipt rather than a stored row it was never going to get. |
| 2026-09-16 | 0.5 | **Revalidation pass.** Seven findings, all fixed. The contact form was writing real messages to a table no screen in the app could read; `kind` was dropped on the way out, so a takedown arrived looking like a parking question. The wiring test written to catch exactly that could not fail. 691 → 700 tests. |
| 2026-09-16 | 0.2 | The portal reads and writes the real database — all thirteen methods, not half. Events, news and the gallery stay on fixtures, which is honest: they have no tables. 686 → 691 tests. |
| 2026-09-16 | 0.1 | **Google sign-in works end to end against the real project.** Three bugs found that only a live round trip could show. |
| 2026-09-15 | 0.1 | **`portal.sql` and `verify.sql` run against a real database, and passed first time.** Into a `portal` schema in the committee's planner project. Out of `.gitignore` at last. |
| 2026-09-15 | 4 | The takedown promise got a route, a turnaround and a record of what was done. 651 → 660 tests. |
| 2026-09-15 | 6 | Accessibility audited on every page and coverage enforced in CI — both had been stated standards nobody checked. Found the home page's loading placeholder announcing nothing. 634 → 651 tests. |
| 2026-09-15 | 5 | The gap count computed rather than typed, and seven pending strings made editable. 620 → 628 tests. |
| 2026-09-15 | 4 | The browser half of uploading a photograph, off until a bucket is configured. 607 → 619 tests. |
| 2026-09-15 | 3 | A cancelled evening stops disappearing and starts saying so. 592 → 600 tests. |
| 2026-09-15 | 3 | Cover animations, and the cover drawn on the public event page at last. 579 → 592 tests. |
| 2026-09-15 | 3 | Events can be added here and archived; editing a live one says so. Found the mock sharing event objects between clients. 563 → 579 tests. |
| 2026-09-15 | 3 | An event design screen, with a live preview. Added a cover photograph and a programme to the model. 552 → 563 tests. |
| 2026-09-15 | 5 | The switches moved out of `site.ts` into the admin. `nav.ts` stopped being a constant. Found `/news` missing from the sitemap. 546 → 552 tests. |
| 2026-09-15 | 3 | `Registration` removed everywhere — no personal booking data enters the app at all, so the retention machinery went with it. 551 → 545 tests, and six fewer is the point. |
