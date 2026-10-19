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

## Publishing articles from Google Drive

New articles go live without touching code or Vercel. Write them in Google Docs, move a finished one into the
**Ready to publish** folder, and within about an hour it's on jeinelekwa.com. The hourly GitHub Action
"Publish articles from Google Drive" does the rest: it converts the doc, rebuilds the site and commits, and Vercel
deploys the push.

### Writing an article
- **Title:** the Google Doc's file name.
- **Details (optional):** put them at the very top, one per line, then a line of three dashes:
  ```
  Summary: One or two sentences for cards, search and link previews.
  Topics: E-commerce, Logistics
  Date: 2026-11-03
  Projects: last-mile-wholesale
  ---
  ```
  - Without a summary, the first paragraph is used.
  - Without a date, the doc's creation date is used.
  - `Projects` takes case-study addresses (the part after `/projects/`).
- **Body:**
  - Use **Heading 1 / 2 / 3** for headings, normal text, bold, italic, links, bullet and numbered lists, tables and images.
  - Give every image alt text: right-click the image → **Alt text**.
  - Fonts, colours and sizes are ignored, so every article matches the site.
- **What happens where:**
  - The first image becomes the article's card and link-preview picture.
  - The article appears first in **What's New**, on the home-page teaser, in site search and in the O2O Playbook article count.
  - Each article gets its own page at `https://jeinelekwa.com/articles/<title>/`.

### Publishing, editing and removing
| To… | Do this in Google Drive |
|---|---|
| Publish | Move the finished doc from **Drafts** into **Ready to publish**. |
| Fix or update | Edit the doc where it is. Changes go live on the next hourly run, and the address stays the same even if you rename it. |
| Unpublish | Move the doc out of **Ready to publish**, for example back to Drafts. |
| Publish right now | GitHub → **Actions** → **Publish articles from Google Drive** → **Run workflow**. |

### One-time setup (about 15 minutes)
1. **Google Drive:** create two folders, **Drafts** and **Ready to publish**. Open **Ready to publish** and copy its ID: the part of the address after `/folders/`.
2. **Google Cloud** (console.cloud.google.com, signed in with the same Google account):
   1. Create a project (for example `jein-site`).
   2. Go to **APIs & Services → Library**, find **Google Drive API** and click **Enable**.
   3. Go to **IAM & Admin → Service Accounts → Create service account**, name it `jein-publisher`, and skip the optional role steps.
   4. Open the new service account and go to **Keys → Add key → Create new key → JSON**. A `.json` file downloads. Treat it like a password: don't email it or put it in the repository.
   5. Copy the service account's email (`jein-publisher@…iam.gserviceaccount.com`).
3. **Share the folder:** in Drive, share **Ready to publish** with that email as **Viewer**. The robot can only read this one folder.
4. **GitHub** (github.com/JElekwa/JEIN-WEBSITE → **Settings → Secrets and variables → Actions**):
   - **Secrets** tab → **New repository secret**: name `GDRIVE_SERVICE_ACCOUNT`, value = the whole contents of the JSON file.
   - **Variables** tab → **New repository variable**: name `DRIVE_READY_FOLDER_ID`, value = the folder ID from step 1.
   - Then delete the downloaded JSON file from your computer.
5. **Test:** put a short test doc in **Ready to publish**, then go to **Actions → Publish articles from Google Drive → Run workflow**. When it finishes (about a minute), check jeinelekwa.com/whats-new/. Move the doc out and run it again to unpublish it.

Good to know:
- GitHub pauses scheduled jobs in a repository with no activity for 60 days. Every published article counts as activity. If it does pause, GitHub emails you and one click re-enables it.
- The claude.ai artifact doesn't show articles; they live on jeinelekwa.com.

## Going live on Vercel (jeinelekwa.com)

The repository is ready for Vercel:
- `vercel.json` serves the prebuilt `site/` folder as-is: no build step, clean redirects, long caching for `assets/build/`.
- `api/contact.mjs` is the contact form's server: HubSpot plus an email to jein.inc@gmail.com. It is a thin wrapper around the tested handler in `contact/server/`.

1. **Import the project.** At vercel.com, sign in with GitHub. Choose **Add New → Project**, import `JElekwa/JEIN-WEBSITE` and click **Deploy**. Leave every setting as it is; `vercel.json` covers them.
2. **Add the contact settings** under **Project → Settings → Environment Variables** (Production), then redeploy:
   - `HUBSPOT_TOKEN` (HubSpot → Settings → Integrations → Private apps; scopes `crm.objects.contacts.read` and `crm.objects.contacts.write`)
   - `RESEND_API_KEY` (resend.com → API Keys)
   - `EMAIL_FROM` = `J.E.I.N. Website <contact@jeinelekwa.com>`
   - `OWNER_EMAIL` = `jein.inc@gmail.com`
   - `HUBSPOT_PORTAL_ID` = `247730038`
   - `HUBSPOT_APP_HOST` = `app-na2.hubspot.com`
   - `ALLOWED_ORIGINS` = `https://jeinelekwa.com,https://www.jeinelekwa.com`
3. **Add the domain.** Under **Project → Settings → Domains**, add `jeinelekwa.com` and `www.jeinelekwa.com`. Set `www` to redirect to `jeinelekwa.com`.
4. **Point Namecheap at Vercel.** In Namecheap, go to **Domain List → jeinelekwa.com → Manage → Advanced DNS**:
   - Delete the parking records: the `CNAME www → parkingpage.namecheap.com` and any `URL Redirect` record on `@`.
   - Add an `A` record: host `@`, value `76.76.21.21`.
   - Add a `CNAME` record: host `www`, value `cname.vercel-dns.com`.
   - If Vercel's Domains page shows different values, use Vercel's.
   - Leave any MX or TXT email records alone.
5. **Verify a sending domain in Resend.** Add `jeinelekwa.com` in Resend → Domains, then add the DNS records it lists in Namecheap's Advanced DNS. Until it's verified, emails can't be sent from `@jeinelekwa.com`.
6. **Test it.** Visit https://jeinelekwa.com and send one test introduction. Check that the email arrives and the HubSpot contact and note appear, then delete the test contact in HubSpot.
7. **Submit the sitemap.** In Google Search Console, add `jeinelekwa.com` and submit `https://jeinelekwa.com/sitemap.xml`.

To update the live site afterwards:
1. Edit `artifact/jein-site.html`.
2. Run `python3 scripts/build_standalone.py`.
3. Commit, then `git push`. Vercel redeploys automatically on every push to `main`.

On Vercel there is no KV store, so rate limits and the 7-day duplicate record are off. A double-click is still sent once, because each submission has an id and Resend uses it as an idempotency key. For rate limiting later, add Upstash Redis.

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
