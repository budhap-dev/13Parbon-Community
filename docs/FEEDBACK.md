# Feedback from the public

> **Status:** built, switched off. The page, the queue and the database rules are in place;
> `showFeedback` is `false` until the committee turns it on from the portal.

Anybody may tell the community how it is doing. They can sign in with Google so their name
goes with it, or send it anonymously. Nothing appears anywhere on the website until a member
of the committee has read it and approved it.

## The three surfaces

| Where | Who | What they see |
|---|---|---|
| `/feedback` | Anybody | The form, and everything that has been approved |
| Home page, "What people say" | Whoever the committee allows | The three newest approved pieces |
| `/admin/feedback` | The committee | The whole queue: waiting, approved and turned down |

Both public surfaces are behind switches the committee owns, and both start off:

* **Site switches → Feedback from the public** (`showFeedback`) puts the page in the
  navigation. Off, the page itself answers as not found — not merely unlinked. A page still
  serving what strangers wrote, to anybody holding the address, is not a section that has been
  switched off.
* **Home page sections → What people say** decides who sees the strip on the home page. It
  starts at *the committee only*, and the strip renders nothing at all while there is nothing
  approved, so turning it on early costs nothing.

## Signing in is a different door from the members' one

This is the part worth reading twice, because the site already had a Google sign-in and this
is deliberately not it.

Membership is by invitation. `GoogleSignInProvider` checks an address against the allowlist,
looks it up against a household, and — for an address it does not recognise — signs that
account straight back out of Google and records a knock in `sign_in_attempts`. That is right
for somebody trying to open the portal.

It would be ruinous here. Somebody who signs in to put their name to a note is not applying
for membership, and signing them out again mid-sentence would make the button appear to do
nothing at all. So the app records **which door was used** before sending anybody to Google
(`src/lib/auth/signInPurpose.ts`, in `localStorage` beside the token it describes), and the
members' gate leaves a feedback sign-in alone on the way back.

What a feedback sign-in gets you:

* your name on the note, if the committee approves it;
* nothing else. No app session, no household, no portal, no row in `sign_in_attempts`.

**Why that is safe.** Everything above runs in a browser and none of it is a security
boundary. What holds the line is `supabase/portal.sql`: every policy asks
`portal.current_household_id() is not null` or `portal.is_admin()`, and a stranger's token
answers no to both. A Google account with no household is worth no more than the anon key
everywhere it matters — which is exactly why opening sign-in to the public costs nothing.

One provider serves both doors (`GoogleSignInProvider`, exposing `PublicSignInContext`).
There is one Supabase client, one stored token and one `onAuthStateChange` for the tab; two
subscribers would be two answers to "who is here" that could disagree, and would race to sign
each other out.

## What is stored, and what is not

`portal.feedback` holds the words, a name, whether a Google account stood behind it, the
status, and who decided. That is all.

**No email address**, and this was a decision rather than an omission. `subjectAccess.ts`
finds everything the site holds about a household by matching the address they wrote from, so
an address here would create a new category of personal data that the export has to find, the
privacy page has to declare and an erasure has to reach — for a capability the committee does
not need. The cost is real and worth stating: **the committee cannot reply to a piece of
feedback.** The contact form is where somebody goes who wants an answer, and the review screen
says so.

**The name is kept in full**, first name and surname, exactly as the Google account gives it.
An earlier design cut it to the first word in `portal.auth_name()` so that no page could ever
leak a surname; that was reversed on **2026-09-21** because two people called Priya are two
people, and a showcase that cannot tell them apart is not attributing anything to anybody.

It is a heavier disclosure than a first name, so three things hold it in place: it is opt-in,
the checkbox on the form shows the exact name that will appear before anybody ticks it, and
nothing is published until the committee has approved that particular piece. The name still
comes from the token and never from the request, so it cannot be somebody else's.

## What the database decides, not the browser

`portal.stamp_feedback`, a `before insert` trigger, overwrites what the client sent:

1. **The name comes from the token.** Whatever arrives in `author_name` is thrown away and
   replaced with what the JWT says — tidied and capped at 120 characters — so nobody can sign
   a note with somebody else's name.
2. **Everything arrives `pending`.** Forced, not defaulted — a default is only what happens
   when a column is left out, and a client can always choose not to leave it out.
3. **Ticking "put my name to it" while signed out files the note anonymously** rather than
   failing. The person asked for something the request could not support; losing their words
   over a checkbox would be the worse answer.

Reading is two policies ORed together: anybody sees `status = 'approved'`, and the committee
sees everything. A member is no closer to the queue than a stranger — feedback comes from the
public and belongs to the committee.

`supabase/verify-feedback.sql` proves all of the above against a real database rather than
describing it.

## Deleting, and the audit trail

Turning a piece down keeps it, marked, so somebody turned down twice does not read to the next
reviewer as somebody nobody has looked at. Deleting is separate, asks first, and is for what
should not be held at all — abuse, a phone number typed in by mistake.

The generic `record_change` trigger would copy every field of a deleted row into `audit_log`,
including the message. That is the opposite of taking something down: the words would end up
in the one table the committee cannot delete from. So feedback has
`portal.record_feedback_removed` instead, which records that a piece went, what state it was
in and who removed it — and never what it said.

## Turning it on

1. Run [`supabase/feedback.sql`](../supabase/feedback.sql) in the Supabase SQL editor, after
   `schema.sql` and `portal.sql`.
2. Run [`supabase/verify-feedback.sql`](../supabase/verify-feedback.sql). A clean run is
   silence followed by `All feedback rules hold.`; it rolls back and leaves nothing behind.

   > **If you ever seed feedback by hand:** `stamp_feedback` has no exception for a privileged
   > caller, so an insert from the SQL editor lands `pending` and anonymous just like one from
   > a stranger's browser. Insert first, then `update` it to approved. Nothing but an update
   > can put a piece of feedback on the website.
3. In the portal: **Content → Site switches → Feedback from the public**, on.
4. Optionally **Home page sections → What people say**, set to *Anybody*, once there is
   something approved worth putting on the front page.

Nothing above needs a deploy, and step 4 can wait as long as the committee likes.

## Where the code is

| | |
|---|---|
| `src/domain/feedback.ts` | Types, validation, and what a name looks like on a page |
| `src/lib/api/types.ts` | The contract: `feedback.listApproved / send / listAll / review / remove` |
| `src/lib/api/mock/index.ts` | The fixtures adapter, written to refuse what the database refuses |
| `src/lib/api/supabase/feedback.ts` | The real adapter |
| `src/lib/auth/publicSignIn.tsx` | The public door's state, filled in by `GoogleSignIn.tsx` |
| `src/lib/auth/signInPurpose.ts` | Which door somebody used |
| `src/features/feedback/` | The public page |
| `src/features/home/sections/FeedbackStrip.tsx` | The home page strip |
| `src/features/admin/AdminFeedbackPage.tsx` | The committee's queue |
| `supabase/feedback.sql` | Table, trigger, grants, policies |
| `supabase/verify-feedback.sql` | Proof that the rules hold |
