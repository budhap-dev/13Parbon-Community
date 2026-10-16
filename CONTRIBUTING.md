# Contributing

## Branch rules

- `main` is protected. Nobody pushes to it directly, including admins.
- All changes land through a pull request with a green CI run.
- Branches are deleted automatically after the PR is merged.
- Force pushes and branch deletion on `main` are blocked.

## Workflow

```bash
git checkout main && git pull
git checkout -b feat/short-description
# ... make changes ...
npm version minor --no-git-tag-version   # or patch for a fix; see Versions below
npm run check          # lint + typecheck + tests
git push -u origin feat/short-description
gh pr create --fill
```

Branch prefixes: `feat/`, `fix/`, `chore/`, `docs/`, `test/`.

## Versions

Every pull request moves the version in `package.json` forward, and CI refuses one that does not
(`scripts/check-version.mjs`). Use `npm version <part> --no-git-tag-version`, which updates
`package-lock.json` as well:

- `minor` for a `feat:` branch,
- `patch` for `fix:`, `chore:`, `docs:` and `test:`,
- `major` for a change members will notice as a new site.

The site's menu drawer and the portal footer show it with the commit beside it, for example
`v1.2.0 · 0f58423`, so you can always tell which build is live.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):
`feat: add event calendar`, `fix: correct RSVP count`, `docs: update story`.

## Testing

- Every component gets a test file next to it: `Button.tsx` + `Button.test.tsx`.
- Prefer [Testing Library](https://testing-library.com/) queries by role and text over test IDs.
- Coverage floor is 70% and is enforced by `npm run test:coverage`.
