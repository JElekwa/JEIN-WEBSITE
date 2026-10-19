import test from 'node:test';
import assert from 'node:assert/strict';
import { handle } from '../server/handler.mjs';

const ENV = () => ({
  HUBSPOT_TOKEN: 'hs-secret', HUBSPOT_PORTAL_ID: '247730038', HUBSPOT_APP_HOST: 'app-na2.hubspot.com',
  RESEND_API_KEY: 're-secret', EMAIL_FROM: 'J.E.I.N. Website <contact@jein.example>', OWNER_EMAIL: 'jein.inc@gmail.com',
  ALLOWED_ORIGINS: 'https://jein.example', KV: kv()
});
function kv() { const m = new Map(); return { m, get: async k => m.get(k) ?? null, put: async (k, v) => { m.set(k, v); }, delete: async k => { m.delete(k); } }; }
const body = (over = {}) => ({
  path: 'hire', name: 'Jordan Lee', role: 'Recruiter or hiring manager', company: 'Example Company', industry: 'Technology and IT',
  topic: 'A job opportunity', followups: { opportunity: 'Systems analyst' }, email: 'jordan@example.com', privacyAccepted: true,
  submissionId: 'jein_0123456789abcdef01234567', ...over
});
const req = (b, { origin = 'https://jein.example', ip = '1.2.3.4', method = 'POST' } = {}) =>
  new Request('https://api.jein.example/api/contact', { method, headers: { origin, 'content-type': 'application/json', 'cf-connecting-ip': ip }, body: method === 'POST' ? JSON.stringify(b) : undefined });

function mockFetch({ existing = false, hsFail = false, mailFail = false } = {}) {
  const calls = [];
  const f = async (url, init = {}) => {
    const b = init.body ? JSON.parse(init.body) : null;
    calls.push({ url, method: init.method, body: b, headers: init.headers });
    const ok = (o, s = 200) => new Response(JSON.stringify(o), { status: s });
    if (url.includes('hubapi')) {
      if (hsFail) return ok({ message: 'nope' }, 500);
      if (url.endsWith('/contacts/search')) return ok({ results: existing ? [{ id: '901' }] : [] });
      if (url.endsWith('/objects/contacts') && init.method === 'POST') return ok({ id: '555' }, 201);
      if (url.includes('/objects/contacts/')) return ok({ id: '901' });
      if (url.endsWith('/objects/notes')) return ok({ id: 'n1' }, 201);
    }
    if (url.includes('resend')) return mailFail ? ok({}, 500) : ok({ id: 'em_1' });
    return ok({}, 404);
  };
  f.calls = calls; return f;
}

test('new contact: creates contact, note, and email with reply-to', async () => {
  const env = ENV(), f = mockFetch();
  const r = await handle(req(body()), env, { fetchImpl: f, now: () => new Date('2026-10-18T23:00:00Z') });
  assert.equal(r.status, 202);
  const j = await r.json(); assert.equal(j.ok, true); assert.equal(j.crm, 'ok'); assert.equal(j.email, 'ok');
  const create = f.calls.find(c => c.url.endsWith('/objects/contacts'));
  assert.equal(create.body.properties.email, 'jordan@example.com');
  assert.equal(create.body.properties.jein_connection_type, 'hire');
  assert.equal(create.body.properties.jein_source, 'J.E.I.N. Website Contact');
  assert.equal(create.body.properties.jein_last_inquiry_at, '2026-10-18T23:00:00.000Z');
  const note = f.calls.find(c => c.url.endsWith('/objects/notes'));
  assert.equal(note.body.associations[0].to.id, '555');
  assert.match(note.body.properties.hs_note_body, /Systems analyst/);
  const mail = f.calls.find(c => c.url.includes('resend'));
  assert.equal(mail.body.reply_to, 'jordan@example.com');
  assert.deepEqual(mail.body.to, ['jein.inc@gmail.com']);
  assert.notEqual(mail.body.from, 'jordan@example.com');
  assert.equal(mail.body.subject, '[J.E.I.N. Contact] Hiring inquiry — Jordan Lee / Example Company');
  assert.match(mail.body.text, /app-na2\.hubspot\.com\/contacts\/247730038\/record\/0-1\/555/);
  assert.ok(f.calls.every(c => !String(c.url).includes('hs-secret')));
});

test('existing contact: updates without blanking fields', async () => {
  const f = mockFetch({ existing: true });
  const r = await handle(req(body({ company: '', industry: '' })), ENV(), { fetchImpl: f });
  assert.equal(r.status, 202);
  const patch = f.calls.find(c => c.method === 'PATCH');
  assert.ok(patch.url.endsWith('/contacts/901'));
  assert.ok(!('company' in patch.body.properties));
  assert.ok(!('industry' in patch.body.properties));
  assert.ok(!f.calls.some(c => c.url.endsWith('/objects/contacts') && c.method === 'POST'));
});

test('duplicate submission id is delivered once', async () => {
  const env = ENV(), f = mockFetch();
  await handle(req(body()), env, { fetchImpl: f });
  const n = f.calls.length;
  const r2 = await handle(req(body()), env, { fetchImpl: f });
  assert.equal(r2.status, 200); assert.equal((await r2.json()).duplicate, true);
  assert.equal(f.calls.length, n);
});

test('concurrent double submit is delivered once', async () => {
  const env = ENV(), f = mockFetch();
  const [a, b] = await Promise.all([handle(req(body()), env, { fetchImpl: f }), handle(req(body()), env, { fetchImpl: f })]);
  assert.equal(f.calls.filter(c => c.url.includes('resend')).length, 1);
  assert.deepEqual([a.status, b.status].sort(), [200, 202]);
});

test('server-side validation rejects bad input', async () => {
  const f = mockFetch();
  const r = await handle(req(body({ email: 'jordan@', privacyAccepted: false, topic: 'Not a topic' })), ENV(), { fetchImpl: f });
  assert.equal(r.status, 422);
  const j = await r.json();
  assert.ok(j.errors.email && j.errors.privacyAccepted && j.errors.topic);
  assert.equal(f.calls.length, 0);
});

test('CRM failure still emails; both failing returns 502 and allows retry', async () => {
  let env = ENV(), f = mockFetch({ hsFail: true });
  let r = await handle(req(body()), env, { fetchImpl: f });
  assert.equal(r.status, 202); assert.equal((await r.json()).crm, 'failed');
  env = ENV(); f = mockFetch({ hsFail: true, mailFail: true });
  r = await handle(req(body()), env, { fetchImpl: f });
  assert.equal(r.status, 502); assert.equal((await r.json()).ok, false);
  r = await handle(req(body()), env, { fetchImpl: mockFetch() });
  assert.equal(r.status, 202, 'retry after total failure is processed');
});

test('email failure keeps CRM result and reports it', async () => {
  const r = await handle(req(body()), ENV(), { fetchImpl: mockFetch({ mailFail: true }) });
  assert.equal(r.status, 202); const j = await r.json(); assert.equal(j.email, 'failed'); assert.equal(j.crm, 'ok');
});

test('rate limit per IP', async () => {
  const env = ENV(), f = mockFetch(); let last;
  for (let i = 0; i < 6; i++) last = await handle(req(body({ submissionId: 'jein_' + String(i).padStart(24, '0'), email: `p${i}@example.com` })), env, { fetchImpl: f });
  assert.equal(last.status, 429);
});

test('origin, method, honeypot, size and config guards', async () => {
  const f = mockFetch();
  assert.equal((await handle(req(body(), { origin: 'https://evil.example' }), ENV(), { fetchImpl: f })).status, 403);
  assert.equal((await handle(req(null, { method: 'GET' }), ENV(), { fetchImpl: f })).status, 405);
  assert.equal((await handle(req(body({ company_url: 'spam' })), ENV(), { fetchImpl: f })).status, 202);
  assert.equal(f.calls.length, 0, 'honeypot never reaches HubSpot or email');
  assert.equal((await handle(req(body({ message: 'x'.repeat(30000) })), ENV(), { fetchImpl: f })).status, 413);
  const env = ENV(); delete env.HUBSPOT_TOKEN;
  assert.equal((await handle(req(body()), env, { fetchImpl: f })).status, 503);
});
