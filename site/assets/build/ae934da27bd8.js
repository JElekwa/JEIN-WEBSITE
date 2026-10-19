
/* ---------- guided contact (v0.3): cards → conversational steps → review → submit ---------- */
(() => {
  const C = window.JEINContact;
  const q = s => document.querySelector(s);
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const DRAFT_KEY = 'jein-connect-draft', SENT_KEY = 'jein-connect-last-sent';
  const STEP_NAMES = ['Choose a path', 'Your introduction', 'Reply and send'];
  const LAST = 2;
  const LEGACY = { professional: 'hire', business: 'business', project: 'collaborate', media: 'media', general: 'other', community: 'community' };
  const ICON = {
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
    handshake: '<path d="M2 11l4-4 4 2 3-2 5 1 4 4"/><path d="M6 13l4 4a1.5 1.5 0 0 0 2-2m-2-2l3 3a1.5 1.5 0 0 0 2-2l-3-3m0 0l1 1a1.5 1.5 0 0 0 2-2l-4-4"/><path d="M2 11l3 3m17-2l-4 3"/>',
    storefront: '<path d="M3 9l1.5-5h15L21 9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M5 12v8h14v-8M10 20v-5h4v5"/>',
    microphone: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
    'message-circle': '<path d="M21 11.5a8.5 8.5 0 0 1-12.5 7.5L3 21l2-5A8.5 8.5 0 1 1 21 11.5z"/>'
  };
  const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;

  const store = {
    get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } },
    set(k,v){ try { localStorage.setItem(k,v); } catch(e){} },
    del(k){ try { localStorage.removeItem(k); } catch(e){} }
  };
  function fresh(){
    return { path:'', name:'', role:'', roleOther:'', company:'', industry:'', industryOther:'', topic:'', topicOther:'',
      followups:{}, email:'', linkedin:'', website:'', responseMethod:'email', message:'', privacyAccepted:false,
      newsletterOptIn:false, submissionId:C.newId(), step:0 };
  }
  let state = (() => { try { const s = JSON.parse(store.get(DRAFT_KEY)); return s && s.submissionId ? Object.assign(fresh(), s) : fresh(); } catch(e){ return fresh(); } })();
  if (state.step > LAST) state.step = state.step >= 4 ? 2 : 1;
  else if (state.step === 2 && !state.email && !state.privacyAccepted && state.__v !== 2) state.step = 1;
  state.__v = 2;
  let saveT; const save = () => { clearTimeout(saveT); saveT = setTimeout(() => store.set(DRAFT_KEY, JSON.stringify(state)), 200); };

  /* analytics: names of events and non-identifying properties only */
  const sentEvents = new Set();
  function track(name, props){
    const ev = Object.assign({ event: 'jein_contact_' + name }, props || {});
    try { (window.dataLayer = window.dataLayer || []).push(ev); } catch(e){}
    document.dispatchEvent(new CustomEvent('jein:analytics', { detail: ev }));
  }
  const trackOnce = (k, name, props) => { if (!sentEvents.has(k)){ sentEvents.add(k); track(name, props); } };

  /* ---------- elements ---------- */
  const cards = q('#cx-cards'), confirmEl = q('#cx-confirm'), form = q('#cx-form'), cardsWrap = q('#cx-cards-wrap');
  const nextBtn = q('#cx-next'), backBtn = q('#cx-back'), msg = q('#cx-msg'), done = q('#cx-done');
  const openedAt = Date.now();
  let sending = false, submitted = false;

  /* ---------- build static options ---------- */
  cards.insertAdjacentHTML('beforeend', C.PATH_ORDER.map((k,i) => {
    const p = C.PATHS[k];
    return `<label class="cx-card" style="--i:${i}">
      <input type="radio" name="cx-path" id="cx-path-${k}" value="${k}">
      <span class="cx-ico">${svg(ICON[p.icon])}</span>
      <b>${p.label}</b><span class="d">${p.description}</span>
      <span class="cx-tick" aria-hidden="true">${svg('<path d="M5 12l5 5 9-10"/>')}</span>
    </label>`;
  }).join(''));
  const opt = (v, t) => { const o = document.createElement('option'); o.value = v; o.textContent = t; return o; };
  C.ROLES.forEach(r => q('#cx-role').append(opt(r, r === 'Other' ? 'Other (I’ll describe it)' : r.charAt(0).toLowerCase() + r.slice(1))));
  C.INDUSTRIES.forEach(r => q('#cx-industry').append(opt(r, r)));

  function buildPathParts(){
    const p = C.PATHS[state.path]; if (!p) return;
    const t = q('#cx-topic'); t.length = 1;
    p.topics.forEach(x => t.append(opt(x, x === 'Other' ? 'something else' : x.charAt(0).toLowerCase() + x.slice(1))));
    q('#cx-followups').innerHTML = p.followups.map(f => {
      const id = 'cx-fu-' + f.id, err = 'err-fu_' + f.id;
      let ctl;
      if (f.type === 'textarea') ctl = `<textarea id="${id}" data-fu="${f.id}" maxlength="1500" aria-describedby="${err}"></textarea>`;
      else if (f.type === 'select') ctl = `<select id="${id}" data-fu="${f.id}" aria-describedby="${err}"><option value="">Choose one (optional)</option>${f.options.map(o => `<option>${o}</option>`).join('')}</select>`;
      else ctl = `<input id="${id}" data-fu="${f.id}" type="${f.type === 'url' ? 'url' : 'text'}" ${f.type === 'url' ? 'inputmode="url" placeholder="https://"' : ''} maxlength="${f.type === 'url' ? 300 : 120}" aria-describedby="${err}">`;
      const other = f.type === 'select' ? `<div class="cx-reveal" id="wrap-fu_${f.id}Other" hidden><label for="${id}Other">Tell me more</label><input id="${id}Other" data-fu="${f.id}Other" maxlength="120" aria-describedby="err-fu_${f.id}Other"><p class="err" id="err-fu_${f.id}Other"></p></div>` : '';
      return `<div class="field"><label for="${id}">${f.label}</label>${ctl}<p class="err" id="${err}"></p>${other}</div>`;
    }).join('');
  }

  /* ---------- state ⇄ fields ---------- */
  const FIELDS = ['name','role','roleOther','company','industry','industryOther','topic','topicOther','email','linkedin','website','message'];
  function fillFields(){
    FIELDS.forEach(f => { const el = q('#cx-' + f); if (el) el.value = state[f] || ''; });
    form.querySelectorAll('[data-fu]').forEach(el => { el.value = state.followups[el.dataset.fu] || ''; });
    q('#cx-rm-' + (state.responseMethod === 'linkedin' ? 'linkedin' : 'email')).checked = true;
    q('#cx-privacy').checked = !!state.privacyAccepted;
    const r = q('#cx-path-' + state.path); if (r) r.checked = true;
    q('#cx-counter').textContent = (state.message || '').length + ' / 3000';
    reveals();
  }
  function reveals(){
    q('#wrap-roleOther').hidden = state.role !== 'Other';
    q('#wrap-industryOther').hidden = state.industry !== 'Other';
    q('#wrap-topicOther').hidden = state.topic !== 'Other';
    form.querySelectorAll('select[data-fu]').forEach(s => { const w = q('#wrap-fu_' + s.dataset.fu + 'Other'); if (w) w.hidden = s.value !== 'Other'; });
    const individual = C.INDIVIDUAL_ROLES.includes(state.role);
    q('#cx-company-hint').textContent = individual ? 'optional · skip it if you’re not with one' : 'optional';
  }
  form.addEventListener('input', e => {
    const el = e.target;
    if (el.dataset.fu) state.followups[el.dataset.fu] = el.value;
    else if (el.name === 'responseMethod') state.responseMethod = el.value;
    else if (el.id === 'cx-privacy') state.privacyAccepted = el.checked;
    else if (el.id && el.id.startsWith('cx-') && FIELDS.includes(el.id.slice(3))) state[el.id.slice(3)] = el.value;
    if (el.id === 'cx-message') q('#cx-counter').textContent = el.value.length + ' / 3000';
    if (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'radio') reveals();
    clearErr(el);
    save();
    if (state.step === LAST) renderReview();
  });
  form.addEventListener('change', e => { if (e.target.tagName === 'SELECT') { reveals(); } });

  /* ---------- cards ---------- */
  function choosePath(k, opts){
    if (!C.PATHS[k]) return;
    const changed = state.path && state.path !== k;
    state.path = k;
    if (changed || !C.PATHS[k].topics.includes(state.topic)) { state.topic = ''; state.topicOther = ''; state.followups = {}; }
    buildPathParts(); fillFields();
    q('#cx-confirm-label').textContent = 'Your path · ' + C.PATHS[k].label;
    q('#cx-confirm-copy').textContent = C.PATHS[k].confirm;
    confirmEl.hidden = false;
    q('#cx-change-path').textContent = C.PATHS[k].label;
    save();
    if (!opts || !opts.silent) track('card_selected', { connection_type: k });
  }
  cards.addEventListener('change', e => { if (e.target.name === 'cx-path') choosePath(e.target.value); });
  q('#cx-start').addEventListener('click', () => {
    trackOnce('started', 'form_started', { connection_type: state.path });
    goStep(state.step >= 1 && state.step <= LAST ? state.step : 1, true);
  });
  q('#cx-change-path').addEventListener('click', () => goStep(0, true));

  /* ---------- steps ---------- */
  function goStep(n, focus){
    state.step = n; save();
    clearAllErr(); setMsg('');
    const inForm = n >= 1;
    cardsWrap.hidden = inForm; form.hidden = !inForm; done.hidden = true;
    if (!inForm){
      const r = q('#cx-path-' + state.path);
      if (focus){ (r || cards.querySelector('input')).focus({ preventScroll: true }); reveal(q('#connect')); }
      return;
    }
    form.querySelectorAll('.cx-step').forEach(s => { s.hidden = +s.dataset.step !== n; });
    q('#cx-step-count').textContent = `Step ${n} of ${LAST} · ${STEP_NAMES[n]}`;
    q('#cx-step-title').textContent = `Step ${n} of ${LAST}: ${STEP_NAMES[n]}`;
    form.querySelectorAll('.cx-dots li').forEach((li,i) => { li.className = i + 1 < n ? 'on' : i + 1 === n ? 'now' : ''; });
    nextBtn.innerHTML = n === LAST ? 'Send my introduction <span class="arr" aria-hidden="true">→</span>' : 'Continue <span class="arr" aria-hidden="true">→</span>';
    backBtn.textContent = n === 1 ? '← Change path' : '← Back';
    if (n === LAST) renderReview();
    if (focus){ q('#cx-step-title').focus({ preventScroll: true }); reveal(form); }
  }
  function reveal(el){
    const r = el.getBoundingClientRect();
    if (r.top < 70 || r.top > innerHeight * 0.6) el.scrollIntoView({ behavior: RM.matches ? 'auto' : 'smooth', block: 'start' });
  }
  backBtn.addEventListener('click', () => goStep(Math.max(0, state.step - 1), true));
  q('#cx-edit').addEventListener('click', () => goStep(1, true));

  /* ---------- errors ---------- */
  function fieldFor(key){
    if (key.startsWith('fu_')) return q('#cx-fu-' + key.slice(3));
    if (key === 'privacyAccepted') return q('#cx-privacy');
    return q('#cx-' + key);
  }
  function showErrors(errs){
    let first = null;
    Object.keys(errs).forEach(k => {
      const el = fieldFor(k), box = q('#err-' + k);
      if (box) box.textContent = errs[k];
      if (el){ el.setAttribute('aria-invalid', 'true'); const w = el.closest('.cx-inline'); if (w) w.dataset.invalid = 'true'; if (!first) first = el; }
    });
    if (first) first.focus();
  }
  function clearErr(el){
    if (!el || !el.id) return;
    el.removeAttribute('aria-invalid');
    const w = el.closest('.cx-inline'); if (w) w.dataset.invalid = 'false';
    const key = el.dataset.fu ? 'fu_' + el.dataset.fu : el.id === 'cx-privacy' ? 'privacyAccepted' : el.id.replace(/^cx-/, '');
    const box = q('#err-' + key); if (box) box.textContent = '';
  }
  function clearAllErr(){
    form.querySelectorAll('.err').forEach(e => e.textContent = '');
    form.querySelectorAll('[aria-invalid]').forEach(e => e.removeAttribute('aria-invalid'));
    form.querySelectorAll('.cx-inline').forEach(w => w.dataset.invalid = 'false');
  }
  function setMsg(text, tone, html){ msg.dataset.tone = tone || ''; if (html) msg.innerHTML = html; else msg.textContent = text; }

  /* ---------- review ---------- */
  function renderReview(){
    const d = C.normalize(state), s = C.summary(d);
    const box = q('#cx-review'); box.textContent = '';
    const intro = document.createElement('p'); intro.className = 'intro'; intro.textContent = s.introduction; box.append(intro);
    const dl = document.createElement('dl');
    const row = (k, v, step) => {
      if (!v) return;
      const dt = document.createElement('dt'); dt.textContent = k;
      const dd = document.createElement('dd'); dd.textContent = v;
      if (step){ const b = document.createElement('button'); b.type = 'button'; b.className = 'edit'; b.textContent = 'Edit'; b.setAttribute('aria-label', 'Edit ' + k.toLowerCase()); b.addEventListener('click', () => goStep(step, true)); dd.append(' ', b); }
      dl.append(dt, dd);
    };
    row('Connection type', s.connectionType);
    row('Topic', C.topicText(d), 1);
    row('Role', C.roleText(d), 1);
    row('Company', d.company, 1);
    row('Industry', d.industry === 'Other' ? d.industryOther : d.industry, 1);
    s.followups.forEach(f => row(f.question, f.answer, 1));
    row('Message', s.message, 2);
    row('Email', s.contact.email, 2);
    row('LinkedIn', s.contact.linkedin, 2);
    row('Website / project', s.contact.website, 2);
    row('Reply by', s.contact.responseMethod, 2);
    row('Privacy notice', s.consent.privacyAccepted ? 'Acknowledged' : 'Not yet acknowledged');
    box.append(dl);
  }

  /* ---------- delivery backend (claude.ai page store) ---------- */
  let db = null, uid = null, canWrite = null, backendReady = false;
  const deliveryNote = q('#cx-delivery');
  (async () => {
    try {
      if (window.claude && window.claude.use){
        const [d, u] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
        db = d;
        if (u){ uid = await u.id(); try { canWrite = await u.can('data.write'); } catch(e){} }
      }
    } catch(e){}
    backendReady = true;
    if (!db || !uid || canWrite === false){
      deliveryNote.innerHTML = '<b>Sending isn’t available in this view.</b> You can still write your introduction; it stays saved in this browser, and you can copy it at the end.';
    }
  })();

  async function send(){
    if (sending) return;
    const d = C.normalize(state);
    if (q('#cx-company-url').value){ finish(d, true); return; }                       // honeypot: quietly drop
    if (Date.now() - openedAt < 5000){ setMsg('That was quick. Give it a few seconds and send again.', 'bad'); return; }
    const errs = C.validateAll(d);
    if (Object.keys(errs).length){
      const stepOf = k => k === 'path' ? 0 : ['email','linkedin','website','privacyAccepted','submissionId'].includes(k) ? 2 : 1;
      const first = Math.min(...Object.keys(errs).map(stepOf));
      track('validation_error', { step: LAST, fields: Object.keys(errs).join(',') });
      goStep(first, false); showErrors(errs); return;
    }
    const last = +(store.get(SENT_KEY) || 0);
    if (Date.now() - last < 60000){ setMsg('You sent an introduction less than a minute ago. Try again shortly.', 'bad'); return; }
    /* Self-hosted deployment: post to the serverless endpoint (server/handler.mjs) instead of the page store. */
    const endpoint = window.JEIN_CONTACT_ENDPOINT;
    if (endpoint){
      sending = true; nextBtn.disabled = true; backBtn.disabled = true; nextBtn.textContent = 'Sending…'; setMsg('Sending your introduction…');
      try {
        const r = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify(Object.assign({}, d, { company_url: q('#cx-company-url').value, turnstileToken: window.JEIN_TURNSTILE_TOKEN || '' })) });
        const j = await r.json().catch(() => ({}));
        if (r.ok && j.ok){ store.set(SENT_KEY, String(Date.now())); track('submission_success', { connection_type: d.path }); finish(d); }
        else if (r.status === 422 && j.errors){ track('validation_error', { step: 5, fields: Object.keys(j.errors).join(',') }); setMsg('Some answers need another look.', 'bad'); renderReview(); }
        else if (r.status === 429) setMsg('Too many introductions from this connection. Try again in an hour; your answers are saved.', 'bad');
        else setMsg('Your introduction couldn’t be delivered, so nothing was sent. Your answers are all still here. Press Send again in a moment.', 'bad');
      } catch(e){ setMsg('You appear to be offline. Your answers are saved; press Send again when you’re connected.', 'bad'); }
      finally { sending = false; nextBtn.disabled = false; backBtn.disabled = false; if (!submitted) goStepButtonsOnly(); }
      return;
    }
    if (!backendReady){ setMsg('Still connecting. Try again in a moment.', 'bad'); return; }
    if (!db || !uid || canWrite === false){
      setMsg('', 'bad', 'Your introduction can’t be sent from this view. Your answers are saved in this browser.<button type="button" class="cx-link" id="cx-copy">Copy my introduction</button>');
      q('#cx-copy').addEventListener('click', async () => {
        const text = C.emailText(d, { submittedAt: new Date().toISOString() });
        try { await navigator.clipboard.writeText(text); setMsg('Copied. Paste it into an email once contact details are published.', 'ok'); }
        catch(e){ setMsg('Copy isn’t available here. Select the review text above and copy it.', 'bad'); }
      });
      return;
    }
    sending = true; nextBtn.disabled = true; backBtn.disabled = true;
    nextBtn.textContent = 'Sending…'; setMsg('Sending your introduction…');
    const submittedAt = new Date().toISOString();
    const record = Object.assign({}, d, { submittedAt, source: C.SOURCE, schema: 1, connectionLabel: C.PATHS[d.path].label });
    try {
      await db.doc('inquiries/' + uid).set({ lastSubmissionAt: submittedAt });
      await db.collection('inquiries/' + uid + '/messages').doc(d.submissionId).set(record);   // same id on retry: no duplicates
      store.set(SENT_KEY, String(Date.now()));
      track('submission_success', { connection_type: d.path });
      finish(d, false);
    } catch(err){
      setMsg('Your introduction couldn’t be saved, so nothing was sent. Your answers are all still here. Check your connection and press Send again.', 'bad');
    } finally {
      sending = false; nextBtn.disabled = false; backBtn.disabled = false;
      if (!submitted) goStepButtonsOnly();
    }
  }
  function goStepButtonsOnly(){ nextBtn.innerHTML = 'Send my introduction <span class="arr" aria-hidden="true">→</span>'; }

  function finish(d){
    submitted = true;
    q('#cx-done-name').textContent = d.name ? ', ' + d.name.split(/\s+/)[0] : '';
    q('#cx-done-method').textContent = d.responseMethod === 'linkedin' ? 'LinkedIn' : 'email';
    q('#cx-done-ref').textContent = d.submissionId;
    store.del(DRAFT_KEY);
    state = fresh();
    form.hidden = true; cardsWrap.hidden = true; done.hidden = false; setMsg('');
    done.focus({ preventScroll: true }); reveal(done);
  }
  q('#cx-again').addEventListener('click', () => {
    submitted = false; sentEvents.delete('started');
    cards.querySelectorAll('input').forEach(i => i.checked = false);
    confirmEl.hidden = true; fillFieldsSafe(); goStep(0, true);
  });
  function fillFieldsSafe(){ q('#cx-followups').innerHTML = ''; FIELDS.forEach(f => { const el = q('#cx-' + f); if (el) el.value = ''; }); q('#cx-privacy').checked = false; }

  /* ---------- Continue / Send ---------- */
  form.addEventListener('submit', e => {
    e.preventDefault();
    const n = state.step;
    if (n === LAST){ send(); return; }
    const nd = C.normalize(state);
    const errs = Object.assign({}, C.validateStep(1, nd), C.validateStep(2, nd), C.validateStep(3, nd));
    if (Object.keys(errs).length){ showErrors(errs); track('validation_error', { step: n, fields: Object.keys(errs).join(',') }); return; }
    track('step_completed', { step: n, connection_type: state.path });
    goStep(n + 1, true);
  });

  /* abandonment: started but not sent when the page is hidden or left */
  const abandon = () => { if (sentEvents.has('started') && !submitted && state.step >= 1) trackOnce('abandoned', 'form_abandoned', { step: state.step, connection_type: state.path }); };
  addEventListener('pagehide', abandon);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') abandon(); });

  /* ---------- entry points: buttons elsewhere on the page and #connect-<path> links ---------- */
  function enter(path){
    if (window.JEINRouter && window.JEINRouter.current() !== 'contact') window.JEINRouter.go('connect');
    if (C.PATHS[path]) choosePath(path);
    if (state.step >= 1 && C.PATHS[state.path]) goStep(state.step, true);
    else { goStep(0, false); q('#connect').scrollIntoView({ behavior: RM.matches ? 'auto' : 'smooth', block: 'start' });
      setTimeout(() => { const r = q('#cx-path-' + state.path) || cards.querySelector('input'); r.focus({ preventScroll: true }); }, RM.matches ? 0 : 500); }
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-inquiry]');
    if (!b) return;
    e.preventDefault();
    if (b.dataset.msg && !state.message){ state.message = b.dataset.msg; save(); }
    enter(LEGACY[b.dataset.inquiry] || b.dataset.inquiry);
  });
  function fromHash(){ const m = /^#connect-([a-z]+)$/.exec(location.hash); if (m && C.PATHS[m[1]]) enter(m[1]); }
  addEventListener('hashchange', fromHash);

  /* ---------- restore ---------- */
  if (C.PATHS[state.path]){ choosePath(state.path, { silent: true }); }
  fillFields();
  if (state.step >= 1 && C.PATHS[state.path]) goStep(state.step, false); else goStep(0, false);
  fromHash();
})();

