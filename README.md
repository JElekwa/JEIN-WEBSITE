# J.E.I.N. website

The J.E.I.N. (Joshua Elekwa Interactive Network) site, packaged for Claude Desktop. Unzip it somewhere permanent, such as `Documents/jein-website`, then add that folder to a conversation in the Claude desktop app so Claude can keep editing it.

## What's in the folder

| Path | What it is |
|---|---|
| `artifact/jein-site.html` | **The source of truth.** The whole site in one file, exactly as published on claude.ai. Make all edits here. |
| `site/index.html` | The deployable copy for a normal web host such as Namecheap. Generated from the artifact file; don't edit it by hand. |
| `site/assets/` | Logo files: the mark, the full lockup, and a high-resolution PNG. |
| `scripts/build_standalone.py` | Rebuilds `site/index.html` from the artifact file. |
| `contact/` | The contact system: shared form logic, the serverless endpoint (HubSpot + email), tests, and its own README. |
| `docs/` | The three briefs, the original logo photo, the HubSpot setup, and the scheduled delivery task. |

## Day-to-day workflow

1. Ask Claude to change `artifact/jein-site.html`.
2. Run `python3 scripts/build_standalone.py` to refresh `site/index.html`.
3. Open `site/index.html` in a browser to check it. Fonts load from Google Fonts, so you need to be online.
4. Optionally republish to claude.ai. The live artifact is https://claude.ai/artifact/4sWZbqan4mw3go3wQDHRdT. Ask Claude to publish `artifact/jein-site.html` to that URL, so the link and its stored contact submissions are kept.

## Pages

The site is one file with hash-routed pages. That works on any static host, with no server setup.

| Page | Address |
|---|---|
| Home (hero, scroll journey, What's New teaser) | `#home` |
| About (chapters 01–03) | `#about`, `#strategy`, `#technology` |
| Projects (filterable portfolio) | `#projects` |
| Page not found (any unknown address) | e.g. `#no-such-page` |
| A project's case study | `#p-<slug>` |
| O2O Playbook | `#playbook` |
| Community | `#community` |
| What's New | `#whats-new` |
| Contact (two-step guided form) | `#contact`, `#connect` |
| Contact with a card preselected | `#connect-hire`, `#connect-collaborate`, `#connect-business`, `#connect-media`, `#connect-community`, `#connect-other` |
| Privacy | `#privacy` |

## Publishing on Namecheap

1. Upload `site/index.html` and the `site/assets/` folder to `public_html` using cPanel File Manager or FTP. Turn on free SSL (AutoSSL) for the domain.
2. In `scripts/build_standalone.py`, set `SITE_URL` to your domain and rebuild.
3. **Contact form:** on Namecheap the claude.ai storage isn't available, so the form shows an honest "sending isn't available" message until an endpoint is connected. There are two ways to connect one:
   - **Cloudflare Worker (ready now).** Deploy `contact/server` as described in `contact/README.md`, put the Worker URL in `CONTACT_ENDPOINT` in the build script, and rebuild. The domain can stay at Namecheap.
   - **PHP on Namecheap hosting.** Not written yet. Ask Claude to port `contact/server/handler.mjs` to a PHP file if you'd rather keep everything on Namecheap.

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
python3 tests/pages_flow.py ../artifact/jein-site.html  # pages, links, 404, meta, mobile (101 checks)
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
