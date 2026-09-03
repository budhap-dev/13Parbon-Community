# 13Parbon Community

> *Baro mase tero parbon* — twelve months, thirteen festivals. A community app for people who always have something to gather around.

Read the [project story](docs/STORY.md) for the vision. Detailed requirements will follow.

## Stack

| Concern | Choice |
|---|---|
| UI | React 19 + TypeScript |
| Build / dev server | Vite |
| Tests | Jest + Testing Library (SWC transform) |
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
| `npm test` | Run Jest once |
| `npm run test:watch` | Run Jest in watch mode |
| `npm run test:coverage` | Run Jest with coverage (70% floor) |
| `npm run check` | Lint, typecheck and test in one go |

## Project layout

```
src/
  main.tsx           # entry point
  App.tsx            # root component
  components/        # UI components, each with a co-located *.test.tsx
  test/              # Jest setup and mocks
docs/
  STORY.md           # project story and vision
```

Import from `src` with the `@/` alias, for example `import { Welcome } from '@/components/Welcome'`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch rules and workflow.
