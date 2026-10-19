/*!
 * J.E.I.N. contact core — shared by the website (browser) and the server endpoint (Node / Workers).
 * Pure functions only: configuration, validation, normalisation, summary and notification text.
 * No secrets, no network calls.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.JEINContact = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SOURCE = 'J.E.I.N. Website Contact';
  const LIMITS = { name: 100, short: 120, text: 1500, message: 3000, url: 300, email: 254 };

  const ROLES = [
    'Recruiter or hiring manager', 'Business owner or founder', 'Consultant or industry professional',
    'Technology or IT professional', 'E-commerce or retail professional', 'Marketing or creative professional',
    'Podcast guest or media contact', 'Community organizer', 'Student or fellow learner', 'Friend or supporter', 'Other'
  ];
  /* Roles that usually do not represent an organisation: the company prompt is softened for them. */
  const INDIVIDUAL_ROLES = ['Student or fellow learner', 'Friend or supporter'];

  const INDUSTRIES = [
    'Technology and IT', 'Consulting', 'E-commerce and Retail', 'Consumer Brands', 'Education',
    'Nonprofit and Community', 'Media', 'Other', 'Not Applicable'
  ];

  const PATHS = {
    hire: {
      label: 'Hire me', icon: 'briefcase', subjectLabel: 'Hiring inquiry', crmType: 'Hire me',
      description: 'Looking for someone who combines commercial understanding, operational experience, and growing technical capabilities? Let’s discuss your team and the problems you need to solve.',
      confirm: 'You’re here about a role or opportunity. Next, a short introduction, then a few questions about the position.',
      topics: ['A job opportunity', 'Business analyst or business systems roles', 'Consulting or business transformation',
        'Technology implementation or IT', 'Quality assurance or process improvement', 'An internship or entry-level opportunity',
        'General professional networking', 'Other'],
      followups: [
        { id: 'opportunity', label: 'What role or opportunity did you have in mind?', type: 'textarea' },
        { id: 'link', label: 'Is there a job description or company link you can share?', type: 'url' }
      ]
    },
    collaborate: {
      label: 'Collaborate on a project', icon: 'handshake', subjectLabel: 'Project collaboration', crmType: 'Collaborate on a project',
      description: 'Have a business, technology, automation, website, or process improvement project worth exploring?',
      confirm: 'You have a project in mind. Next, a short introduction, then what you want to build and where it stands.',
      topics: ['Business analysis or transformation', 'Automation or systems improvement', 'Website or digital project',
        'Product concept or prototype', 'E-commerce or commercial development', 'Research or case study', 'Other'],
      followups: [
        { id: 'goal', label: 'What are you hoping to build, improve, or solve?', type: 'textarea' },
        { id: 'stage', label: 'What stage is the project at?', type: 'select',
          options: ['Exploring', 'Planning', 'Prototype', 'Active project', 'Other'] }
      ]
    },
    business: {
      label: 'Business and e-commerce', icon: 'storefront', subjectLabel: 'Business & e-commerce', crmType: 'Business and e-commerce',
      description: 'Connect about digital commerce, emerging brands, online business, commercial development, and entrepreneurial experiments.',
      confirm: 'You want to talk business or e-commerce. Next, a short introduction, then the opportunity you have in mind.',
      topics: ['Emerging brand development', 'Digital commerce', 'Website or storefront development',
        'Marketing or customer acquisition', 'Operations or workflow improvement', 'Business partnership', 'Other'],
      followups: [
        { id: 'opportunity', label: 'What business, brand, or opportunity would you like to discuss?', type: 'textarea' },
        { id: 'collaboration', label: 'What kind of collaboration are you considering?', type: 'text' }
      ]
    },
    media: {
      label: 'O2O Playbook and media', icon: 'microphone', subjectLabel: 'O2O Playbook & media', crmType: 'O2O Playbook and media',
      description: 'Suggest a guest, share an industry story, propose a topic, or explore a podcast collaboration.',
      confirm: 'You’re reaching out about the O2O Playbook. Next, a short introduction, then your idea.',
      topics: ['Appearing as a guest', 'Suggesting a guest', 'Proposing a topic', 'Sponsorship or partnership',
        'Sharing an industry story', 'Other'],
      followups: [
        { id: 'story', label: 'What topic or story would you like to discuss?', type: 'textarea' },
        { id: 'proposal', label: 'Are you proposing a guest, an episode idea, or a partnership?', type: 'select',
          options: ['A guest', 'An episode idea', 'A partnership', 'Other'] }
      ]
    },
    community: {
      label: 'Seven Figure Employee community', icon: 'users', subjectLabel: 'Seven Figure Employee', crmType: 'Seven Figure Employee community',
      description: 'Connect around career development, practical skills, peer learning, professional networking, and community building.',
      confirm: 'You’re interested in the Seven Figure Employee community. Next, a short introduction, then how you’d like to take part.',
      topics: ['Joining the community', 'Career development', 'Peer learning or accountability',
        'Hosting a discussion or event', 'Community partnership', 'Other'],
      followups: [
        { id: 'participate', label: 'What would you most like to participate in?', type: 'text' },
        { id: 'contribute', label: 'How would you like to contribute?', type: 'text' }
      ]
    },
    other: {
      label: 'Something else', icon: 'message-circle', subjectLabel: 'General inquiry', crmType: 'Something else',
      description: 'Have a question, some feedback, or another reason to reach out? Start here.',
      confirm: 'Good, there’s room for anything here. Next, a short introduction, then what’s on your mind.',
      topics: ['General question', 'Feedback about the website', 'My professional story', 'A project not listed here', 'Other'],
      followups: [
        { id: 'context', label: 'What would you like me to know before we connect?', type: 'textarea' }
      ]
    }
  };
  const PATH_ORDER = ['hire', 'collaborate', 'business', 'media', 'community', 'other'];

  /* ---------- helpers ---------- */
  const str = v => (typeof v === 'string' ? v : v == null ? '' : String(v)).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  const cap = (v, n) => str(v).slice(0, n);
  const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/;
  function isEmail(v) { v = str(v); return v.length <= LIMITS.email && EMAIL_RE.test(v); }
  function isUrl(v) {
    v = str(v); if (!v) return false;
    try { const u = new URL(/^https?:\/\//i.test(v) ? v : 'https://' + v); return /^https?:$/.test(u.protocol) && /\./.test(u.hostname); }
    catch (e) { return false; }
  }
  function normUrl(v) { v = str(v); if (!v) return ''; return /^https?:\/\//i.test(v) ? v : 'https://' + v; }
  function isLinkedIn(v) { if (!isUrl(v)) return false; try { return /(^|\.)linkedin\.com$/i.test(new URL(normUrl(v)).hostname); } catch (e) { return false; } }
  function splitName(full) {
    const parts = str(full).split(/\s+/).filter(Boolean);
    if (parts.length <= 1) return { firstname: parts[0] || '', lastname: '' };
    return { firstname: parts.slice(0, -1).join(' '), lastname: parts[parts.length - 1] };
  }
  const article = w => (/^[aeiou]/i.test(w) ? 'an' : 'a');
  const lcFirst = s => (s && !/^[A-Z]{2}/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);

  /* ---------- normalisation: the only shape that is stored or sent ---------- */
  function normalize(input) {
    const i = input || {};
    const path = PATHS[i.path] ? i.path : '';
    const p = PATHS[path];
    const followups = {};
    if (p) {
      p.followups.forEach(f => {
        const raw = i.followups && i.followups[f.id];
        let val = f.type === 'url' ? cap(raw, LIMITS.url) : cap(raw, f.type === 'textarea' ? LIMITS.text : LIMITS.short);
        if (f.type === 'select' && val && f.options.indexOf(val) === -1) val = '';
        if (val) followups[f.id] = val;
        if (f.type === 'select' && val === 'Other') {
          const o = cap(i.followups && i.followups[f.id + 'Other'], LIMITS.short);
          if (o) followups[f.id + 'Other'] = o;
        }
      });
    }
    const role = ROLES.indexOf(str(i.role)) > -1 ? str(i.role) : '';
    const industry = INDUSTRIES.indexOf(str(i.industry)) > -1 ? str(i.industry) : '';
    const topic = p && p.topics.indexOf(str(i.topic)) > -1 ? str(i.topic) : '';
    const out = {
      path,
      name: cap(i.name, LIMITS.name),
      role, roleOther: role === 'Other' ? cap(i.roleOther, LIMITS.short) : '',
      company: cap(i.company, LIMITS.short),
      industry, industryOther: industry === 'Other' ? cap(i.industryOther, LIMITS.short) : '',
      topic, topicOther: topic === 'Other' ? cap(i.topicOther, LIMITS.short) : '',
      followups,
      email: cap(i.email, LIMITS.email).toLowerCase(),
      linkedin: i.linkedin ? normUrl(cap(i.linkedin, LIMITS.url)) : '',
      website: i.website ? normUrl(cap(i.website, LIMITS.url)) : '',
      responseMethod: i.responseMethod === 'linkedin' ? 'linkedin' : 'email',
      message: cap(i.message, LIMITS.message),
      privacyAccepted: i.privacyAccepted === true,
      newsletterOptIn: i.newsletterOptIn === true,
      submissionId: cap(i.submissionId, 64).replace(/[^A-Za-z0-9_-]/g, '')
    };
    if (out.followups.link) out.followups.link = normUrl(out.followups.link);
    return out;
  }

  /* ---------- validation: step-scoped for the UI, all steps for the server ---------- */
  function validateStep(step, d) {
    const e = {};
    const p = PATHS[d.path];
    if (step === 0) { if (!p) e.path = 'Choose the card that best describes why you’re here.'; }
    if (step === 1) {
      if (str(d.name).length < 2) e.name = 'Enter your name.';
      else if (str(d.name).length > LIMITS.name) e.name = 'Use ' + LIMITS.name + ' characters or fewer.';
      if (!d.role) e.role = 'Choose the role closest to yours.';
      if (d.role === 'Other' && !str(d.roleOther)) e.roleOther = 'Tell me your role in a few words.';
      if (d.industry === 'Other' && !str(d.industryOther)) e.industryOther = 'Name the industry, or choose another option.';
    }
    if (step === 2) {
      if (!d.topic) e.topic = 'Choose what you’d like to connect about.';
      if (d.topic === 'Other' && !str(d.topicOther)) e.topicOther = 'Describe the topic in a few words.';
    }
    if (step === 3 && p) {
      p.followups.forEach(f => {
        const v = d.followups && d.followups[f.id];
        if (f.type === 'url' && str(v) && !isUrl(v)) e['fu_' + f.id] = 'Enter a full web address, like example.com/job.';
        if (f.type === 'select' && v === 'Other' && !str(d.followups[f.id + 'Other'])) e['fu_' + f.id + 'Other'] = 'Add a few words, or choose another option.';
      });
    }
    if (step === 4) {
      if (!str(d.email)) e.email = 'Enter your email address so I can reply.';
      else if (!isEmail(d.email)) e.email = 'That email address looks incomplete. Use the format name@example.com.';
      if (str(d.linkedin) && !isLinkedIn(d.linkedin)) e.linkedin = 'Enter a LinkedIn profile URL, like linkedin.com/in/yourname.';
      if (d.responseMethod === 'linkedin' && !str(d.linkedin)) e.linkedin = 'Add your LinkedIn URL, or choose email as the reply method.';
      if (str(d.website) && !isUrl(d.website)) e.website = 'Enter a full web address, like example.com.';
      if (d.privacyAccepted !== true) e.privacyAccepted = 'Please confirm you’ve read the privacy notice.';
    }
    return e;
  }
  function validateAll(d) {
    const e = Object.assign({}, validateStep(0, d), validateStep(1, d), validateStep(2, d), validateStep(3, d), validateStep(4, d));
    if (str(d.submissionId).length < 8) e.submissionId = 'Missing submission id.';
    return e;
  }

  /* ---------- readable output built only from the answers given ---------- */
  function roleText(d) { return d.role === 'Other' ? str(d.roleOther) : d.role; }
  function industryText(d) { return d.industry === 'Other' ? str(d.industryOther) : (d.industry === 'Not Applicable' ? '' : d.industry); }
  function topicText(d) { return d.topic === 'Other' ? str(d.topicOther) : d.topic; }

  function followupList(d) {
    const p = PATHS[d.path]; if (!p) return [];
    const out = [];
    p.followups.forEach(f => {
      let v = d.followups && d.followups[f.id];
      if (!str(v)) return;
      if (f.type === 'select' && v === 'Other') v = str(d.followups[f.id + 'Other']) || 'Other';
      out.push({ id: f.id, question: f.label, answer: str(v) });
    });
    return out;
  }

  function introduction(d) {
    const s = [];
    if (str(d.name)) s.push('Hi, my name is ' + str(d.name) + '.');
    const r = roleText(d), co = str(d.company), ind = industryText(d);
    if (r) {
      let line = 'I am ' + article(r) + ' ' + lcFirst(r);
      if (co) line += ' with ' + co;
      if (ind) line += (co ? ', working in ' : ' working in ') + lcFirst(ind);
      s.push(line + '.');
    } else if (co) {
      s.push('I work with ' + co + (ind ? ', in ' + lcFirst(ind) : '') + '.');
    }
    const t = topicText(d);
    if (t) s.push('I would like to connect about ' + lcFirst(t).replace(/[.!?]+$/, '') + '.');
    return s.join(' ');
  }

  function summary(d) {
    const p = PATHS[d.path];
    return {
      connectionType: p ? p.label : '',
      introduction: introduction(d),
      followups: followupList(d),
      message: str(d.message),
      contact: {
        email: str(d.email), linkedin: str(d.linkedin), website: str(d.website),
        responseMethod: d.responseMethod === 'linkedin' ? 'LinkedIn' : 'Email'
      },
      consent: { privacyAccepted: d.privacyAccepted === true, newsletterOptIn: d.newsletterOptIn === true }
    };
  }

  function emailSubject(d) {
    const p = PATHS[d.path];
    const who = str(d.name) + (str(d.company) ? ' / ' + str(d.company) : '');
    return '[J.E.I.N. Contact] ' + (p ? p.subjectLabel : 'Inquiry') + ' — ' + who;
  }

  function emailText(d, meta) {
    meta = meta || {};
    const s = summary(d);
    const L = [];
    L.push('New introduction from the J.E.I.N. website', '');
    L.push(s.introduction, '');
    L.push('Connection type: ' + s.connectionType);
    L.push('Topic: ' + topicText(d));
    L.push('Role: ' + roleText(d));
    if (str(d.company)) L.push('Company: ' + str(d.company));
    if (industryText(d) || d.industry) L.push('Industry: ' + (d.industry === 'Other' ? str(d.industryOther) : d.industry));
    if (s.followups.length) { L.push('', 'Follow-up answers:'); s.followups.forEach(f => L.push('• ' + f.question, '  ' + f.answer)); }
    if (s.message) L.push('', 'Message:', s.message);
    L.push('', 'Reply to: ' + s.contact.email + '  (preferred: ' + s.contact.responseMethod + ')');
    if (s.contact.linkedin) L.push('LinkedIn: ' + s.contact.linkedin);
    if (s.contact.website) L.push('Website / project: ' + s.contact.website);
    L.push('', 'Privacy notice acknowledged: ' + (s.consent.privacyAccepted ? 'Yes' : 'No'));
    L.push('Newsletter opt-in: ' + (s.consent.newsletterOptIn ? 'Yes' : 'No'));
    L.push('Submitted: ' + (meta.submittedAt || ''));
    L.push('Submission ID: ' + str(d.submissionId));
    if (meta.crmUrl) L.push('CRM record: ' + meta.crmUrl);
    L.push('Source: ' + SOURCE);
    return L.join('\n');
  }

  /* HubSpot contact properties; empty values are omitted so existing CRM data is never blanked. */
  function hubspotContactProperties(d, submittedAtIso) {
    const n = splitName(d.name);
    const props = {
      email: str(d.email),
      firstname: n.firstname, lastname: n.lastname,
      company: str(d.company),
      jobtitle: d.role === 'Other' ? str(d.roleOther) : '',
      website: str(d.website),
      hs_linkedin_url: str(d.linkedin),
      industry: d.industry === 'Other' ? str(d.industryOther) : (d.industry === 'Not Applicable' ? '' : (d.industry || '')),
      jein_connection_type: PATHS[d.path] ? d.path : '',          // dropdown internal values are the path keys
      jein_inquiry_topic: topicText(d),
      jein_role: roleText(d),
      jein_source: SOURCE,
      jein_last_inquiry_at: submittedAtIso || '',
      jein_last_submission_id: str(d.submissionId)
    };
    Object.keys(props).forEach(k => { if (!str(props[k])) delete props[k]; });
    return props;
  }

  function newId() {
    const a = new Uint8Array(12);
    (globalThis.crypto || require('crypto').webcrypto).getRandomValues(a);
    return 'jein_' + Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
  }

  return {
    SOURCE, LIMITS, ROLES, INDIVIDUAL_ROLES, INDUSTRIES, PATHS, PATH_ORDER,
    normalize, validateStep, validateAll, isEmail, isUrl, isLinkedIn,
    roleText, industryText, topicText, introduction, summary, followupList,
    emailSubject, emailText, hubspotContactProperties, splitName, newId
  };
});
