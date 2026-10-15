# Phase 5: portal ornaments

Files: src/features/home/Home.module.css (.band), new src/app/theme/ornaments.css, src/app/layouts/PortalLayout.module.css, src/features/admin/AdminOverviewPage.tsx.

1. Move the scalloped alpona edge (jhalar) out of .band::before/::after into ornaments.css as a .jhalar class with vars for size, fill, dot and direction (down/up/left/right). Point .band at it; Home must look the same.
2. Jhalar in the portal:
   - a vertical edge where the sidebar meets the content, in the sidebar's colour;
   - a short strip hanging under the sidebar brand;
   - on phones (≤900px), hide both or run one along the top of the menu sheet; leave the bottom bar alone.
3. Curtains (pandal drapes) on the Overview greeting only: pleats tied back left and right under a jhalar. CSS only (repeating-linear-gradient + mask), no images. An optional open-on-load motion stops under prefers-reduced-motion.
4. Pseudo-elements only (aria-hidden, pointer-events: none), never over text or controls. Theme tokens only; a --ornament-strength token sets them full in Marigold and Peacock, soft in the others, and off in Paper. Tables and forms stay plain. No horizontal scroll at 390.

Screenshots: Overview in Paper, Linen and Peacock; Home in Festival, to check the band has not changed.

Report, then wait for me before committing.
