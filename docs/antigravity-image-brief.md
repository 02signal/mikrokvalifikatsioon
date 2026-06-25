# Image brief — mikrokvalifikatsioon.ee (for Antigravity)

**What this is:** a commission brief for the *visual* image assets on mikrokvalifikatsioon.ee.
The SEO/structured-data side needs **no new images** (it points schema at existing assets); this
brief is purely a **brand-quality** decision. If you do nothing, the site is fine — the auto-
generated OG cards and the existing logo are functional and embargo-safe. Commission only what
raises perceived quality without breaking the constraints below.

## The site, in one paragraph
An **independent register** of Estonian microcredentials and microdegrees (`mikrokvalifikatsioon`,
`mikrokraad`). Audience: a **pragmatic Estonian business owner, often 60–70+**, low technical
background. Tone: calm, plain, trustworthy, *independent* (not a school, not a vendor). The site
sells clarity — "find a recognised skill, and someone to fund it." Visuals must feel like a
**public utility / registry**, not a marketing brochure.

## Brand system (match exactly)
- **Dark base:** `#121418`–`#1b1b1b` (near-black, slightly cool).
- **Brand green:** `#54c247` (RGB 84,194,71) — the primary accent + bottom border.
- **Per-page-type accents** (already used on the OG cards — keep imagery compatible, don't fight them):
  register/content = green `#54c247` · programme = teal `#38b2ac` · topic/skill = blue `#4299e1` ·
  field = violet `#805ad5` · career = amber `#dd9e37` · provider = slate `#7886a0` ·
  comparison = rose `#d6628c` · answer/GEO = cyan `#48bbcd`.
- **Type vibe:** clean grotesque/sans, high legibility, generous spacing. White on dark.
- **Logo:** `public/mk-logo-white.png` (white mark) on dark; `public/logo-square.png` (512×512) is
  the square mark used as the schema publisher logo. Do **not** redraw the logo unless asked.

## What to make (ranked by leverage)

### 1. OG-card background texture (highest leverage — every social/AI share)
- **Purpose:** replace the flat dark→accent gradient behind the auto-generated OG cards with a
  subtle, premium **background texture**, so every shared/AI-previewed page looks crafted.
- **Where:** consumed by `src/pages/og/[route].ts` (astro-og-canvas) as the card background.
- **Spec:** **1200 × 630 px**, dark, **very low-contrast** (text + logo are laid on top and must stay
  legible — keep the upper-left 70% calm). A faint geometric/topographic/grid motif evoking a
  *register / map / structure* is on-brand; **no photography, no people, no icons of specific
  tools**. Provide it **accent-neutral** (works under any of the 8 accents) OR as a tiny set tinted
  per accent family. **Format:** PNG (or WEBP) + the source. Must tile/scale to 2× (2400×1260) cleanly.
- **Acceptance:** title (white, 60px bold) + description (light, 30px) + logo remain fully legible;
  the green bottom border still reads.

### 2. Homepage hero visual (second leverage)
- **Where:** the homepage above-the-fold (`src/pages/index.astro`), to the side of the headline.
- **Spec:** **~1600 × 1200 px** (and a 2× and a mobile crop), **WEBP** (+ PNG fallback). Conceptual,
  abstract-but-warm: the idea of *a recognised skill / a step up / clarity from many options* —
  e.g. an abstract "skill badge / certificate" motif, or an Estonian/Nordic calm workspace **without
  identifiable faces**. Must sit on the dark base and not compete with the headline.
- **Acceptance:** reads instantly to a 65-year-old as "trustworthy, official-but-friendly," not
  "tech startup."

### 3. Per-category conceptual marks (optional, scaled)
- **Where:** small decorative marks for the field/topic/career hub cards (`/valdkond/`, `/teema/`,
  `/karjaar/`).
- **Spec:** a **set of ~8 flat, single-accent line-marks** (one per page-type accent above),
  **256 × 256 px**, transparent PNG/SVG. Abstract concepts (data, building, health, design, …),
  **not literal stock icons**. Optional — only if budget allows; the cards work without them.

## Hard constraints (non-negotiable — get these wrong and we can't use it)
- **Independence:** nothing may imply this register belongs to, or promotes, any *specific provider
  or programme* — including **Ettevõtluskeskus OÜ's own** offering. No school logos, no "our course."
  Never reference or imply the **"DACA"** codename anywhere.
- **No identifiable people / no faces.** No stock-photo cheese (handshakes, headsets, lightbulbs,
  ladders-to-success). No flags-of-success clichés.
- **Estonian/EU context**, neutral and calm. No US-corporate aesthetic.
- **Accessibility:** all text-bearing composites must keep WCAG-AA contrast; backgrounds stay
  low-contrast so overlaid text passes.
- **Embargo-safe wording:** if any image carries text, it must use the neutral register language
  ("register", "oskus", "rahastus") — never imply a specific own-programme.

## Deliverables
- Source files + exported **WEBP** (and PNG where transparency/print is needed), at 1× and 2×.
- Naming: `og-bg[-accent].png`, `hero-home.webp`, `mark-<accent>.svg`. Drop into `public/`.
- A one-line note per asset on where it plugs in (OG route / homepage / hub).

## What we'll do on the code side once assets land
Wire `og-bg` into `getImageOptions` (`bgImage`), place `hero-home` on the homepage, and (if made)
the marks on the hub cards — all behind a build + a visual check. No schema change needed; the SEO
rich-result work is already done with the existing logo + generated cards.
