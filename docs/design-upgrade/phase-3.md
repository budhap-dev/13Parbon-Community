# Phase 3: portal

Files: src/app/layouts/PortalLayout*, src/features/portal/Portal.module.css, src/features/admin/*.

1. Overview:
   - a greeting with a one-line summary ("{n} things need you. {next event} is next.");
   - 4 linked tiles (Waiting on you, Unread, To review, Gaps showing), with an amber top edge only when the count is above 0;
   - a filled Next event card (days left, whether it is on the website);
   - the last count as 4 figures;
   - "Needs a decision" rows: a type badge, one line, buttons with hidden screen-reader context;
   - Members and "Came last time" as a quiet line at the bottom.
2. Pills: green = live/paid/on, amber = needs you, grey = past/lapsed/off. Roles use a new outlined .pillTag. Remap the 6 uses of pillWait.
3. Tables:
   - one line per row, with household and contact in one cell beside an avatar;
   - sizes as "2 adults · 2 children";
   - row actions as Edit plus a More menu;
   - filter chips with counts;
   - skeleton rows while loading, and empty states that carry their button.
4. One shared field style (16px text on phones) and one hint style. A disabled Save becomes an "All saved" status beside an outlined button.
5. Split "Pages and settings" into "Site settings" (switches, colours, words, contact, privacy, tools) and "Home and About pages" (order, festivals, story, values, committee, FAQ, theme photos). Drop the duplicate albums table. Rename "Writing" to "News and newsletters". Explainer paragraphs become collapsible InfoNotes, and page intros are one line.
6. Phones (≤900px):
   - controls at least 44px;
   - a 36px preview strip;
   - 2×2 tiles;
   - tables become cards below 640px (a data-label on each cell);
   - a bottom bar (Overview, People, Events, Search);
   - scroll-padding-top of about 140px.

Screenshots: Overview, People and Site settings in Paper and Peacock.
