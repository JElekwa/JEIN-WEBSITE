# J.E.I.N. website

The J.E.I.N. (Joshua Elekwa Interactive Network) site, packaged for Claude Desktop. Unzip it somewhere permanent, such as `Documents/jein-website`, then add that folder to a conversation in the Claude desktop app so Claude can keep editing it.

## What's in the folder

| Path | What it is |
|---|---|
| `artifact/jein-site.html` | **The source of truth.** The whole site in one file, exactly as published on claude.ai. Make all edits here. |
| `site/` | The deployable multi-page site for a normal web host such as Namecheap. Generated from the artifact file; don't edit it by hand (except adding images to `site/assets/`). |
| `site/assets/` | Logo files: the mark, the full lockup, and a high-resolution PNG. |
| `scripts/build_standalone.py` | Rebuilds `site/index.html` from the artifact file. |
| `contact/` | The contact system: shared form logic, the serverless endpoint (HubSpot + email), tests, and its own README. |
| `docs/` | The three briefs, the original logo photo, the HubSpot setup, and the scheduled delivery task. |

## Day-to-day workflow

1. Ask Claude to change `artifact/jein-site.html`.
2. Run `python3 scripts/build_standalone.py` to refresh `site/`.
3. Open `site/index.html` in a browser for a quick look. Links between pages need a web server: `python3 -m http.server --directory site`, then visit http://localhost:8000. Fonts load from Google Fonts, so you need to be online.
4. Optionally republish to claude.ai. The live artifact is https://claude.ai/artifact/4sWZbqan4mw3go3wQDHRdT. Ask Claude to publish `artifact/jein-site.html` to that URL, so the link and its stored contact submissions are kept.

## How to add content

Everything you edit lives in one place: the **CONTENT** block at the top of the first `<script>` in `artifact/jein-site.html`. Search for `CONTENT — everything a person edits`. You never touch layout code.

To add an entry:
1. Find the right array: `PROJECTS`, `FEED` (What's New), `EPISODES` (O2O Playbook), `AWARDS`, `EXPERIENCE`, `COMMUNITY_WORK`, `SOCIALS`, `ORGS` (the home-page strip) or `SFE` (the Seven Figure Employee join link and events).
2. Copy one existing `{ … }` entry, paste it below the last one, and change the values. Keep the comma between entries.
3. Run `python3 scripts/build_standalone.py`, then check the page.

The honesty rules are built in:
- A field you leave out is hidden.
- A field named in `pending:[…]` shows as "To confirm".
- Facts awaiting your approval go in `unconfirmed:[…]` and are labelled "To confirm".
- A link with an empty `href` never renders as a link.

Each array has a comment above it listing its fields. `EPISODES` includes a full example to copy.

## Pages

The site is one file with hash-routed pages. That works on any static host, with no server setup.

| Page | Address |
|---|---|
| Home (hero, scroll journey, What's New teaser) | `#home` |
| About (chapters 01–03) | `#about`, `#strategy`, `#technology` |
| Projects (filterable portfolio) | `#projects` |
| Page not found (any unknown address) | e.g. `#no-such-page` |
| A project's case study | `#p-<slug>` |
| Awards and Recognition | `#awards` |
| O2O Playbook (topics, episode archive, guests) | `#playbook`, `#episodes` |
| An O2O episode (once published) | `#ep-<slug>` |
| Community | `#community` |
| What's New | `#whats-new` |
| Contact (two-step guided form) | `#contact`, `#connect` |
| Contact with a card preselected | `#connect-hire`, `#connect-collaborate`, `#connect-business`, `#connect-media`, `#connect-community`, `#connect-other` |
| Privacy | `#privacy` |

## Publishing on Namecheap

1. In `scripts/build_standalone.py`, set `SITE_URL` to your address (for example `https://jeinelekwa.com/`, with the trailing slash).
2. The share image (`docs/share-preview.png`, approved) is published as `assets/share.png` and used for link previews on every page.
3. Run `python3 scripts/build_standalone.py`. It writes the whole site into `site/`:
   - A real page for every address: `/about/`, `/projects/`, `/projects/<project>/`, `/o2o-playbook/`, `/community/`, `/whats-new/`, `/contact/`, `/privacy/`, `/awards/`, `/search/` and `404.html`.
   - `sitemap.xml` and `robots.txt`.
   - `.htaccess`, which makes Apache show the branded 404 page.
4. Upload **everything inside `site/`**, including the hidden `.htaccess` file, to `public_html` using cPanel File Manager or FTP. Turn on free SSL (AutoSSL).
5. In Google Search Console, add the domain and submit `https://<your-domain>/sitemap.xml`.
6. **Contact form:** on your own host the claude.ai storage isn't available. Until an endpoint is connected, the form shows an honest "sending isn't available" message. There are two ways to connect one:
   - **Cloudflare Worker (ready now):** deploy `contact/server` as described in `contact/README.md`, put the Worker URL in `CONTACT_ENDPOINT`, and rebuild.
   - **PHP on Namecheap hosting:** not written yet.

The claude.ai artifact keeps working as before, as a single file with `#` addresses. Publish `artifact/jein-site.html` to the same artifact URL.

## Analytics (not installed yet)

The site already sends anonymous events to `window.dataLayer`: contact-form steps, project and episode views, outbound links, podcast, community-join, résumé and case-study button clicks. They never include names, emails or messages. The full list is in `contact/README.md`.

Recommendation: **Plausible Analytics** (or the free **Cloudflare Web Analytics** if you only need page views).
- Both are cookieless and don't track people across sites. Under Canadian privacy law (PIPEDA, and Québec's Law 25 for visitors there), the privacy notice is generally enough; no cookie banner is needed.
- Plausible can record the `dataLayer` events as custom events with a few lines of glue code.
- Google Analytics 4 via Tag Manager would read `dataLayer` directly. But it sets cookies, so you'd need a consent banner (Consent Mode) before it loads.
- Whichever you choose, update the "Anonymous site statistics" paragraph of the privacy notice to name the tool.

## Contact delivery today (claude.ai version)

- Visitors signed in to claude.ai submit through the page's private store.
- An hourly scheduled task, **J.E.I.N. contact relay**, runs in Claude's cloud. It emails jein.inc@gmail.com from your connected Gmail and creates or updates the HubSpot contact with a note. See `docs/contact-relay.md`.
- **Gmail is currently disconnected from Claude.** Until you reconnect it, the relay can't send emails. HubSpot updates continue.
- The scheduled task lives in your Claude account, not in this folder, so moving to Desktop doesn't affect it.

## Testing

```
cd contact
node --test tests/*.test.js tests/*.test.mjs          # form logic and endpoint (23 tests)
pip install playwright && playwright install chromium   # one-time setup for the browser tests
python3 tests/ui_flow.py ../artifact/jein-site.html     # contact flow (78 checks)
python3 tests/pages_flow.py ../artifact/jein-site.html  # pages, links, 404, case studies, search, analytics, mobile (174 checks)
python3 tests/build_flow.py ../site                     # the multi-page build, served over HTTP (31 checks)
```

On Windows:
- Use `python -X utf8` instead of `python3`.
- To test with the installed Microsoft Edge instead of a downloaded Chromium, set `PW_CHANNEL=msedge` first. In PowerShell: `$env:PW_CHANNEL='msedge'`.

## Still to do

- **Photos:** only Joshua's own photos are to be used, each approved before it goes up. None have been supplied yet.
- **Articles from the J.E.I.N. hub** (jeinelekwa.base44.app): the hub only shows its content after running JavaScript, so it couldn't be read. Paste the articles in, or work on this from Desktop with a browser connected.
- **Project details** for Hallyu Radiance, Farafeet, Last Mile Wholesale, e-commerce projects, website development and the home lab: overview, role, tools, verified results and links.
- **Analytics:** none installed yet. The form already sends anonymous step events to `window.dataLayer`.
- **Privacy notice:** the text is a draft; review it before launch.
