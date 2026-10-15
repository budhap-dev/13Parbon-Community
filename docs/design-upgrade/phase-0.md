# Phase 0: bugs

1. AdminOverviewPage.tsx:153: replace the "X of Y households · N%" bar with the text "41 households came · 8 households are members". No percentage.
2. Events, "More of the year to come": the festival list prints twice when no festival has a date. Print it once.
3. AdminPeoplePage: move "Save the list" and "Add a household" into the ActionBar. Grep src/features/admin for any other actions outside the ActionBar. Make "Put up a notice" (AdminNoticesPage.tsx:127) a solid primary button.
4. PortalLayout.tsx (around line 224): add a '/admin/messages' badge showing the unhandled count.
5. AdminEventsPage.tsx:335: never show a raw event id. Fall back to "An earlier event".
6. Rewrite in plain language: AdminContentPage.tsx:156 ("a pull request and a deploy") and AdminAuditPage.tsx:154 ("Written by the database… the tables").

No screenshots.
