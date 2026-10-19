# J.E.I.N. guided contact

The guided "There's more than one way to connect" experience: six connection cards, a five-step conversational form, a review step, and delivery to HubSpot and email.

## What's here

| Path | What it is |
|---|---|
| `shared/contact-core.js` | Cards, topics, follow-ups, validation, introduction summary, email text and HubSpot field mapping. Used by both the browser and the server, so both validate the same way. |
| `../artifact/jein-site.html` | The interface lives inside the website file (search for "guided contact"). |
| `server/handler.mjs` | Serverless endpoint for when the site is hosted on your own domain. It upserts the HubSpot contact, adds a note, and emails you through Resend. |
| `server/wrangler.toml` | Cloudflare Worker config. Secrets are set with `wrangler secret`, never in files. |
| `tests/` | Core and endpoint tests (`node --test tests/*.test.js tests/*.test.mjs`) and the browser flow (`python3 tests/ui_flow.py ../artifact/jein-site.html`). |

## How delivery works

**While the site lives on claude.ai (active now):**

1. The page saves each introduction to its private store. The visitor sees "Introduction received" only after the store confirms the save.
2. An hourly scheduled task, **J.E.I.N. contact relay**, picks up new introductions:
   - It checks them again on the server side.
   - It emails jein.inc@gmail.com from the connected Gmail.
   - It upserts the HubSpot contact by email and attaches the full introduction as a note.
   - It records the delivery so nothing is sent twice.
3. This only works for visitors signed in to claude.ai who can use the page. Everyone else sees an honest "sending isn't available" message and can copy their introduction.

**When you host the site yourself:**

1. Deploy `server/` as a Cloudflare Worker (any platform that runs `handle(request, env)` works).
2. Add `<script>window.JEIN_CONTACT_ENDPOINT = "https://<worker-url>/api/contact"</script>` before the page scripts. The form then posts there instead of to the page store.

## Configuration still needed for self-hosting

| Setting | Where it comes from |
|---|---|
| `HUBSPOT_TOKEN` | HubSpot, under Settings > Integrations > Private apps. Create an app with the `crm.objects.contacts.read` and `crm.objects.contacts.write` scopes (notes are covered by the contacts scopes). |
| `RESEND_API_KEY` | resend.com, after you verify a sending domain. |
| `EMAIL_FROM` | An address on that verified domain. The visitor's email is set as reply-to; they are never used as the sender. |
| `ALLOWED_ORIGINS` | Your public site URL. |
| `KV` namespace id | `npx wrangler kv namespace create JEIN_CONTACT` |
| `TURNSTILE_SECRET` (optional) | Cloudflare Turnstile. Also add the widget's site key to the page. |

## HubSpot fields

All of these are on the Contact record.

| Form answer | HubSpot field |
|---|---|
| Email | Email (unique key used for the upsert) |
| Name | First name / Last name (the last word becomes the last name) |
| Company | Company name |
| Industry | Industry |
| LinkedIn URL | LinkedIn URL |
| Website or project URL | Website URL |
| A free-text "Other" role | Job title |
| Connection card | **J.E.I.N. connection type** (custom) |
| Topic | **J.E.I.N. inquiry topic** (custom) |
| Role | **J.E.I.N. contact role** (custom) |
| Source | **J.E.I.N. lead source** = "J.E.I.N. Website Contact" (custom) |
| Submitted at | **J.E.I.N. last inquiry date** (custom) |
| Reference | **J.E.I.N. last submission ID** (custom) |
| Introduction, follow-ups, message, consent, timestamp | A Note associated with the contact |

Blank answers are never written, so existing HubSpot data is not overwritten with empty values.

## Analytics

The page pushes these events to `window.dataLayer` and also dispatches them as a `jein:analytics` DOM event:

- `jein_contact_card_selected`
- `jein_contact_form_started`
- `jein_contact_step_completed`
- `jein_contact_validation_error` (field names only)
- `jein_contact_form_abandoned`
- `jein_contact_submission_success`

Events never contain a name, email or message. No analytics tool is installed yet. Once Google Tag Manager or similar is on the page, these events flow into it automatically.
