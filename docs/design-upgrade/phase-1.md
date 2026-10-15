# Phase 1: foundations

Files: src/app/theme/tokens.css, src/index.css, src/components/Button.module.css, plus the CSS modules named below.

1. Add type tokens and replace one-off font sizes with them. Public: 13/15/17/19/22/28 plus display sizes. Portal: 12/13/15/17/20/28. Micro-labels: public 14px/600/0.14em; portal 11.5px/600/0.08em in fg-muted.
2. Add --section-gap: clamp(56px,8vw,96px) and use it as the top padding of every home section.
3. Contrast:
   - no text in --color-fg-faint; use fg-muted;
   - add --color-border-strong (fg at about 55% alpha) for inputs, chips and filters;
   - errors use --error (Contact.module.css:149,154);
   - portal th, .pillPast and the sidebar group labels use fg-muted with no opacity (PortalLayout.module.css:125);
   - Peacock: #db2777 → #be185d.
4. .cream:hover (Button.module.css:66) must stay legible in the light themes. NextEvent .inkLine uses --color-on-accent for its text and border.
5. Define --radius-md and --radius-lg. Portal .empty, .section, .card, .tab and LoadFailed use --portal-radius. Make --gold a real token. Set accent-color: var(--color-accent) on the portal shell.
6. Either load Hind Siliguri 700 and Bricolage 600 in index.html, or change the CSS that asks for those weights to weights that are loaded.
7. Add animation-iteration-count: 1 to the reduced-motion block in index.css.

Check: write a small script that computes ratios from tokens.css for every theme (text at least 4.5, control edges at least 3) and print only the failures. Save it as scripts/contrast-check.mjs so phase 4 can run it again. No screenshots.
