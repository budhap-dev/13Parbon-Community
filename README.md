# 13Parbon Community

> *Baro mase tero parbon* — twelve months, thirteen festivals. A community app for people who always have something to gather around.

Read the [project story](docs/STORY.md) for the vision and the [portal plan](docs/PLAN.md) for structure, architecture and delivery phases.

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
public/photos/       # placeholder photos for the mock gallery
docs/
  STORY.md           # project story and vision
  PLAN.md            # portal structure, architecture and delivery phases
```

Import from `src` with the `@/` alias, for example `import { Button } from '@/components/Button'`.

Themes: five colour schemes tied to the community's year live in `src/app/theme/tokens.css` (Festival, Poila Boishakh, Saraswati Puja, Holi, Mahalaya). The header's theme picker stamps `data-theme` on the root element and remembers the choice in `localStorage`. Each theme also has a drawn motif behind the hero (`src/app/theme/backdrops.tsx`) and can name a `heroImage` in `src/app/theme/themes.ts`, served from `public/brand/themes/`. To add a theme, add a `[data-theme='...']` block with the full token set, register it in `themes.ts`, and give it a backdrop.

Brand assets live in `public/brand/`: the full logo, the round emblem used in the header and favicon, and the three pieces the home page animates together.

## Deployment

Production: https://13parbon.vercel.app, built by Vercel from `main`. Every pull request gets a preview URL. Client routes are served by the rewrite in `vercel.json`; `netlify.toml` and `public/_redirects` do the same if the site ever moves to Netlify.

### Connecting Supabase

Until Supabase is configured the contact page says so and offers another way through, rather than taking details that go nowhere. To connect it:

1. Create a project at supabase.com (free tier).
2. Open Database → SQL Editor and run [`supabase/schema.sql`](supabase/schema.sql). It creates the contact table and makes it insert-only for the public.
3. Copy Project Settings → API → Project URL and the `anon` public key.
4. In Vercel, Project Settings → Environment Variables, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for Production and Preview.
5. Redeploy. The forms now submit, and rows appear in the Supabase table editor.

The `anon` key is meant to be public; row-level security is what protects the data. Never put the `service_role` key in this repo or in a `VITE_` variable.

Locally, put the same two values in `.env.local`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch rules and workflow.
