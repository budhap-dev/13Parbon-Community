# Member login — the build

> **Branch:** `feat/member-login`. Nothing here goes near main until the committee is happy.
> No pull request, no merge, until then.
>
> **What this is:** the order of work from [MEMBER-LOGIN.md](MEMBER-LOGIN.md), broken into steps
> that can be ticked off. That document says *what* and *why*; this one says *where we are*.
>
> **Last updated:** 2026-09-15 · **Current step:** 0 · **Ticked:** 0 of 69

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
| 0 | Foundations | 8–11 | **in progress** |
| 1 | The smallest write, end to end | 0.5 | not started |
| 2 | Households | ~5 | not started |
| 3 | Events | ~4.5 | not started |
| 4 | Media | ~4 | not started |
| 5 | Content | ~4.5 | not started |
| 6 | Ready to merge | ~2 | not started |
| | **Total** | **~35–39** *(incl. tests, adapters, states)* | |

**Cheapest useful stopping point:** end of step 2. That is PLAN's phase 2 exit criterion — a
committee member adds a household, that household signs in with Google and sees their dashboard —
and it is about a third of the way in.

---

## Step 0 — Foundations · 8–11 days

Twenty per cent of the days and eighty per cent of the ways this goes wrong. Nothing real can be
stored until this is right, and it is free to get right while the data is still fixtures.

### 0.1 Row level security · 5–7 days

- [ ] Rewrite `supabase/portal.sql`: helpers no longer reference `households` before it exists
- [ ] Replace `current_setting(...)::jsonb`, which can throw
- [ ] Remove or make safe the `auth.users` triggers that could block sign-in outright
- [ ] `households` table + policy: a member reads their own household and no other
- [ ] `households` policy: an admin reads and writes all
- [ ] Policy on every other table carrying member data
- [ ] `contact_messages`: admins can read; it stays insert-only for everyone else
- [ ] Verify by holding two sessions — a member and an admin — and trying to read what each should not
- [ ] Commit `portal.sql` (it is deliberately uncommitted today)

**Done when:** a signed-in member, using the browser console and their own token, cannot read
another household. Demonstrated, not assumed.

### 0.2 A contract that can write · 1–2 days

- [ ] Mutation methods on `ApiClient` in `src/lib/api/types.ts` — it is entirely read-only today
- [ ] Mock implementations for each, so tests and the parked site keep working
- [ ] The Supabase adapter alongside, method for method
- [ ] TanStack Query mutation pattern with cache invalidation, established once

**Done when:** one value can be changed from the UI and survives a reload.

### 0.3 The audit table · 1 day

Before the first write, not after. A trail added later starts empty and misses the months where
the mistakes were made.

- [ ] Table: who, what, which record, when, before and after
- [ ] Written to by every mutation, not by each caller remembering to
- [ ] Readable by admins only

**Done when:** changing a value leaves a row behind, without the calling code asking it to.

### 0.4 One place that answers "may they?" · 0.5–1 day

- [ ] `can(user, action, resource)` in `src/lib/auth/permissions.ts` — planned in PLAN §2, never written
- [ ] Table-driven tests for every role × action
- [ ] Routes and buttons ask `can()` rather than checking `role === 'admin'` inline

**Done when:** the permission tests fail if a rule changes.

---

## Step 1 — The smallest write, end to end · 0.5 days

Marking a contact message handled. The point is not the feature; it is proving all four
foundation pieces work together on something with nothing at stake.

- [ ] Mark a message handled from `/admin/messages`
- [ ] It persists, it audits, and a member cannot do it

**Done when:** the committee can clear their inbox, and the audit table says who cleared what.

---

## Step 2 — Households · ~5 days

The data everything else hangs off.

- [ ] Import the committee's existing spreadsheet (one-off script; budget for the data being messier than promised)
- [ ] Add a household — the button on `/admin/people` exists and is wired to `() => {}`
- [ ] The nested `people[]` form: adults and children added and removed inline, with ages and notes
- [ ] Edit a household, committee-side
- [ ] Record and change `googleEmail` — this is what "reset password" actually means here
- [ ] Set membership status (`active` / `lapsed`) and `paidTo`
- [ ] Assign the `admin` role, **and refuse to remove the last admin**
- [ ] Sign-in attempts: add them, or mark resolved — the list is already on the page, read-only
- [ ] A member editing their own household: same form, different permissions
- [ ] A member's own privacy choices: `listedInDirectory`, `shareEmail`, `sharePhone`
- [ ] Export a household as the GDPR subject-access answer
- [ ] Delete a household — erasure, once it is decided what happens to their registrations

**Done when:** a committee member adds a household that is not their own, that household signs in
with Google, sees their dashboard, and edits their own details. *(PLAN phase 2 exit criterion.)*

---

## Step 3 — Events · ~4.5 days

- [ ] Create an event — ~18 fields including nested `theme` and per-event coordinates
- [ ] Edit an event
- [ ] Publish / unpublish (`draft` → `published`)
- [ ] Cancel an event, and **render `cancelled`** — the status is in the type and nothing shows it
- [ ] Wire up Resend, so a cancellation reaches the households who registered
- [ ] Copy last year's event, carrying `festivalId`, venue and copy, then change the date
- [ ] Manage the Google Form link and the `householdsRegistered` count — the bookings stay in the sheet
- [ ] Decide the fate of the `Registration` fixtures on `/admin/events` and the dashboard: fill by hand, or remove
- [ ] Volunteer roles and sign-up — in the domain, in PLAN phase 3, missing from the committee's list

**Done when:** an organiser puts a real event up, changes it, and cancels a test one that emails
its registrants.

---

## Step 4 — Media · ~4 days

The takedown promise stops depending on a macOS script and a person remembering to run it.

- [ ] Presign endpoint (Vercel function) — R2 credentials cannot go in the browser
- [ ] Client-side re-encode to 1600 and 600, which never writes metadata rather than stripping it
- [ ] Apply EXIF orientation before discarding it, or portrait photographs come out sideways
- [ ] Decide HEIC: accept JPEG/PNG only and say so, or carry a wasm decoder
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

| | Blocks |
|---|---|
| Video: host, embed, or leave out? | Step 4 |
| Profile photographs: worth the takedown obligation? | Steps 2, 4 |
| Sponsors: are there any? | Step 3 |
| Retention: how long are attendance records kept? | Steps 3, 6 |
| Backups: does the R2 bucket need a second copy? | Step 6 |
| Event summaries: written, or drafted for editing? | Step 5 |
| Erasure: what happens to a deleted household's registrations? | Step 2 |

**Settled already:** registration stays on Google Forms and stays separate · no separate CMS,
content goes in Supabase behind narrow admin forms · two roles, no role builder · membership is by
invitation, so nothing to approve and no passwords to reset.

---

## Log

| Date | Step | |
|---|---|---|
| 2026-09-15 | — | The committee's eight-section list checked against the repo and amended. Branch opened. |
