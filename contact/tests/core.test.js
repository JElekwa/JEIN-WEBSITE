const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../shared/contact-core.js');

const base = (over = {}) => C.normalize(Object.assign({
  path: 'hire', name: 'Jordan Lee', role: 'Recruiter or hiring manager', company: 'Example Company',
  industry: 'Technology and IT', topic: 'Business analyst or business systems roles',
  followups: { opportunity: 'Improving internal workflows' }, email: 'jordan@example.com',
  privacyAccepted: true, submissionId: 'jein_abcdef123456'
}, over));

test('every card has topics ending in Other and 1–2 follow-ups', () => {
  assert.equal(C.PATH_ORDER.length, 6);
  for (const k of C.PATH_ORDER) {
    const p = C.PATHS[k];
    assert.equal(p.topics.at(-1), 'Other', k);
    assert.ok(p.followups.length >= 1 && p.followups.length <= 2, k);
  }
});

test('valid hire submission passes all validation', () => {
  assert.deepEqual(C.validateAll(base()), {});
});

test('all six paths validate with their own first topic', () => {
  for (const k of C.PATH_ORDER) {
    const d = base({ path: k, topic: C.PATHS[k].topics[0], followups: {} });
    assert.deepEqual(C.validateAll(d), {}, k);
  }
});

test('topic from a different path is rejected', () => {
  const d = base({ path: 'media', topic: 'A job opportunity' });
  assert.equal(d.topic, '');
  assert.ok(C.validateStep(2, d).topic);
});

test('every Other reveals a required text field', () => {
  assert.ok(C.validateStep(1, base({ role: 'Other' })).roleOther);
  assert.equal(C.validateStep(1, base({ role: 'Other', roleOther: 'Analyst' })).roleOther, undefined);
  assert.ok(C.validateStep(1, base({ industry: 'Other' })).industryOther);
  for (const k of C.PATH_ORDER) {
    assert.ok(C.validateStep(2, base({ path: k, topic: 'Other' })).topicOther, k);
    for (const f of C.PATHS[k].followups.filter(f => f.type === 'select')) {
      const e = C.validateStep(3, base({ path: k, topic: 'Other', topicOther: 'x', followups: { [f.id]: 'Other' } }));
      assert.ok(e['fu_' + f.id + 'Other'], k + ':' + f.id);
      const ok = C.validateStep(3, base({ path: k, followups: { [f.id]: 'Other', [f.id + 'Other']: 'Something' } }));
      assert.deepEqual(ok, {}, k);
    }
  }
});

test('required fields and email format', () => {
  const e = C.validateAll(C.normalize({}));
  for (const k of ['path', 'name', 'role', 'topic', 'email', 'privacyAccepted', 'submissionId']) assert.ok(e[k], k);
  for (const bad of ['jordan', 'jordan@', 'jordan@example', 'a b@example.com', '<x>@y.com'])
    assert.ok(C.validateStep(4, base({ email: bad })).email, bad);
  assert.equal(C.validateStep(4, base({ email: 'Jordan.Lee+jein@sub.example.co.uk' })).email, undefined);
});

test('company is optional for every role', () => {
  assert.deepEqual(C.validateStep(1, base({ company: '', role: 'Student or fellow learner' })), {});
  assert.deepEqual(C.validateStep(1, base({ company: '', industry: '' })), {});
});

test('LinkedIn reply method needs a LinkedIn URL; URLs are checked', () => {
  assert.ok(C.validateStep(4, base({ responseMethod: 'linkedin' })).linkedin);
  assert.ok(C.validateStep(4, base({ linkedin: 'twitter.com/jordan' })).linkedin);
  assert.deepEqual(C.validateStep(4, base({ responseMethod: 'linkedin', linkedin: 'linkedin.com/in/jordan' })), {});
  assert.ok(C.validateStep(4, base({ website: 'not a url' })).website);
  assert.ok(C.validateStep(3, base({ followups: { link: 'nope' } }))['fu_link']);
});

test('privacy acknowledgement is required and newsletter is separate', () => {
  assert.ok(C.validateStep(4, base({ privacyAccepted: false })).privacyAccepted);
  assert.ok(C.validateStep(4, base({ privacyAccepted: 'true' })).privacyAccepted, 'string true is not consent');
  assert.deepEqual(C.validateStep(4, base({ newsletterOptIn: false })), {});
  assert.equal(base({ newsletterOptIn: true }).newsletterOptIn, true);
});

test('introduction uses only the answers given', () => {
  assert.equal(C.introduction(base()),
    'Hi, my name is Jordan Lee. I am a recruiter or hiring manager with Example Company, working in technology and IT. I would like to connect about business analyst or business systems roles.');
  const minimal = base({ company: '', industry: '' });
  assert.equal(C.introduction(minimal),
    'Hi, my name is Jordan Lee. I am a recruiter or hiring manager. I would like to connect about business analyst or business systems roles.');
  const na = base({ industry: 'Not Applicable', company: '' });
  assert.ok(!/applicable/i.test(C.introduction(na)));
  const other = base({ role: 'Other', roleOther: 'Operations lead', topic: 'Other', topicOther: 'Warehouse automation' });
  assert.match(C.introduction(other), /I am an operations lead with Example Company/);
  assert.match(C.introduction(other), /connect about warehouse automation\.$/);
});

test('normalize strips hidden fields, mismatched options and control chars', () => {
  const d = C.normalize({ path: 'hire', name: ' Jo\u0007 ', role: 'Hacker', roleOther: 'x', followups: { opportunity: 'a', evil: '<script>' }, extra: 1 });
  assert.equal(d.name, 'Jo');
  assert.equal(d.role, '');
  assert.equal(d.roleOther, '');
  assert.deepEqual(Object.keys(d.followups), ['opportunity']);
  assert.equal(d.extra, undefined);
  assert.equal(C.normalize({ name: 'x'.repeat(500) }).name.length, C.LIMITS.name);
});

test('email subject and body', () => {
  assert.equal(C.emailSubject(base()), '[J.E.I.N. Contact] Hiring inquiry — Jordan Lee / Example Company');
  assert.equal(C.emailSubject(base({ company: '' })), '[J.E.I.N. Contact] Hiring inquiry — Jordan Lee');
  const body = C.emailText(base(), { submittedAt: '2026-10-18T23:00:00Z', crmUrl: 'https://app.hubspot.com/x' });
  for (const s of ['Connection type: Hire me', 'Topic: Business analyst', 'Improving internal workflows', 'jordan@example.com',
    'Privacy notice acknowledged: Yes', 'Newsletter opt-in: No', '2026-10-18T23:00:00Z', 'CRM record: https://app.hubspot.com/x'])
    assert.ok(body.includes(s), s);
});

test('HubSpot properties omit empty values', () => {
  const props = C.hubspotContactProperties(base({ company: '', website: '' }), '2026-10-18T23:00:00.000Z');
  assert.equal(props.email, 'jordan@example.com');
  assert.equal(props.firstname, 'Jordan');
  assert.equal(props.lastname, 'Lee');
  assert.equal(props.jein_source, 'J.E.I.N. Website Contact');
  assert.equal(props.jein_connection_type, 'hire');
  assert.equal(props.industry, 'Technology and IT');
  assert.equal(props.jein_last_submission_id, 'jein_abcdef123456');
  assert.ok(!('company' in props));
  assert.ok(!('website' in props));
  assert.ok(!('industry' in C.hubspotContactProperties(base({ industry: 'Not Applicable' }))));
});

test('ids are unique and well formed', () => {
  const a = C.newId(), b = C.newId();
  assert.match(a, /^jein_[0-9a-f]{24}$/);
  assert.notEqual(a, b);
});
