# Contact delivery: HubSpot and the hourly relay

## HubSpot (portal 247730038, jein.inc@gmail.com)

These custom contact properties were created on 18 October 2026:

| Label | Internal name | Type |
|---|---|---|
| J.E.I.N. connection type | `jein_connection_type` | Drop-down: `hire`, `collaborate`, `business`, `media`, `community`, `other` |
| J.E.I.N. inquiry topic | `jein_inquiry_topic` | Single-line text |
| J.E.I.N. contact role | `jein_role` | Single-line text |
| J.E.I.N. lead source | `jein_source` | Single-line text (always "J.E.I.N. Website Contact") |
| J.E.I.N. last inquiry date | `jein_last_inquiry_at` | Date and time |
| J.E.I.N. last submission ID | `jein_last_submission_id` | Single-line text |

Standard fields used:

- Email, used as the upsert key
- First name and Last name
- Company name
- Industry
- LinkedIn URL
- Website URL
- Job title, only when the visitor describes their own role under "Other"

The full introduction is attached to the contact as a Note. Blank answers are never written to HubSpot.

There is still a test contact to delete in HubSpot: **TEST Jordan Sample** (test@example.com).

## The scheduled task "J.E.I.N. contact relay"

- It runs every hour at :12 (America/Chicago) in Claude's cloud, with automatic approval.
- It reads new submissions from the claude.ai page store.
- It checks them on the server side, then emails jein.inc@gmail.com and upserts HubSpot.
- It records each delivery in `deliveries/<submissionId>`, so nothing is sent twice.

You can pause it, run it on demand or edit it from your scheduled tasks in Claude. Ask Claude to "list my scheduled tasks" to find it.

Tested end to end on 18 October 2026:

- One email arrived and one HubSpot contact with a note was created.
- A second run sent nothing.
- The test data was removed afterwards.

Requirements:

- **Gmail connected to Claude** (currently disconnected; reconnect it). The connected Gmail account sends the notifications.
- **HubSpot connected to Claude.**

Limitation: Gmail through Claude can't set a Reply-To header, so the email shows the visitor's address for you to reply to. The Cloudflare endpoint in `contact/server` sets Reply-To properly.
