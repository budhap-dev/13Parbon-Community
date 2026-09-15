# Member login — the parked story

> **Status:** parked. The member portal and the committee's back office are built as far as
> reading goes, and switched off in the navigation. This is the story we pick up when they go
> back on.
>
> Read alongside [PLAN.md](PLAN.md) (phase 2 onwards), [SIGN-IN.md](SIGN-IN.md) (how to turn
> sign-in on) and [PHOTOS.md](PHOTOS.md) (why photographs are not in this repository).
>
> Section 0 is ours. Sections 1–8 are the committee's list of 2026-09-15, checked against what
> is in the repository and amended where it disagrees with a decision already taken. Nothing
> has been quietly dropped: where a line is not going to be built as written, it says so and
> says why.

## What "parked" means

Three switches in `src/app/site.ts`, and nothing else:

| Switch | Now | What it hides |
|---|---|---|
| `showMemberSignIn` | `false` | The sign-in link in the header and footer |
| `showNews` | `false` | News and newsletters in the navigation |
| `showNextEventStrip` | `false` | The next-event banner under the wordmark |

Every route still works for anyone who knows the address — `/login`, `/portal`, `/admin` — which
is how this gets tested. The pages read from fixtures in `src/lib/api/mock/`, so there is no real
member data anywhere yet. That is the one good thing about being parked: the security work below
can land before there is anything to lose.

## 0. Three things before any of this

These are not features. They are the floor the eight sections stand on, and each one is cheaper
now than it will ever be again.

**Row level security.** The allowlist in `VITE_MEMBER_ALLOWLIST` runs in the browser. It decides
what the app *shows*, not what the database *gives out*; anyone who can run JavaScript can hold a
session for an address that is not on it. That is fine while the portal reads fixtures. It stops
being fine the moment one household's address goes into Supabase. `supabase/portal.sql` was
drafted for this, is **not correct** — its helpers reference `households` before it exists,
`current_setting(...)::jsonb` can throw, and its `auth.users` triggers could block sign-in
outright — and is deliberately not committed. Fixing it is the first task, not the last.

**A contract that can write.** `ApiClient` in `src/lib/api/types.ts` is entirely read-only today:
every method is a `list` or a `get`. Every capability below is a write, so each needs a method on
that interface and an implementation in the mock before its UI can exist. The admin pages already
have the buttons — "Add a household" on `/admin/people` is a real button wired to `() => {}`.

**One place that answers "may they?"** `PLAN.md` §2 puts it at `src/lib/auth/permissions.ts` as
`can(user, action, resource)`; the file is not written yet. Today the only check is
`RequireSession role="admin"` on the route. Write `can()` before there are twenty buttons each
making up their own answer, and table-test it per role × action.

**The audit table comes before the first write**, not after. An audit trail added later starts
empty and loses the months where the mistakes were made.

---

## 1. Member management

The framing amendment, and it runs through the whole section: **the unit is the household, not
the member.** That is the story's "a family is a unit" principle and it is already the domain
model — `Household` holds `people[]`, and role, membership status and directory visibility all
hang off the household. "Add a member" means "add a household with people in it".

| Asked for | Where it stands | Amendment |
|---|---|---|
| Add new members | Button exists on `/admin/people`, does nothing | **Add a household.** The first write in the whole app. Needs `googleEmail` recorded, or the invitation cannot be accepted |
| Edit member details | Not built. `/portal/household` shows a household, read-only | Keep. Two versions: the committee edits any, a member edits their own. The member's is the thing they will actually use |
| Delete/deactivate members | Not built | **Two different jobs.** Deactivate is `membership.status = 'lapsed'`, reversible, keeps the history. Delete is erasure under GDPR and needs a decision first: what happens to their past registrations, and to photographs they are in |
| Assign roles and permissions | `role` is on the household; nothing sets it | **Two roles only** (`member`, `admin`), decided 2026-09-03. There are no per-permission assignments to make — permissions live in `can()`, in code |
| Approve new registrations | — | **Drop as written.** Nobody registers. Membership is by invitation and there is no application form: an admin adds the household, the household signs in. The real queue is the one underneath |
| *(new)* Deal with sign-in attempts | Built, read-only, on `/admin/people` | A Google account that matched no household is listed for the committee (`SignInAttempt`). What is missing is the two buttons: add them, or mark it resolved |
| Manage membership status | Model is `active` \| `lapsed` with a `paidTo` date | Not "Active/Inactive". Lapsed is a status on the household, never a role — a lapsed member still signs in, they just see a renewal notice |
| Import/export member data | Not built | Keep, and **do import first**: the committee already has the spreadsheet, and typing it back in by hand is a worse first day than a one-off import. Export doubles as the GDPR subject-access answer in §8 |
| Reset member passwords | — | **Drop.** There are no passwords. Sign-in is Google only. The equivalent job — changing or unlinking the `googleEmail` on a household — belongs under "edit a household" |
| Manage member profile photos | Nothing in the model; no avatar field | **Park, and a question.** A face on our server is a face we have promised to remove on request (§6). A directory of names works fine without one. Worth being sure the committee wants this before building the takedown path for it |
| View member activity history | Not built | Depends on the audit table in §8. The cheap useful half is already there in the domain: what this household has registered for (`listRegistrationsForHousehold`) |

---

## 2. Role and access management

The committee's list describes a role builder: create a role, define its permissions, assign
people to it. That is a product in its own right, and this community has two roles and perhaps a
dozen admins.

**Decided 2026-09-03: two roles only.** So the first four lines are parked rather than built, and
the section shrinks to something worth a page.

| Asked for | Where it stands | Amendment |
|---|---|---|
| Create new roles | — | **Park.** Revisit when a third role is actually needed. The likeliest candidate is someone who can publish albums and news but cannot see the directory |
| Edit roles | — | **Park**, with the above |
| Delete roles | — | **Park**, with the above |
| Define permissions per role | — | **In code, not in a screen.** `can(user, action, resource)`, table-tested. A permissions editor is a way to lock yourself out of your own site on a Tuesday evening |
| Assign users to roles | Not built | Keep. It is one field on the household, and it is the same screen as §1 |
| Manage admin users | Not built. `/admin` counts them | Keep: who is an admin, and who can stop being one. **Guard the last one** — the app must refuse to remove the final admin |
| Audit user access rights | Not built | Keep, but it is an audit-table feature (§8). Minimum useful version: who is an admin, who made them one, and when |

---

## 3. Event management

> **Settled 2026-09-15: the committee already runs a separate app for this** —
> [budhap-dev/event-management](https://github.com/budhap-dev/event-management), live at
> `13parbon-event-management.vercel.app` and already linked from the portal as a tool in
> `src/app/site.ts`. Events are *managed* there. This site's job is to **show** what is on.
>
> That is the same shape as the registration decision: the work happens somewhere the committee
> already knows, and this app is the front of house. It takes most of the section below off this
> project's plate — and leaves one question in its place, which is how the event on the home page
> learns what the other app knows. That is now the only real work in this section.


| Asked for | Where it stands | Amendment |
|---|---|---|
| Create upcoming events | Not built. `/admin/events` lists them, read-only | Keep. Probably the second write after households |
| Edit event details | Not built | Keep |
| Cancel events | `status: 'cancelled'` is in the type; nothing renders it | Keep, **and it is not just a status.** Cancelling has to tell the households who had registered, which means email (Supabase + Resend, `PLAN.md` §6). A cancellation nobody is told about is worse than none |
| Publish/unpublish events | `status: draft` \| `published` exists; the mock filters on it | Keep. Straightforward |
| Schedule recurring events | — | **Amend: "copy last year's".** The festivals recur annually, not weekly, and the date moves with the calendar every year. What saves real work is duplicating last year's event with its `festivalId`, venue and copy carried over, then changing the date. A recurrence rule is more machinery than thirteen dates a year can justify |
| Manage event registrations | The event carries a `registrationUrl` to a Google Form the committee owns, replies land in a sheet, and `householdsRegistered` is a number someone types in | **Settled: registration stays on Google Forms, and stays separate.** Nothing in this document takes it in-app. The forms work, the committee knows how to read a sheet, and leaving them there keeps every registrant's details — members and non-members alike — out of our database entirely. What the back office manages is the *link* and the count on the event, not the bookings |

One loose end follows from that. `Registration` is in the domain, and the registration lists on
`/admin/events` and the member dashboard read fixtures of it — modelling bookings the forms now
own. Either those panels are filled from the sheet by hand, or they come out. Worth settling
when this is picked up, rather than leaving a screen that looks authoritative and is not.

**Missing from the list:** volunteer roles and sign-up. `VolunteerRole` and `VolunteerSignup` are
in the domain and in `PLAN.md` phase 3, the story ranks volunteering fourth of eight, and the
event type already carries a `volunteerCall` and a `performerCall`. The stage at these events is
filled by members offering to be on it. That needs a back office too.

---

## 4. Next event showcase

Most of this is built and switched off. `NextEventStrip` and
`src/features/home/sections/NextEvent.tsx` render the banner, the countdown, the venue, the map
and the registration buttons today; `site.showNextEventStrip` is `false` at the committee's
request, and the component and its styles are untouched, so turning it back on restores it
exactly.

| Asked for | Where it stands | Amendment |
|---|---|---|
| Configure homepage event banner | **Built, parked behind a flag** | The ask is really "let the committee flip it without a developer" — move the switch out of `site.ts` and into the admin |
| Upload event cover image | **New.** `Event` has no cover image field | The image goes to R2 like every other picture, not into git (§6, [PHOTOS.md](PHOTOS.md)) |
| Add event description | Built (`summary`) | — |
| Add speaker/guest details | **New.** Nothing in the model | **Amend to "the programme".** We do not book speakers; members put themselves on the stage — that is what `performerCall` asks for. A running order of who is performing is the thing worth showing |
| Add venue information | Built (`venue`, `venueAddress`) | — |
| Add location map | Built (`coordinates` → `VenueMap`) | Per-event, because we do not always meet in the same hall |
| Add registration links | Built (`registrationUrl`, `performerFormUrl`) | — |
| Add countdown timer | Built, in days | — |
| Display event schedule | **New.** No running order in the model | Same field as "the programme" above. One feature, not two |
| Highlight sponsors | **New.** Nothing in the model | A question before a feature: are there sponsors? If it is one or two local businesses, a line and a logo on the event page is the whole job |

---

## 5. Event archive

| Asked for | Where it stands | Amendment |
|---|---|---|
| Move completed events to archive | `status: 'past'` and `listPast()` exist | **No move.** An event becomes past when its date does. Let the end date do it rather than a button somebody has to remember to press |
| View archived events | Built, on `/events` and `/admin/events` | — |
| Restore archived events | — | **Drop.** An event that has happened cannot be made not to have happened. If the intent is "run it again next year", that is "copy last year's" in §3 |
| Generate event summaries | Not built | Keep — a short written round-up after the day, which is also the first piece of real news for §7. "Generate" needs a decision: written by the committee, or drafted for them to edit? |
| Preserve past attendance records | **Nothing records attendance at all yet** | Two steps, and the first is missing: mark who came on the day, then keep it. Keeping it is a retention question, not a storage one — see GDPR in §8 |
| Store event documents | `CommunityDocument` exists (`minutes`, `guidelines`, `resources`); `/portal/documents` shows them, read-only | Keep. Needs an event link and an audience field |
| Store event presentations | As above | Same feature. One documents library, not two |
| Maintain event history timeline | `YearStrip` on the home page is the *festival* year, not a history | **New, and worth it.** "Durga Puja, every year since —" is the thing a newcomer wants and the thing the community would miss if the phones it lives on were lost |

---

## 6. Media and photo gallery

The framing amendment, and it is not negotiable: **photographs are not in this repository.** They
live in the Cloudflare R2 bucket `13parbon-photos`, served from `photos.13parbon.org.uk`, because
git history is permanent and the privacy page promises to take down any photograph a member or
their child is in, on request and without a reason. A file committed once stays recoverable by
anyone who cloned it. Deleting an object from a bucket deletes it. Everything below is therefore
an operation on that bucket. [PHOTOS.md](PHOTOS.md) has the detail.

| Asked for | Where it stands | Amendment |
|---|---|---|
| Upload photographs | `scripts/prepare-photos.mjs` plus a manual upload | An in-app upload must keep every guarantee the script makes: resize to 1600 and 600, **strip the metadata** — location, camera, date — and refuse to finish if any file still carries it |
| Upload videos | **Nothing, anywhere** | **Decision needed.** R2's free tier is 10GB with free traffic; 63 photographs use a fraction of a percent of it and video would not. Embedding from YouTube is the cheap answer, at the cost of sending viewers somewhere with recommendations down the side |
| Create albums | `Album` exists; nothing creates one | Keep |
| Edit album details | Not built | Keep |
| Reorder photographs | **New.** `Media` has no order; today the filename is the order (`-01`, `-02`) | Either add an order field or keep ordering by filename and say so. Renaming files in a bucket to reorder a page is not a thing to ask of anyone |
| Set featured images | **Not built.** The mock picks a cover *at random* per album | Keep. Choosing the picture that represents an album is exactly the judgement a person should make and a computer should not |
| Delete photographs | Not built | **This is the takedown promise, so it must delete the object in R2**, not hide a row. A photograph that is merely unlisted has not been taken down |
| Archive old media | Not built | Needs a meaning. Suggestion: `visibility: 'members'` — still there, no longer public. Note the gallery is already kept out of search engines |
| Add image captions | `Media.caption` exists | Keep — the editing of it is what is missing |
| Tag events to galleries | `Album.eventId` and `festivalId` exist | Keep |

**Missing from the list:** the takedown request itself. The offer sits under the photographs and
on the privacy page; when someone takes it up, that request needs somewhere to land and someone
to answer it. Today it arrives by email, which is fine — but it should be written down as a job
the committee owns, with a promised turnaround.

---

## 7. Content management

| Asked for | Where it stands | Amendment |
|---|---|---|
| Manage homepage content | The home page is not a CMS page — its copy is `src/app/site.ts` and its sections are switched by `site.home` | **Amend the ambition.** The realistic first step is moving the *switches* into the admin (which section shows, and to whom), not the prose. Turning the whole home page into editable blocks is a much larger piece of work for a page that changes twice a year |
| Create news articles | `NewsPost` exists; the section is parked behind `showNews` because the copy is sample text | Keep, **and the order matters**: a page of placeholders reads worse than no page. Real news first, then the tool to write it in. The event round-ups in §5 are the obvious first pieces |
| Edit news articles | Not built | Keep |
| Delete content | — | **Unpublish, not delete**, with the change recorded (§8). "Who took that down?" is a question that gets asked |
| Publish/unpublish content | `publishedAt` exists | Keep |
| Manage announcements | `Announcement` exists with `pinned` and `audience` | Keep — and hold the line from the story: announcements are short, few and pinned. Not a feed, and never competing with WhatsApp for attention |
| Add featured stories | — | **Amend: this is a pinned news post.** Do not invent a second concept for it |
| Manage FAQ section | Lives on the About page today | Keep |
| Manage community resources | The documents library, read-only on `/portal/documents` | Keep. Same feature as "store event documents" in §5 |

---

## 8. Security and audit

| Asked for | Where it stands | Amendment |
|---|---|---|
| View admin activity logs | **No audit table exists** | Build the table before the first write ships (§0). Retrofitted audit trails begin the day you notice you needed one |
| Login history tracking | Supabase records auth events of its own | In-app, the useful version is "last signed in" on the household — which also answers "did the invitation ever get taken up?" |
| Failed login monitoring | Sign-in attempts are listed on `/admin/people` | **Amend.** With Google-only, invitation-only sign-in there is no password to guess and no lockout to monitor. The signal worth watching is the one we already collect: an address trying to get in that we do not know |
| Role change audit trail | Not built | Keep. The highest-value row in the audit table |
| Content change history | Not built | Keep, same table |
| Data backup management | — | **Not ours to build.** It is Supabase's, and its free tier gives daily backups with short retention and no point-in-time recovery — worth checking against what the committee assumes. **R2 has no backup at all**: a deleted object is gone, which is the point for takedowns and a risk for everything else. Decision: does the bucket need a second copy? |
| Restore backups | — | As above. A restore procedure that has never been run is a hope, not a plan — so it wants trying once |
| GDPR/privacy compliance controls | Partly in place through the privacy page's promises | **Not one feature — four named jobs, each already elsewhere in this document.** Subject access is the export in §1. Erasure is the delete in §1. The photograph takedown is §6, and it is already promised in public. Retention is §5: how long we keep who came to what. "Compliance controls" as a single line item cannot be built; those four can |

---

## What the eight sections do not cover

Not criticism of the list — these are the pieces that fall between its headings.

- **A member editing their own household.** The thing members will do most often, and the only
  reason most of them will ever sign in. Read-only today.
- **Privacy choices, per household.** `listedInDirectory`, `shareEmail`, `sharePhone` are in the
  model already. These belong to the member, not to the committee — nothing about a member is
  public unless they choose it, and that includes visible to other members.
- **Volunteering.** In the domain, in the plan, fourth in the story, absent from the list.
- **The contact inbox.** `/admin/messages` shows what the public sent. Marking one handled is a
  write, and it is the smallest one on this page — a good first proof that the write path works.
- **Sending anything.** Nothing in the eight sections sends an email. Invitations, cancellations,
  reminders and renewal notices all need one, and none of them exist.
- **Locking the committee out.** Removing the last admin, or an admin removing their own role.
  The app should refuse.

## Order of work, when it is picked up

Broken into steps that can be ticked off in [MEMBER-LOGIN-BUILD.md](MEMBER-LOGIN-BUILD.md),
which is where progress is kept. This table is the reasoning behind the order.

| | Why first |
|---|---|
| 1. Correct `supabase/portal.sql`, row level security on every table | Nothing real can be stored until this is right, and it is free to do while the data is fake |
| 2. Writes on `ApiClient` + the audit table | Every feature below is a write, and none should be untracked |
| 3. `can()` in `src/lib/auth/permissions.ts`, table-tested | Before twenty buttons each answer "may they?" their own way |
| 4. Households: import, add, edit, role, sign-in attempts | The data everything else hangs off |
| 5. The contact inbox: mark handled | The smallest write there is. Proves the path end to end |
| 6. Events: create, edit, publish, cancel, copy last year's | The committee's most frequent job |
| 7. Media: upload with metadata stripped, albums, covers, real deletion | The takedown promise stops depending on a script and a person |
| 8. Content: announcements, then news once there is news | Last, because placeholders read worse than nothing |

## Decisions the committee owes this document

1. **Video**: host it, embed it from YouTube, or leave it out? (§6)
2. **Profile photographs**: worth the takedown obligation they create? (§1)
3. **Sponsors**: are there any to show? (§4)
4. **Retention**: how long do we keep attendance records? (§5, §8) Registrations are the committee's own sheet, and keep their own clock
5. **Backups**: does the R2 bucket need a second copy? (§8)
6. **Event summaries**: written by the committee, or drafted for them to edit? (§5)
