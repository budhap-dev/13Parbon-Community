# Member login — the build

> **Branch:** `feat/member-login`. Nothing here goes near main until the committee is happy.
> No pull request, no merge, until then.
>
> **What this is:** the order of work from [MEMBER-LOGIN.md](MEMBER-LOGIN.md), broken into steps
> that can be ticked off. That document says *what* and *why*; this one says *where we are*.
>
> **Last updated:** 2026-09-15 · **Current step:** 2 · **Ticked:** 45 of 84

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

## Where it stands

| Step | | Days | Status |
|---|---|---|---|
| — | The story, checked and amended | — | ✅ done 2026-09-15 |
| 0 | Foundations | 8–11 | **done on mocks** — 0.2, 0.3, 0.4 complete; 0.1 and the running of it blocked on the project |
| 1 | The smallest write, end to end | 0.5 | **mostly done** — brought forward into 0.2 |
| 2 | Households | ~5 | **all but the sign-in attempts buttons** |
| 3 | Events | ~1 | **mostly dropped** — the planner app owns it |
| 4 | Media | ~4 | not started |
| 5 | Content | ~4.5 | not started |
| 6 | Ready to merge | ~2 | not started |
| | **Total** | **~32–36** *(incl. tests, adapters, states)* | |

**Cheapest useful stopping point:** end of step 2. That is PLAN's phase 2 exit criterion — a
committee member adds a household, that household signs in with Google and sees their dashboard —
and it is about a third of the way in.

---

## Step 0 — Foundations · 8–11 days

Twenty per cent of the days and eighty per cent of the ways this goes wrong. Nothing real can be
stored until this is right, and it is free to get right while the data is still fixtures.

### 0.1 Row level security · 5–7 days

> **Written, not yet run.** There is no Postgres, Docker or Supabase CLI on this machine, and
> [no Supabase project yet](SIGN-IN.md) — that is the committee's to create. So everything below
> is reviewed SQL, not executed SQL, and the step does not close until it has been run.

- [x] Rewrite `supabase/portal.sql`: tables now come before the functions that query them
- [x] Replace `current_setting(...)::jsonb` with `auth.jwt()`, which folds the empty string to null
- [x] Make the `auth.users` triggers unable to fail, so a note to the committee cannot take the door down
- [x] `households` table + policy: a member reads their own household and no other
- [x] `households` policy: an admin reads and writes all
- [x] Policy on `people`, `registrations`, `documents`, `sign_in_attempts`
- [x] `contact_messages`: admins can read and handle; it stays insert-only for everyone else
- [x] Explicit grants, rather than trusting Supabase's default privileges *(found on the way)*
- [x] Keep `service_role` executing the helpers after revoking them from `public` *(found on the way)*
- [x] Rewrite `verify.sql` so it exercises the policies, not only the helper functions *(found on the way)*
- [ ] **Run `portal.sql`, then `verify.sql`, in the project** — blocked on the project existing
- [ ] Sign in as a member and an admin in the live site and try to read what each should not
- [ ] Take `supabase/portal.sql` and `supabase/verify.sql` out of `.gitignore` and commit them
      — both are ignored today, so this work is not even stageable until then

**Done when:** a signed-in member, using the browser console and their own token, cannot read
another household. Demonstrated, not assumed.

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
- [ ] The Supabase adapter alongside, method for method — blocked on the project
- [ ] Per-resource mutations land with their own steps, not speculatively up front

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
- [ ] Run the trigger against the project — blocked with 0.1

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
- [ ] A database guard for the last admin — `canStopBeingAdmin` is a courtesy until there is one

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
- [ ] It persists past a reload (needs 0.1) and it audits (needs 0.3)

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
- [ ] Sign-in attempts: add them, or mark resolved — the list is already on the page, read-only
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

## Step 3 — Events · ~1 day *(was ~4.5)*

> **Mostly gone, 2026-09-15.** The committee already runs
> [budhap-dev/event-management](https://github.com/budhap-dev/event-management) for this, live at
> `13parbon-event-management.vercel.app` and already linked from the portal. Events are managed
> there; this site shows what is on. Building a second event back office here would be a second
> place to keep the same dates correct.

- [ ] **Decide how an event gets from that app to this one.** The only real work left here
- [ ] Render `cancelled` — the status is in the `Event` type and nothing draws it
- [ ] Decide the fate of the `Registration` fixtures on `/admin/events` and the dashboard: fill from the sheet by hand, or remove
- [ ] Volunteer roles and sign-up — in the domain, in PLAN phase 3, and not covered by the other app either

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

- [ ] Presign endpoint (Vercel function) — R2 credentials cannot go in the browser
- [ ] Client-side re-encode to 1600 and 600, which never writes metadata rather than stripping it
- [ ] Apply EXIF orientation before discarding it, or portrait photographs come out sideways
- [x] HEIC: **decided 2026-09-15** — JPG, JPEG and PNG only, and the screen says so
- [ ] Verify the uploaded object server-side — carry over the script's refusal to publish anything still carrying metadata
- [ ] Compare quality against `sips` at q70/q68 before switching over
- [ ] Create and edit albums
- [ ] Choose an album cover — the mock currently picks one **at random**
- [ ] Edit captions
- [ ] Order photographs explicitly, or keep filename order and say so
- [ ] Delete a photograph: **the object in R2, not just the row**
- [ ] Somewhere for a takedown request to land, with a promised turnaround

**Done when:** a committee member on a laptop, with no terminal, puts an album up — and a
photograph with GPS in it arrives in the bucket with none.

---

## Step 5 — Content · ~4.5 days

Last, because a page of placeholders reads worse than no page.

- [ ] Announcements: create, pin, set audience, expire
- [ ] News posts with a rich-text body *(the spike — rich text always costs more than budgeted)*
- [ ] Unpublish rather than delete, with the change recorded
- [ ] Edit the FAQ entries in `src/app/about.ts`
- [ ] Edit the pending strings in `src/app/site.ts` — mission statement, gallery note
- [ ] Move the `site.home` section switches into the admin
- [ ] Move `showNextEventStrip` into the admin, so the banner is not a code change
- [ ] Write the first real news before turning `showNews` on

**Done when:** the committee publishes something without a developer.

---

## Step 6 — Ready to merge · ~2 days

The gate, not a formality. Nothing above matters if this is skipped.

- [ ] Coverage still above the floor, and the floor raised
- [ ] `vitest-axe` passing on every new page
- [ ] RLS verified once more, from a browser, as a member
- [ ] The audit table has rows in it from real use, not tests
- [ ] `main` merged in, conflicts resolved
- [ ] Decide the release gate: does `showMemberSignIn` go `true` on merge, or does this land dark?
- [ ] Ask before pushing, before the PR, and before the merge

**Done when:** the committee says they are happy. Not before.

---

## Open decisions, and what each one blocks

| Still open | Blocks |
|---|---|
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
| **Retention** | One year for attendance records |
| **Erasure** | The registrations go too — decided 2026-09-15, and what `on delete cascade` already does |
| **Committee CSV** | Built 2026-09-15 — household, contact, email, phone, adults, children, membership, paid to, role, in directory. **Columns still to review** |

**Two consequences worth reading before those are final.**

*No HEIC is a step back from the script.* `prepare-photos.mjs` accepts HEIC today because `sips`
decodes it, and an iPhone shoots HEIC by default. So a committee member dragging photographs
straight off a phone will be refused where the script would have coped. It is usually survivable —
iOS converts to JPEG when a photo is shared or emailed rather than copied off the device — but the
upload screen has to say which formats it takes, out loud, rather than silently ignoring the
files it cannot read.

*A retention policy with nothing enforcing it is a sentence, not a policy.* One year means
something has to actually delete those rows after a year: a scheduled job, or a job on the
committee's list. And it collides with "preserve past attendance records" and the history
timeline in the story — a year from now, last year's numbers are gone. The usual way out is to
keep the counts and drop the names: aggregate per event, indefinitely; household-linked rows,
twelve months. Worth confirming that is what was meant.

**Settled already:** event management lives in the separate planner app · registration stays on Google Forms and stays separate · no separate CMS,
content goes in Supabase behind narrow admin forms · two roles, no role builder · membership is by
invitation, so nothing to approve and no passwords to reset.

---

## Log

| Date | Step | |
|---|---|---|
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
