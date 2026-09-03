# 13Parbon Community — Portal Plan

> **Status:** proposed. Based on the portal structure supplied on 2026-09-03. Read alongside [STORY.md](STORY.md). Items marked **decision** need your call before that phase starts.

## 1. Shape of the product

Three surfaces, one codebase, one design system.

| Surface | Who | Access |
|---|---|---|
| **Public website** | Visitors | No login |
| **Member portal** | Approved members | Login, `member` role |
| **Admin portal** | Committee / admins | Login, `admin` role (plus finer roles later) |

They share components, data types and the API layer. They differ in routes, navigation and permissions. Treat the public site as the marketing front door, the member portal as the daily-use app, and the admin portal as the back office.

## 2. Roles and access

| Role | Can |
|---|---|
| `visitor` | Read everything public. Submit contact form. Register for public events. Cannot create an account. |
| `member` | Everything in the member portal. Edit own household. Register for events, see the directory and documents. |
| `admin` | Everything a member can, plus add households, set roles, run events, edit content, read messages. |

**Decided 2026-09-03: two roles only.** `editor`, `member:pending` and `member:lapsed` are dropped. Lapsed
membership is a status on the household, not a role. Sign-in is **Google only**, and only for households an admin
has added: there is no application form and nobody creates an account for themselves. A Google address that
matches no household is turned away and listed for the committee.

Permissions live in one place (`src/lib/auth/permissions.ts`) as a `can(user, action, resource)` function so routes, buttons and API calls all ask the same question.

## 3. Route map

```
/                         Home
/about                    About Us (history, leadership, values, FAQ)
/events                   Upcoming events calendar
/events/:slug             Event detail, countdown, registration
/gallery                  Albums
/gallery/:albumSlug       Album with photos and videos
/news                     News & announcements, newsletters
/news/:slug               Article
/contact                  Contact form, socials, map
/join                     Membership application
/login  /logout  /reset-password

/portal                   Member dashboard
/portal/directory         Member directory and groups
/portal/documents         Documents library
/portal/forum             Forum categories
/portal/forum/:threadId   Thread
/portal/volunteer         Open positions, my history
/portal/profile           My profile, registrations, membership status

/admin                    Admin overview
/admin/content            Pages, announcements, news
/admin/events             Events, registrations, attendance
/admin/members            Applications, renewals, roles
/admin/media              Uploads, albums, moderation
/admin/reports            Growth, attendance, traffic, registrations
```

Routing uses React Router with three layout routes (`PublicLayout`, `PortalLayout`, `AdminLayout`) and two guards (`RequireMember`, `RequireRole`).

## 4. Domain model

Everything is keyed by household where it makes sense, per the story's "a family is a unit" principle.

```
Member          id, householdId?, name, email, phone?, avatarUrl?, bio?,
                interests[], skills[], profession?, visibility (private|members|public),
                roles[], membership { status, plan, startsOn, expiresOn }, createdAt
Household       id, name, address?, members[]
Event           id, slug, title, description, startsAt, endsAt, venue,
                coverImageUrl?, isPublic, registrationOpen, capacity?,
                registrationFields[], status (draft|published|cancelled|past)
Registration    id, eventId, memberId | guest{name,email}, householdSize, answers{},
                status (registered|waitlisted|cancelled), attended?, createdAt
Announcement    id, title, body, pinned, audience (public|members), publishAt, expiresAt?
NewsPost        id, slug, title, body, coverImageUrl?, tags[], publishedAt, author
Newsletter      id, title, fileUrl, issuedOn
Album           id, slug, title, eventId?, coverMediaId, publishedAt, visibility
Media           id, albumId, type (photo|video), url, thumbnailUrl, caption?, uploadedBy, approved
Document        id, title, category (minutes|guidelines|resources), fileUrl, uploadedAt, audience
ForumCategory   id, name, description, order
Thread          id, categoryId, title, authorId, createdAt, lastReplyAt, locked, pinned
Post            id, threadId, authorId, body, createdAt, editedAt?, hidden
VolunteerRole   id, eventId?, title, description, slots, startsAt?, endsAt?, contactMemberId
VolunteerSignup id, roleId, memberId, status (signed_up|confirmed|completed|withdrawn)
Page            id, slug, title, blocks[], updatedAt         (About, FAQ, mission)
ContactMessage  id, name, email, subject, body, createdAt, handledBy?
SignInAttempt   id, email, name, attemptedAt, resolved      (a Google account with no household)
```

Types live in `src/domain/*.ts` and are the contract between UI and whatever backend we pick.

## 5. Architecture

### Frontend (this repo)

```
src/
  app/            router, providers (auth, query, theme, i18n), layouts, guards
  domain/         TypeScript types + pure helpers (formatting, eligibility rules)
  lib/
    api/          typed client, one interface per resource, mock + real adapters
    auth/         session, permissions
    i18n/         message catalogues (en, bn)
  features/       one folder per capability, each self-contained
    home/  about/  events/  gallery/  news/  contact/  join/
    dashboard/  directory/  documents/  forum/  volunteer/  profile/
    admin-content/  admin-events/  admin-members/  admin-media/  admin-reports/
  components/     shared UI (Button, Card, Modal, DataTable, Form fields, EmptyState)
  test/           Vitest setup, mocks, fixtures, MSW handlers
```

Rules:

- A feature imports from `components`, `domain`, `lib`. Never from another feature. Cross-feature needs go through `domain` or `lib`.
- Every feature exposes routes via an `index.ts`. `app/router.tsx` composes them.
- Data fetching through TanStack Query wrapping the `lib/api` client. Components never call `fetch`.
- Forms with React Hook Form + Zod. Zod schemas double as validation on the API boundary.

### Backend — **decision**

The frontend is built against the `lib/api` interface and a mock adapter, so phase 1 ships with no backend. The choice is needed at phase 2 (auth).

| Option | Fit |
|---|---|
| **Supabase** (Postgres, auth, storage, row-level security) | Recommended and provisionally agreed (2026-09-03), to be set up when phase 2 starts. Fastest path for auth, files and relational data. Free tier is enough for a community; note it pauses after a week idle. |
| Firebase | Fine, but document model fights the relational shape above. |
| Custom API (Node/.NET) | Most control, most work. Only if you already have one. |

### Hosting — **decided: Vercel** (2026-09-03)

Production builds from `main` at https://13parbon.vercel.app, with a preview URL on every PR. `vercel.json` rewrites every route to `index.html` for client-side routing. Netlify config is kept in the repo as a fallback.

## 6. Cross-cutting concerns

- **Design system.** Own components on CSS Modules with a token file (colour, spacing, type). Festival-inspired accent palette. Light and dark. **Decision:** Tailwind instead, if you prefer utility classes.
- **Accessibility.** Semantic HTML, labelled forms, focus management on route change, WCAG AA contrast. Tested with `vitest-axe` per page.
- **i18n.** English now, Bengali script supported in content fields from day one. UI translation via `react-intl` or `i18next` when needed.
- **Analytics.** Plausible (privacy-friendly, no cookie banner) for "website traffic" in reports. **Decision:** or Google Analytics.
- **Media.** Uploads go straight to object storage from the browser with signed URLs. Thumbnails generated server-side. Admin approval flag before public display.
- **Notifications.** Email via the backend's provider (Supabase + Resend). Push and SMS later.
- **Security.** Row-level rules enforce audience (`public` / `members`) on the backend. Frontend guards are UX, not security.

## 7. Testing strategy

| Layer | Tool | What it covers |
|---|---|---|
| Unit | Vitest + Testing Library | Every component and domain helper. Co-located `*.test.tsx`. |
| Integration | Vitest + MSW | Each route renders with mocked API. Loading, empty, error, success states. |
| Permissions | Vitest | `can()` table-driven tests for every role × action. |
| Accessibility | vitest-axe | Every page-level component. |
| E2E | Playwright *(from phase 2)* | Login, join, register for event, admin approve. |
| CI | GitHub Actions | Lint, typecheck, test, build on every PR. Coverage floor 70%, rising. |

## 8. Delivery phases

Each phase is shippable on its own and lands as a series of small PRs.

| Phase | Scope | Exit criteria |
|---|---|---|
| **0 — Foundation** ✅ | Scaffold, CI, protected main, story | Done 2026-09-03 |
| **1 — Public site** ✅ | Router, layouts, design tokens, Home, About, Events list & detail, News, Gallery, Contact. Mock data. Deployed. | Done 2026-09-03. Live on Vercel; Lighthouse 100/100/100/100 desktop. |
| **2 — Identity & membership** | Supabase project. Contact writes live (adapter and schema already in the repo). Google sign-in. Admin adds households and sets roles. Member dashboard, household, directory, documents. | A committee member adds a household; that household signs in with Google and sees their dashboard. |
| **3 — Events end to end** | Admin creates events. Registration (member + guest). Countdown. Attendance tracking. Volunteer roles and sign-up. | Organiser runs a real event through the app. |
| **4 — Content & media** | Admin CMS for pages, announcements, news, newsletters. Media upload, albums, moderation. | Committee publishes without a developer. |
| **5 — Community** | Member directory with privacy controls, groups. Documents library. Forum with moderation. | Members find each other and talk without WhatsApp. |
| **6 — Insight** | Reports: member growth, attendance, registrations, traffic. Exports. | Committee gets a one-page monthly picture. |

Rough order of effort: 1 < 2 ≈ 4 < 3 < 5 < 6. Phase 1 starts as soon as this plan is approved.

## 9. Phase 1 breakdown (first PRs)

1. `feat: router, layouts and design tokens` — React Router, three layouts, tokens, Button/Card/Container.
2. `feat: api client interface and mock adapter` — types in `domain/`, `lib/api` with fixtures.
3. `feat: home page` — hero, mission, upcoming events strip, recent photos, join CTA.
4. `feat: events list and detail` — calendar list, detail page, countdown component.
5. `feat: news and announcements` — list, article, pinned announcements.
6. `feat: gallery` — albums grid, album page, lightbox.
7. `feat: about and contact` — page content from mock CMS, contact form (posts to mock).
8. `chore: deploy previews` — Netlify/Vercel config, PR preview links.

## 10. Decisions needed before phase 2

1. Backend: Supabase, provisionally agreed. Confirm when phase 2 starts.
2. ~~Hosting~~ Vercel, done.
3. ~~Auth~~ Google sign-in, invitation only. Decided 2026-09-03.
4. One community or multi-tenant platform?
5. Membership: free, paid, or tiers? If paid, payments in-app (Stripe) or offline?
6. Styling: CSS Modules (default) or Tailwind?
7. Forum: full forum, or start with announcement comments and grow?
8. Analytics: Plausible or Google Analytics?
