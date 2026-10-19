/**
 * J.E.I.N. contact endpoint — platform-neutral request handler.
 *
 *   POST /api/contact   JSON body = the visitor's answers (see shared/contact-core.js)
 *
 * Delivers each accepted introduction to HubSpot (contact upsert + note) and to the owner's
 * inbox (Resend). Secrets come only from `env`; nothing sensitive is logged.
 *
 * env:
 *   HUBSPOT_TOKEN        HubSpot private-app token (scopes: crm.objects.contacts.read/write)
 *   HUBSPOT_PORTAL_ID    e.g. 247730038                (used for the record link)
 *   HUBSPOT_APP_HOST     e.g. app-na2.hubspot.com      (default app.hubspot.com)
 *   RESEND_API_KEY       Resend API key
 *   EMAIL_FROM           verified sender, e.g. "J.E.I.N. Website <contact@yourdomain.com>"
 *   OWNER_EMAIL          where notifications go, e.g. jein.inc@gmail.com
 *   ALLOWED_ORIGINS      comma-separated site origins allowed to post
 *   TURNSTILE_SECRET     optional Cloudflare Turnstile secret (enables bot check)
 *   KV                   optional key-value store with get/put (rate limits + idempotency)
 */
import '../shared/contact-core.js';
const C = globalThis.JEINContact;

const MAX_BODY = 24 * 1024;
const inflight = new Set();   // same-isolate guard; across isolates the KV marker, Resend idempotency key and HubSpot's unique email cover it
const RATE = { perIp: 5, windowSec: 3600, perEmail: 3 };

const json = (status, body, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });

function cors(origin, env) {
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!origin || !allowed.includes(origin)) return null;
  return { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', vary: 'origin' };
}
async function sha(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, '0')).join('').slice(0, 32);
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const log = (event, extra = {}) => console.log(JSON.stringify({ event, ...extra }));   // ids and statuses only

async function bump(kv, key, limit) {
  if (!kv) return true;
  const n = +(await kv.get(key)) || 0;
  if (n >= limit) return false;
  await kv.put(key, String(n + 1), { expirationTtl: RATE.windowSec });
  return true;
}

/* ---------- HubSpot ---------- */
async function hs(env, fetchImpl, method, path, body) {
  const r = await fetchImpl('https://api.hubapi.com' + path, {
    method, headers: { authorization: 'Bearer ' + env.HUBSPOT_TOKEN, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error('hubspot_' + r.status); e.status = r.status; throw e; }
  return data;
}
export async function upsertHubSpot(d, submittedAt, env, fetchImpl = fetch) {
  const props = C.hubspotContactProperties(d, submittedAt);
  const found = await hs(env, fetchImpl, 'POST', '/crm/v3/objects/contacts/search', {
    filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: d.email }] }], properties: ['email'], limit: 1
  });
  let id, created = false;
  if (found.results && found.results.length) {
    id = found.results[0].id;
    await hs(env, fetchImpl, 'PATCH', '/crm/v3/objects/contacts/' + id, { properties: props });   // empty values were already removed
  } else {
    id = (await hs(env, fetchImpl, 'POST', '/crm/v3/objects/contacts', { properties: props })).id;
    created = true;
  }
  const host = env.HUBSPOT_APP_HOST || 'app.hubspot.com';
  const url = env.HUBSPOT_PORTAL_ID ? `https://${host}/contacts/${env.HUBSPOT_PORTAL_ID}/record/0-1/${id}` : '';
  const body = '<p><strong>' + esc(C.emailSubject(d)) + '</strong></p><pre>' + esc(C.emailText(d, { submittedAt })) + '</pre>';
  await hs(env, fetchImpl, 'POST', '/crm/v3/objects/notes', {
    properties: { hs_timestamp: submittedAt, hs_note_body: body },
    associations: [{ to: { id }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 202 }] }]
  });
  return { id, created, url };
}

/* ---------- email ---------- */
export async function sendEmail(d, submittedAt, crmUrl, env, fetchImpl = fetch) {
  const r = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json', 'idempotency-key': d.submissionId },
    body: JSON.stringify({
      from: env.EMAIL_FROM, to: [env.OWNER_EMAIL], reply_to: d.email,          // visitor is reply-to, never the sender
      subject: C.emailSubject(d), text: C.emailText(d, { submittedAt, crmUrl })
    })
  });
  if (!r.ok) { const e = new Error('email_' + r.status); e.status = r.status; throw e; }
  return (await r.json().catch(() => ({}))).id || 'sent';
}

/* ---------- request handler ---------- */
export async function handle(request, env, { fetchImpl = fetch, now = () => new Date() } = {}) {
  const origin = request.headers.get('origin');
  const h = cors(origin, env);
  if (request.method === 'OPTIONS') return h ? new Response(null, { status: 204, headers: h }) : new Response(null, { status: 403 });
  if (request.method !== 'POST') return json(405, { ok: false, error: 'method_not_allowed' });
  if (!h) return json(403, { ok: false, error: 'origin_not_allowed' });
  const missing = ['HUBSPOT_TOKEN', 'RESEND_API_KEY', 'EMAIL_FROM', 'OWNER_EMAIL'].filter(k => !env[k]);
  if (missing.length) { log('config_missing', { missing }); return json(503, { ok: false, error: 'not_configured' }, h); }

  const raw = await request.text();
  if (raw.length > MAX_BODY) return json(413, { ok: false, error: 'too_large' }, h);
  let input; try { input = JSON.parse(raw); } catch (e) { return json(400, { ok: false, error: 'bad_json' }, h); }

  if (input.company_url) return json(202, { ok: true }, h);                        // honeypot: accept silently, do nothing

  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
  if (env.TURNSTILE_SECRET) {
    const form = new FormData(); form.append('secret', env.TURNSTILE_SECRET); form.append('response', input.turnstileToken || ''); form.append('remoteip', ip);
    const v = await (await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form })).json().catch(() => ({}));
    if (!v.success) return json(403, { ok: false, error: 'bot_check_failed' }, h);
  }

  const d = C.normalize(input);
  const errors = C.validateAll(d);
  if (Object.keys(errors).length) { log('validation_failed', { fields: Object.keys(errors) }); return json(422, { ok: false, errors }, h); }

  if (inflight.has(d.submissionId)) return json(200, { ok: true, duplicate: true, reference: d.submissionId, status: 'processing' }, h);
  inflight.add(d.submissionId);
  try { return await deliver(d, ip, env, h, fetchImpl, now); } finally { inflight.delete(d.submissionId); }
}

async function deliver(d, ip, env, h, fetchImpl, now) {
  const kv = env.KV;
  const idemKey = 'sub:' + d.submissionId;
  if (kv) { const prior = await kv.get(idemKey); if (prior) return json(200, { ok: true, duplicate: true, ...JSON.parse(prior) }, h); }
  if (!(await bump(kv, 'ip:' + await sha(ip), RATE.perIp)) || !(await bump(kv, 'em:' + await sha(d.email), RATE.perEmail)))
    return json(429, { ok: false, error: 'rate_limited' }, { ...h, 'retry-after': String(RATE.windowSec) });

  if (kv) await kv.put(idemKey, JSON.stringify({ reference: d.submissionId, status: 'processing' }), { expirationTtl: 600 });  // blocks a concurrent double-submit
  const submittedAt = now().toISOString();
  let crm = null, crmError = null, emailId = null, emailError = null;
  try { crm = await upsertHubSpot(d, submittedAt, env, fetchImpl); } catch (e) { crmError = e.message; }
  try { emailId = await sendEmail(d, submittedAt, crm && crm.url, env, fetchImpl); } catch (e) { emailError = e.message; }
  log('submission', { id: d.submissionId, path: d.path, crm: crm ? (crm.created ? 'created' : 'updated') : crmError, email: emailId ? 'sent' : emailError });

  if (!crm && !emailId) { if (kv && kv.delete) await kv.delete(idemKey); return json(502, { ok: false, error: 'delivery_failed' }, h); }   // nothing stored: client keeps answers and may retry
  const result = { reference: d.submissionId, crm: crm ? 'ok' : 'failed', email: emailId ? 'ok' : 'failed' };
  if (kv) await kv.put(idemKey, JSON.stringify(result), { expirationTtl: 7 * 86400 });
  return json(202, { ok: true, ...result }, h);
}

export default { fetch: (request, env) => handle(request, env) };
