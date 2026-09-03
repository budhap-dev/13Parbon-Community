# 13Parbon Community — Project Story

> **Status:** draft. Written before the requirements. Everything below is a starting point to react to, not a decision. Sections marked *assumption* are guesses to be confirmed or replaced.
>
> The portal structure and delivery phases now live in [PLAN.md](PLAN.md). Where the two disagree, the plan wins.

## The name

There is a Bengali saying: *baro mase tero parbon* — twelve months, thirteen festivals. It means there is always something coming up. Always a reason to cook too much, call the neighbours, string up lights, and get the kids on stage.

That is the spirit of this app. A community is not a directory of people. It is the steady rhythm of things that bring them together.

## The problem

Community life today runs on a tangle of WhatsApp groups, forwarded PDFs, a Facebook page someone set up years ago, and one exhausted volunteer who "knows the spreadsheet".

- Announcements get buried under 200 good-morning messages.
- Nobody knows how many people are actually coming to the puja dinner until the caterer asks.
- The same five people organise everything because nobody else can see where help is needed.
- Newcomers to the area cannot find the community at all, or find it and do not know how to join in.
- Photos, memories and history from past years live on individual phones and quietly disappear.

## The vision

**One calm place where a community sees what is coming, says "I'm in", and helps make it happen.**

13Parbon Community should feel like the community noticeboard in the hall, if the noticeboard could also take RSVPs, collect volunteers, and remember last year.

## Who it is for

*Assumption: a local cultural community association, with members spread across a town or region.*

| Person | What they need |
|---|---|
| **Member** | See what's on, RSVP, bring the family, find out where to park. |
| **Organiser / committee** | Post events, see numbers, ask for volunteers, send one announcement that everyone actually sees. |
| **Volunteer** | Pick a task that fits their time. Know who to talk to on the day. |
| **Newcomer** | Find the community, understand what it does, and take a first low-pressure step in. |
| **Elders and kids** | Be included without needing to master an app. Big text, simple actions, and someone else can RSVP for them. |

## What it might do

Ordered by how central each is to the story. Requirements will confirm, reorder or remove these.

1. **Festival & event calendar.** The thirteen parbons and everything else, with venue, time, and what to bring.
2. **RSVP and headcount.** One tap per family. Organisers see real numbers.
3. **Announcements.** Short, pinned, and impossible to miss. Not a chat.
4. **Volunteer sign-up.** Named tasks with slots: "decorations, Saturday morning, 3 of 5 filled".
5. **Member directory.** Opt-in, privacy-first, so people can find each other.
6. **Memories.** Photos and highlights from past events, organised by festival and year.
7. **Membership & dues.** *(later)* Who is a member, renewals, and simple payment tracking.
8. **Notifications.** *(later)* Reminders before events, and a reply when your volunteer slot is confirmed.

## Guiding principles

- **Calm over noisy.** Fewer, better messages. The app never competes with WhatsApp for attention. It replaces the need for it.
- **A family is a unit.** Most actions happen per household, not per person.
- **Works on a phone, at a venue, with bad signal.** Mobile-first, fast, forgiving.
- **Accessible by default.** Large tap targets, readable text, proper labels, keyboard navigation. Grandparents are first-class users.
- **Bilingual-ready.** English first, Bengali script from day one in the data model, so it is never a retrofit.
- **Privacy by default.** Nothing about a member is public unless they choose it.
- **Boringly reliable.** Every feature ships with tests. Main is always deployable.

## What this is not

- Not a social feed. No infinite scroll, no likes.
- Not a chat app.
- Not a general-purpose events platform. It is opinionated about how a community like this actually works.

## First milestones

*Assumption: solo or small-team development, shipping in thin slices.*

| Milestone | Outcome |
|---|---|
| **M0 — Foundation** *(this repo, today)* | React + TypeScript + Vitest scaffold, CI, protected `main`, this story. |
| **M1 — Calendar** | Public list of upcoming events. No login required to look. |
| **M2 — RSVP** | Members can sign in and say "we're coming" for their household. Organisers see counts. |
| **M3 — Announcements & volunteers** | Pinned notices and volunteer slots on each event. |
| **M4 — Memories** | Past events with photos, searchable by year and festival. |

## Open questions for the requirements

1. Is this for one specific community, or a platform many communities can use?
2. Who administers it? A committee with roles, or a single admin?
3. Authentication: email magic link, Google sign-in, phone OTP, or invite-only?
4. Is there a backend already, or does this repo own the whole stack?
5. Which languages need full UI translation, and which just need script support?
6. Payments: in scope, out of scope, or link-out only?
7. Hosting and domain?

---

*Twelve months, thirteen festivals. Let's build the fourteenth: a community that knows itself.*
