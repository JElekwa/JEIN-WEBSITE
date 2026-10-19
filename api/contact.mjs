/**
 * Vercel Function: POST /api/contact
 * A thin wrapper around the platform-neutral contact handler (contact/server/handler.mjs), which validates the
 * introduction again on the server, upserts the HubSpot contact with a note and emails the owner through Resend.
 *
 * Set these in Vercel → Project → Settings → Environment Variables (never in files):
 *   HUBSPOT_TOKEN, RESEND_API_KEY                      secrets
 *   HUBSPOT_PORTAL_ID=247730038  HUBSPOT_APP_HOST=app-na2.hubspot.com
 *   EMAIL_FROM="J.E.I.N. Website <contact@jeinelekwa.com>"   (a Resend-verified domain)
 *   OWNER_EMAIL=jein.inc@gmail.com
 *   ALLOWED_ORIGINS=https://jeinelekwa.com,https://www.jeinelekwa.com
 *   TURNSTILE_SECRET (optional)
 * There is no KV store on Vercel by default, so rate limits and the 7-day duplicate record are off; duplicate
 * sends are still blocked by the per-submission id (same-instance guard and Resend's idempotency key).
 */
import { handle } from '../contact/server/handler.mjs';

export async function POST(request) { return handle(request, process.env); }
export async function OPTIONS(request) { return handle(request, process.env); }
export async function GET(request) { return handle(request, process.env); }   // answers 405, as the handler does
