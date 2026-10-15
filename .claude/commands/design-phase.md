---
description: Run one phase (0–5) of the design upgrade
argument-hint: <phase number 0-5>
---

Read `docs/design-upgrade/phase-$ARGUMENTS.md`. That file is your task for this session. If it does not exist, say so and stop.

Repo: 13Parbon. Branch feat/design-upgrade (create it off main if it is missing). The phase file is the full spec; do not open the design canvas or the other phase files.

Rules:

- commit, but no push or PR until I ask.
- Keep Tiro Bangla, Bricolage Grotesque and Hind Siliguri; use Caveat for short lines only. Keep the emblem, the 8 public themes and the 9 portal themes. Themes vary texture, corners and frame, not just colour.
- Public copy and numbers come from site_settings or existing data and are editable in the portal. Add new settings to src/lib/api/supabase/wiring.test.ts.
- Portal Add and Save buttons go in the top-right ActionBar (src/components/ActionBar.tsx), primary rightmost. Containers use overflow: clip.
- Wherever faces are shown, include the opt-out takedown line.

Working style (save tokens):

- Find code with grep -n; read only the line ranges you need; do not re-read files you have edited.
- Make independent edits in a batch. Do not narrate plans between steps.
- Run vitest on the files you touch while working; run npm run check once at the end of the phase.
- Take screenshots only where the phase asks for them. Use headless Chrome via node_modules/puppeteer-core against `VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npx vite --port 4931 --strictPort` (never port 4173). Check the <title> first. JPEG quality 60, viewports 1280 and 390, viewport only (full page for Home only).
- Use no subagents unless the phase says so.
- End with a report of 10 lines or fewer (what changed, what was skipped and why), then stop.
