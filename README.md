# 13Parbon Community

> *Baro mase tero parbon* — twelve months, thirteen festivals. A community app for people who always have something to gather around.

**New to the project? Start with [what this app does](docs/FEATURES.md)** — every screen, every rule, and the decisions behind them, in one place.

Read the [project story](docs/STORY.md) for the vision and the [portal plan](docs/PLAN.md) for structure, architecture and delivery phases. [Photographs](docs/PHOTOS.md) covers how pictures from an event reach the gallery, and why they are not kept in this repository. [Member login](docs/MEMBER-LOGIN.md) is the parked story for sign-in and the committee's back office, and [Feedback](docs/FEEDBACK.md) covers what the public can send in, how the committee reviews it, and why signing in to leave feedback is a different door from signing in as a member.

## Stack

| Concern | Choice |
|---|---|
| UI | React 19 + TypeScript |
| Build / dev server | Vite |
| Tests | Vitest + Testing Library (jsdom) |
| Lint | oxlint |
| CI | GitHub Actions (`.github/workflows/ci.yml`) |

## Getting started

```bash
nvm use            # Node 24, see .nvmrc
npm install
npm run dev        # http://localhost:5173
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Typecheck and build for production into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run oxlint |
| `npm run typecheck` | Run `tsc -b` across app, test and node configs |
| `npm test` | Run Vitest once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:coverage` | Run Vitest with coverage (70% floor) |
| `npm run check` | Lint, typecheck and test in one go |

`npm run check` also runs on every push, from `.githooks/pre-push`. `npm install` points git
at that folder, so a fresh clone gets it without anybody remembering to. It is the same four
commands CI runs — it just answers in sixteen seconds rather than four minutes. To push past
it, `git push --no-verify`.

Two more are run by hand rather than by the build, and need macOS:

| Script | What it does |
|---|---|
| `node scripts/prepare-photos.mjs <folder> <slug>` | Resizes an event's photographs, strips their metadata and names them for the gallery. See [Photographs](docs/PHOTOS.md). |
| `node scripts/make-share-card.mjs` | Redraws `public/brand/share-card.jpg`, the picture shown when a link is shared. Needs Chrome. |

## Project layout

```
src/
  main.tsx           # entry point
  App.tsx            # providers + router
  app/               # router, providers, layouts, theme tokens, site and about content
  domain/            # TypeScript types and pure helpers (dates, volunteers)
  lib/api/           # typed API client interface, hooks, mock adapter with fixtures
  lib/clock.tsx      # injectable "now" for countdowns and tests
  components/        # shared UI (Button, Container, Carousel, Icon, SectionHeading)
  features/          # one folder per capability (home, events, news, gallery, about, contact, membership, privacy, placeholder)
  test/              # Vitest setup and render helpers
docs/
  FEATURES.md        # every feature, screen and rule — the tour for somebody new
  STORY.md           # project story and vision
  PLAN.md            # portal structure, architecture and delivery phases
  PHOTOS.md          # how photographs reach the gallery, and where they are kept
  FEEDBACK.md        # feedback from the public: the two sign-in doors, and what is not stored
```

Import from `src` with the `@/` alias, for example `import { Button } from '@/components/Button'`.

Themes: five colour schemes tied to the community's year live in `src/app/theme/tokens.css` (Festival, Poila Boishakh, Saraswati Puja, Holi, Mahalaya). The header's theme picker stamps `data-theme` on the root element and remembers the choice in `localStorage`. Each theme also has a drawn motif behind the hero (`src/app/theme/backdrops.tsx`) and can name a `heroImage` in `src/app/theme/themes.ts`, served from `public/brand/themes/`. To add a theme, add a `[data-theme='...']` block with the full token set, register it in `themes.ts`, and give it a backdrop.

Brand assets live in `public/brand/`: the full logo, the round emblem used in the header and favicon, and the three pieces the home page animates together.

## Deployment

Production: https://13parbon.org.uk, built by Vercel from `main`. The domain is registered through Cloudflare, which also serves its DNS; the records point at Vercel unproxied, so Vercel issues the certificate. `www` redirects to the bare domain, and so does the old `13parbon.vercel.app` address, by the host rule in `vercel.json` — links shared before the move still land in the right place, but there is only ever one live site. The rule matches that exact host, so preview URLs are unaffected. Every pull request gets a preview URL. Client routes are served by the rewrite in `vercel.json`; `netlify.toml` and `public/_redirects` do the same if the site ever moves to Netlify.

### Connecting Supabase

Until Supabase is configured the contact page says so and offers another way through, rather than taking details that go nowhere. To connect it:

1. Create a project at supabase.com (free tier).
2. Open Database → SQL Editor and run [`supabase/schema.sql`](supabase/schema.sql). It creates the contact table and makes it insert-only for the public: anyone may write a row, nobody may read the list back.
3. Copy Project Settings → API → Project URL and the `anon` public key.
4. In Vercel, Project Settings → Environment Variables, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for Production and Preview.
5. Redeploy. The contact form now submits, and rows appear in the Supabase table editor.

The portal tables come next, in [`supabase/portal.sql`](supabase/portal.sql), and feedback
from the public after that in [`supabase/feedback.sql`](supabase/feedback.sql). Each has a
`verify` script beside it that proves its rules hold rather than merely having been typed —
run them; a clean run is silence and a notice. See [Feedback](docs/FEEDBACK.md) for what that
one switches on, and what it deliberately does not store.

Registering for an event happens on a Google Form the committee runs, not here. Paste its address into `registrationFormUrl` in [`src/app/site.ts`](src/app/site.ts) and the button appears wherever registration is open.

The `anon` key is meant to be public; row-level security is what protects the data. Never put the `service_role` key in this repo or in a `VITE_` variable.

Locally, put the same two values in `.env.local`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch rules and workflow.
