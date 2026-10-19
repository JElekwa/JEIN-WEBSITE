# CLAUDE.md — J.E.I.N. website

J.E.I.N. (Joshua Elekwa Interactive Network) is a personal-brand portfolio and digital hub for Joshua Elekwa. It covers business, technology, e-commerce, entrepreneurship, IT and community impact. The site was first built as a single-page claude.ai artifact (build "0.4"). It is a single HTML file with hash-routed "pages", inline CSS and JS, and no framework or bundler.

## THE DESIGN RULE

> **DO NOT change the existing visual design, color scheme, typography, or layout structure unless explicitly asked. All new pages and features must match the existing design system exactly.**

In practice:
- Reuse the CSS custom properties in `:root` and the existing component classes (`.btn`, `.chapter`, `.chap-head`, `.split`, `.focus-grid`, `.pcard`, `.wn-item`, `.pg-nav`, …). Don't invent new colors, fonts, radii or spacing scales.
- A new page is a `<div class="page" data-page="…" hidden>` that contains a `<section>`. Add it to the router's `ORDER`, `LABEL` and `RELATED` maps (v0.4 script), to the header `.nav`, and to the footer `nav`. It gets prev/next `.pg-nav` links automatically.
- Keep the honesty rules from the briefs. Don't invent project details, results, screenshots, episodes, membership figures or contact details. Missing content is shown as an explicit "To add" / "Details pending" state. Use only Joshua's own photos, and only after he approves each one.
- Keep accessibility and motion conventions. Every animation must be disabled under `prefers-reduced-motion`. Layouts must not scroll sideways at 390px. Tap targets are at least 44px. Focus outlines use plum.

## Source of truth and workflow

- **Edit only `artifact/jein-site.html`.** It is the page exactly as published on claude.ai, so it has no `<html>`/`<head>`/`<body>` wrapper.
- Everything in `site/` except `site/assets/*.webp|png` is **generated** by `scripts/build_standalone.py`. Never hand-edit it. The build writes real pages (`/about/`, `/projects/<slug>/`, `/o2o-playbook/<slug>/`, …) and sets `window.JEIN_MULTIPAGE = {base, route}` on each one. In that mode the artifact reads the route from the page and rewrites internal `#links` to real paths (`pathFor` / `JEINRouter`). Shared CSS, JS and embedded images go to cached files in `site/assets/build/`. The artifact itself stays a single file with hash routes.
- The contact rules (cards, topics, validation, email text, HubSpot mapping) live in `contact/shared/contact-core.js`. **The same code is pasted inline in the artifact** (the 3rd `<script>` block). If you change one, change the other identically. Today they are byte-identical.
- The logo is embedded four times as a base64 WebP data URI: header, journey scene 1, About laptop art, and footer. Those lines are each about 26 KB. Avoid reading them whole, and don't re-encode the logo.
- Live artifact: https://claude.ai/artifact/4sWZbqan4mw3go3wQDHRdT. Republish to that same URL so the link and its stored contact submissions are kept.

## Directory structure

```
jein-website/
├── CLAUDE.md                       this file
├── README.md                       owner-facing overview, Namecheap publishing, to-do list
├── artifact/
│   └── jein-site.html              SOURCE OF TRUTH: whole site in one file (~275 KB)
├── site/                           deployable static build (upload to public_html)
│   ├── index.html                  generated, do not edit
│   └── assets/
│       ├── jein-mark.webp          favicon / mark
│       ├── jein-lockup.webp        logo lockup
│       └── jein-lockup-full.png    high-res lockup with "JOSHUA ELEKWA INTERACTIVE NETWORK"
├── scripts/
│   └── build_standalone.py         artifact → site/: real pages per route, sitemap, robots, .htaccess (SITE_URL, CONTACT_ENDPOINT, SHARE_IMAGE_APPROVED)
├── contact/
│   ├── README.md                   delivery design, HubSpot field map, analytics events
│   ├── package.json                npm scripts for tests / deploy
│   ├── shared/contact-core.js      shared browser + server contact logic (UMD, pure functions)
│   ├── server/handler.mjs          Cloudflare Worker endpoint: HubSpot upsert + note, Resend email
│   ├── server/wrangler.toml        Worker config (placeholders still to fill in)
│   └── tests/
│       ├── core.test.js            node:test, contact-core
│       ├── handler.test.mjs        node:test, endpoint with mocked fetch/KV
│       ├── ui_flow.py              Playwright, guided contact flow (78 checks)
│       ├── pages_flow.py           Playwright, routing / links / case studies / search / analytics / mobile (174 checks)
│       └── build_flow.py           Playwright over a local HTTP server: the multi-page site/ build (31 checks)
└── docs/
    ├── contact-relay.md            HubSpot custom properties + hourly relay task
    └── briefs/                     01 portfolio, 02 journey, 03 contact briefs + original logo photo
```

## Commands

Run these from the `jein-website/` folder (`C:\Users\Work\Documents\jein-website`).

Installed on this machine:
- Node 24
- Python 3.12 with Playwright
- Git
- GitHub CLI
- Microsoft Edge, used for the browser tests

On Windows:
- Use `python` where the README says `python3`.
- Run the browser tests with `-X utf8`, because the scripts read the file with the system encoding.
- Set `PW_CHANNEL=msedge`. The Playwright Chromium download stalls on this network, so the tests drive the installed Edge instead.

```bash
# rebuild the deployable site after editing the artifact
python scripts/build_standalone.py

# preview: open site/index.html in a browser (needs internet for Google Fonts)

# unit + endpoint tests (23 tests)
cd contact && node --test tests/core.test.js tests/handler.test.mjs

# browser tests (one-time: pip install playwright). PowerShell: $env:PW_CHANNEL='msedge'
cd contact && python -X utf8 tests/ui_flow.py ../artifact/jein-site.html      # 78 checks
cd contact && python -X utf8 tests/pages_flow.py ../artifact/jein-site.html   # 174 checks
cd contact && python -X utf8 -I tests/build_flow.py ../site                     # 31 checks: multi-page build over HTTP

# deploy the contact Worker (after filling in wrangler.toml and setting secrets)
cd contact/server && npx wrangler deploy
```

The Playwright tests check specific IDs, classes, counts and copy. Examples:
- `#cx-next` and `.wn-item`
- 22 project cards and 7 nav links
- "Step 1 of 2"
- The What's New teaser showing 3 items
- The category labels and the hero button labels

If you change any of these, update the tests in the same change.

Git: this folder is a local repository (branch `main`) with `core.autocrlf=false`, so the artifact keeps its LF line endings. It has no remote yet.

---

## Current site: design system

### Color palette (`:root` tokens)

| Token | Hex | Role |
|---|---|---|
| `--paper` | `#F8F5EF` | Page background (warm paper white), the primary ground |
| `--paper-2` | `#F0EBE1` | Secondary surface: nav hover, What's New teaser, page-nav band |
| `--ink` | `#171717` | Text, dark sections (Playbook, Chapter 06, footer), ghost button borders |
| `--ink-2` | `#4A4540` | Secondary text |
| `--rule` | `#DDD5C7` | Hairlines, borders, dividers |
| `--gold` | `#B88A36` | Principal accent: chapter numbers (outlined), progress, gold button, rail |
| `--plum` | `#683A73` | Principal accent: primary buttons, active states, eyebrows, focus ring, links |
| `--terracotta` | `#D77A50` | Selective accent: "new" dot, prototype status, chapter 02 |
| `--rose` | `#D5A0A4` | Selective accent: volunteer status, eyebrows on ink, chapter 04 |
| `--sage` | `#8C9B70` | Selective accent: active status, ticker dot, success border, chapter 05 |
| `--cream` | `#F4E9D8` | Guided-contact panel background |
| `--plum-soft` | `#EFE6F0` | Chapter 04 tint, active nav pill, related-link pills |
| `--gold-soft` | `#F4EAD6` | Chapter 02 tint, "To add" notes, contact card icons |
| `--sage-soft` | `#E9EDE2` | Chapter 05 tint |
| `--terra-soft` | `#F7E3D9` | Journey scene 02 art backdrop |

Hard-coded supporting shades (reuse them, don't add new ones):
- **Plum hover:** `#552e5f`.
- **Darker accent text** for legible small text on light grounds: gold-ink `#8A6524`, terracotta-ink `#A84A22`, rose-ink `#8E4B52`, sage-ink / success `#4E5C36`, icon gold `#7A5A20`.
- **Errors:** `#A84A22`, or `#A3431B` inside the contact form. Invalid borders are `#B9532A`.
- **On dark (ink) sections:**
  - Body text `#CFC8BD`, muted text `#B9B2A8`, faint text `#9C948A` / `#8E867C`.
  - Borders `#3A3531` / `#2E2A27`.
  - Card fill `#1F1D1B`, terminal `#201D1B` with border `#39342F`.
  - Social icon tile `#2A2724`.
- **Cards and contact panel:**
  - Card white `#fff` / `#FFFCF6`.
  - Cream borders `#E2D5BF`, `#DCCDB4`, `#CBBBA0`.
  - Muted label `#8D8270`, placeholder `#A59A88`.
- **Journey scene backgrounds** (`data-bg`): `#F8F5EF`, `#F7EDE6`, `#F3EDF4`, `#F8EDEC`, `#EEF1E8`, `#F4EAD6`.

The site is **light only by design** (`color-scheme: light`). There is no dark theme.

### Typography

Loaded from Google Fonts: Unbounded 400/600/800, Onest 400/500/600, JetBrains Mono 400/600.

| Token | Stack | Used for |
|---|---|---|
| `--display` | Unbounded, Arial Black, system-ui | h1–h3, chapter numbers, card titles, the conversational form lines, brand name |
| `--body` | Onest, Segoe UI, system-ui | Body, navigation, buttons, form fields, some h3s (`.focus-grid`, `.aud`, privacy) |
| `--mono` | JetBrains Mono, ui-monospace | `.mono` eyebrows/labels (uppercase, +.06em tracking), status tags, metadata, pills, terminal |

The type scale is fluid, built with `clamp()`:

| Token | Min | Max | Used for |
|---|---|---|---|
| `--step--1` | .78rem | .84rem | |
| `--step-0` | 1rem | 1.1rem | body |
| `--step-1` | 1.2rem | 1.45rem | lede |
| `--step-2` | 1.5rem | 2.1rem | |
| `--step-3` | 2rem | 3.4rem | section h2 |
| `--step-4` | 2.4rem | 5.4rem | hero / case-study h1 |

Other type rules:
- Headings: weight 600, or 800 for hero and major headings. Line-height 1.08, tracking -.01em, `text-wrap: balance`. Body line-height is 1.6.
- Chapter numbers are huge outlined Unbounded 800: transparent fill with `-webkit-text-stroke: 1.5px var(--gold)`.

### Layout patterns and components

- **Container:** `.wrap`, max 1180px. Side gutters are at least 16px and respect safe-area insets.
- **Radius:** `--radius: 14px` for cards. Large panels (contact, Seven Figure Employee) use 20px, contact cards 16px, inputs 10px. Pills and buttons are fully round (`99px`).
- **Section rhythm:** `padding-block: clamp(64px, 9vw, 128px)`, with a 1px `--rule` top border between sections.
- **Notice bar** (ink, dismissible, remembered in localStorage).
- **Sticky header:**
  - 68px tall, paper at 92% opacity with blur, bottom rule.
  - Logo with a mono subtitle, pill nav links, plum "Explore Projects" CTA.
  - Collapses to a Menu button at ≤1120px.
- **Chapter rail:** fixed left, numbered mono labels, active bar in gold. Shown only above 1280px.
- **Chapter header** `.chap-head`: outlined number, plum mono eyebrow, display h2 and a mono "a → b → c" flow line.
- **Split** `.split` / `.split.rev`: two columns of prose and SVG art. Stacks at ≤860px.
- **Section tints:** `.tint-gold`, `.tint-plum`, `.tint-sage`, and `.ink` for dark sections.
- **Buttons:**
  - `.btn` is a pill, min-height 46px, and lifts 2px on hover.
  - `.btn-primary` is plum. `.btn-ghost` is outlined ink and inverts on hover. `.btn-gold` is gold.
  - The `.arr` arrow slides on hover.
- **Cards:** white with a rule border and 14px radius. Hover lifts 3–4px with a soft shadow. Examples: `.pcard`, `.wn-item`, `.soc-card`, `.cx-card`, `.focus-grid` cells (1px gap grid).
- **Pills / tags:** `.pill-list`, `.jx-tags`, `.filter` (ink outline; pressed = ink fill), `.status[data-s]` with a colored dot:

  | Status | Dot |
  |---|---|
  | active | sage |
  | completed | plum |
  | prototype | terracotta |
  | concept | hollow |
  | volunteer | rose |
  | pending | gold hatch |

- **Illustrations:** inline SVG only, drawn in the palette, with JetBrains Mono labels. Data art is labelled "ILLUSTRATIVE". No stock photos.
- **"To add" placeholders:** `.todo` (gold-soft, dashed gold border, usable anywhere since v0.5), `.tbc` (small inline dashed "to confirm" label) and `.empty` (dashed rule box).
- **v0.5 additions:**
  - `.sub-head` (section eyebrow + h2 without a chapter number), `.about-grid` / `.about-block`, `.steps` (numbered mono list), `.link-list` (plum-soft link pills), `.tech-tags`, `.crumbs`, `.soc-pill.is-soon`, `.nf` (404).
  - All of them reuse existing tokens.
  - `.nav a[aria-current="page"]` was added so the current page is highlighted. The old rule targeted `"true"`, which the router never sets.
  - The footer logo is the full lockup at 64px tall.
  - **Portrait** `[data-portrait]` (hero, bottom-left of the Venn art; About ch 01 above the workspace art):
    - A rotating conic ring in the brand palette, a dashed gold orbit with plum, terracotta and sage dots, and pointer tilt.
    - Pressing it (click, tap or Enter) crossfades between Joshua's two supplied photos.
    - The photos are embedded once, as data URIs in `PORTRAITS` in the last script block. Their sources are in `site/assets/portrait-*.webp`, with originals in `docs/photos/`.
  - **Org strip** `#orgs` (home, between the hero and the journey):
    - Tiles come from `ORGS` in the last script block, with the name, a relationship label, a link and an initials mark.
    - Set `logo` once a real logo file is supplied.
    - The strip scrolls as a marquee, pausing on hover or focus. With reduced motion it becomes a static wrapped grid.
- **Page-to-page nav** `.pg-nav`: generated at the bottom of every page. It has prev/next cards and plum-soft "related" pills.
- **Motion:**
  - Subtle effects: float, drift, pulse, rise, packet-flow dashes, spin, blink, card entrance, page fade.
  - All are disabled by `prefers-reduced-motion`.
- **Breakpoints in use:** 1280, 1120, 960, 900/899, 860, 760, 720, 620, 560, 540, 480px.

### Pages and sections (hash routes)

| Page (`data-page`) | Hash | Sections |
|---|---|---|
| home | `#home` | **Hero**: ticker `BUSINESS × TECHNOLOGY × EXECUTION`, h1 "Business meets technology. Ideas become impact.", lede, 3 CTAs, mono meta row, Venn SVG (business / technology / execution → impact). **Scroll journey** `#journey`: 6 pinned, scroll-driven scenes on desktop (stacked on mobile or with reduced motion), chapter stops, parallax SVG layers, floating project cards in scene 04. **Org strip** `#orgs`. **Focus areas** `#focus-areas`: the brand-positioning sentence, 6 focus cells (`.focus-grid.focus-6`), 4 "ways to work together" contact links, and a résumé button that stays hidden until `RESUME.href` is set and `approved` is true. **What's New teaser** `#home-whats-new`: 3 feed cards + social pills. |
| about | `#about`, `#strategy`, `#technology`, `#about-more` | Ch 01 *The starting point* (5-paragraph narrative, Professional Background list, Appropedia source note, workspace SVG). After Ch 03: `#about-more` (gold tint), with How I Approach Problems (`#approach`), Current Learning and Development (`#learning`), Entrepreneurship and Independent Projects (`#ventures`), and Community and Volunteering (`#community-volunteering`, mirrored from `#community-list` on the Community page). Ch 02 *Business and strategy* (gold tint, focus grid, flow diagram + dashboard SVG). Ch 03 *Technology and systems* (focus grid, terminal card, network SVG). |
| projects | `#projects` | Ch 04 (plum tint): category filters with counts, status key, result count, project grid (22 cards). Search box, plus Technology / Status / Year selects, all combined with the category filters. Categories, with ids kept stable: Business and Transformation (`business`), E-commerce and Commercial Ventures (`ecommerce`), Product, IT and Systems (`it`), Web, Design and Digital Marketing (`web`), Competitions and Business Case Studies (`entrepreneurship`), Community and Social Impact (`community`). Optional record fields: `image:{src,alt}` (16:9, falls back to the coloured cover) and `tech:[…]` (mono tags; confirmed technologies only). |
| case study | `#p-<slug>` | Separate `#detail-view`. Breadcrumbs (Home › Projects › Category › [Parent] › Project), then a hero with facts (status, category, dates, team, part of), tags and notes. The sticky table of contents is built from the sections rendered. Sections come from the project's template (`SECTION_SETS`), plus planned areas, children, figures awaiting confirmation, tools, images, links, related projects, related articles and episodes, confidentiality, and "Next steps" (Discuss a similar project → contact card preselected; See more in [category]). An unknown slug shows the 404 page. |
| episode | `#ep-<slug>` | Same detail view: breadcrumbs, show notes, guests, listen links, related projects. |
| search | `#search` | Site-wide search across projects, What's New, episodes and awards. The header has a search icon, and "/" opens it from any page. |
| notfound | any unknown hash | Branded 404: outlined "404", h1, links to Home, Projects and Contact. |
| playbook | `#playbook`, `#episodes` | O2O Playbook (ink): positioning line, Online ⇄ Offline comparison, 4 format tiles (the episode count is live), 10 topics, episode archive with topic filters and search (honest empty state), guest profiles, subscription links (shown only once real), and the pitch-a-guest CTA. |
| community | `#community`, `#community-work`, `#seven-figure-employee` | Ch 05 (sage tint): impact list (`#community-list`), people SVG, involvement cards (`COMMUNITY_WORK`: type and outcome, "to confirm" where unverified). **Seven Figure Employee** panel: positioning line, a Join button that says "coming soon" until `SFE.joinUrl` is set, Register interest, 4 pillars, purpose, who it's for, topics, draft guidelines, and events (hidden while empty). |
| whats-new | `#whats-new` | Header, 4 social cards (hub, LinkedIn, Facebook, Appropedia), filterable feed (Article / Case study / Profile). |
| contact | `#contact`, `#connect`, `#connect-<path>` | Ch 06 (ink): Direction / Learning / Building strip, 4 audience cards. **Guided contact** `.cx` (cream panel): 6 connection cards → confirmation → step 1 (conversational introduction, topic, follow-ups) → step 2 (contact details, consent, live preview) → done state. |
| privacy | `#privacy` | Draft privacy notice in a 2-column grid. |
| awards | `#awards` | Awards and Recognition (gold tint): verified `AWARDS` cards (team results credited to the team) plus labelled "to add" slots. It is linked from About, Projects and the footer, and is not in the header nav. |

Footer (ink, all pages): logo on a paper chip, tagline, 4 social icons, and Pages / Chapters / More link columns. Copyright line: "© 2026 Joshua Elekwa · J.E.I.N."

### Script blocks inside the artifact (in order)

1. Core:
   - **CONTENT block**: `CATEGORIES`, `STATUS_LABEL`, `PROJECTS` (all 22), `AWARDS` / `AWARD_SLOTS`, `EXPERIENCE` / `EXPERIENCE_SLOTS`, `COMMUNITY_WORK`, `EPISODES`, `O2O_TOPICS`, `PODCAST_LINKS`, `SFE`, `SOCIALS`, `FEED` and `ORGS`. Each has a field comment above it.
   - Then the layout code:
     - `SECTION_SETS`: case-study templates `standard`, `competition`, `automation`, `collection` and `lab`.
     - Portfolio filters plus search.
     - `renderDetail` / `renderEpisode` and the detail router (`#p-` / `#ep-`).
     - Renderers for awards, experience, community work, the Playbook and Seven Figure Employee.
     - `trackSite()` for anonymous `dataLayer` events.
2. Scroll journey (v0.2): pinning, scene switching, parallax, floating cards.
3. `JEINContact` core (identical to `contact/shared/contact-core.js`).
4. Guided contact (v0.3): UI state, localStorage draft, analytics events to `dataLayer`, delivery via `window.claude` page store or `window.JEIN_CONTACT_ENDPOINT`.
5. Pages (v0.4): social and feed renderers, page router (`window.JEINRouter`), `LABEL` / `META` / `RELATED`, generated `.pg-nav`. The data it renders now lives in the CONTENT block.
6. v0.5: portrait (`PORTRAITS` data URIs) and the org-strip renderer.

Data to edit content (all in the CONTENT block; see README "How to add content"):
- `PROJECTS` (projects; fields documented in the comment above the array). Empty fields are hidden, fields in `pending` show "To confirm", and `unconfirmed` holds facts awaiting approval.
- `AWARDS`, `EXPERIENCE`, `COMMUNITY_WORK`, `EPISODES`, `PODCAST_LINKS`, `SFE`, `ORGS`
- `FEED` (What's New)
- `SOCIALS` (social links): email, GitHub and design-portfolio slots have an empty `href` and render only as "coming soon" on the contact page until a real URL is filled in.
- `META` in the v0.4 script (per-page descriptions)
- `PATHS` in contact-core (contact cards, topics, follow-ups)

Each page sets its own `<title>` and description through `setMeta()`.
