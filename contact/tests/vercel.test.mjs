import test from 'node:test';
import assert from 'node:assert/strict';
import { POST, OPTIONS, GET } from '../../api/contact.mjs';

const ORIGIN = 'https://jeinelekwa.com';
const ENV = {
  HUBSPOT_TOKEN: 'hs-secret', HUBSPOT_PORTAL_ID: '247730038', HUBSPOT_APP_HOST: 'app-na2.hubspot.com',
  RESEND_API_KEY: 're-secret', EMAIL_FROM: 'J.E.I.N. Website <contact@jeinelekwa.com>', OWNER_EMAIL: 'jein.inc@gmail.com',
  ALLOWED_ORIGINS: 'https://jeinelekwa.com,https://www.jeinelekwa.com'
};
const body = {
  path: 'hire', name: 'Jordan Lee', role: 'Recruiter or hiring manager', topic: 'A job opportunity', followups: {},
  email: 'jordan@example.com', privacyAccepted: true, submissionId: 'jein_vercel0000000000000000'
};
const req = (method, b, origin = ORIGIN) => new Request('https://jeinelekwa.com/api/contact', {
  method, headers: { origin, 'content-type': 'application/json' }, body: b ? JSON.stringify(b) : undefined });

test('Vercel function reads config from process.env and delivers', async (t) => {
  const saved = { ...process.env }; Object.assign(process.env, ENV);
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init = {}) => {
    calls.push(url);
    const ok = (o, s = 200) => new Response(JSON.stringify(o), { status: s });
    if (url.endsWith('/contacts/search')) return ok({ results: [] });
    if (url.endsWith('/objects/contacts')) return ok({ id: '555' }, 201);
    if (url.endsWith('/objects/notes')) return ok({ id: 'n1' }, 201);
    if (url.includes('resend')) return ok({ id: 'em_1' });
    return ok({}, 404);
  });
  try {
    const r = await POST(req('POST', body));
    assert.equal(r.status, 202);
    const j = await r.json(); assert.equal(j.crm, 'ok'); assert.equal(j.email, 'ok');
    assert.ok(calls.some(u => u.includes('hubapi')) && calls.some(u => u.includes('resend')));
    assert.equal((await OPTIONS(req('OPTIONS'))).status, 204);
    assert.equal((await GET(req('GET'))).status, 405);
    assert.equal((await POST(req('POST', body, 'https://evil.example'))).status, 403);
  } finally { for (const k of Object.keys(ENV)) if (!(k in saved)) delete process.env[k]; }
});

test('Vercel function refuses to run without its secrets', async () => {
  for (const k of Object.keys(ENV)) delete process.env[k];
  process.env.ALLOWED_ORIGINS = ENV.ALLOWED_ORIGINS;
  const r = await POST(req('POST', body));
  assert.equal(r.status, 503);
  delete process.env.ALLOWED_ORIGINS;
});
