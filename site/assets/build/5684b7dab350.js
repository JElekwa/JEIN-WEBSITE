
/* ---------- pages, What's New and interlinking (v0.4) ---------- */
(() => {
  const q = s => document.querySelector(s), qa = s => [...document.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const escH = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  /* ---------- social profiles (single source for footer, contact, What's New) ---------- */
  const ICONS = {
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
    linkedin: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10.5V16M8 7.6v.1M11.5 16v-3.2a2.3 2.3 0 0 1 4.5 0V16M11.5 10.5V16"/>',
    facebook: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M15.5 7.5h-1.8a2 2 0 0 0-2 2V21M9.5 13h5"/>',
    leaf: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14z"/><path d="M5 19l7-7"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    github: '<path d="M9 19c-4 1.5-4-2-6-2.5M15 21v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>',
    pen: '<path d="M12 19l7-7 3 3-7 7z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18z"/><path d="M2 2l7.6 7.6"/><circle cx="11" cy="11" r="2"/>'
  };
  const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  /* SOCIALS lives in the CONTENT block at the top of the first script */
  const ext = 'target="_blank" rel="noopener"';
  function renderSocials(){
    const live = SOCIALS.filter(s => s.href);
    const soon = SOCIALS.filter(s => !s.href);
    qa('[data-socials]').forEach(el => {
      const kind = el.dataset.socials;
      const soonHtml = el.hasAttribute('data-socials-soon') ? soon.map(s => `<span class="soc-pill is-soon" title="${s.name}: coming soon"><i>${svg(ICONS[s.icon])}</i>${s.name} · coming soon</span>`).join('') : '';
      el.innerHTML = live.map(s => {
        const mail = s.href.startsWith('mailto:');
        const tgt = mail ? '' : ext, label = mail ? `Email ${s.handle || 'Joshua'}` : `${s.name} (opens in a new tab)`;
        if (kind === 'cards') return `<a class="soc-card" href="${s.href}" ${tgt} style="--c:${s.c}" aria-label="${label}"><span class="soc-ico">${svg(ICONS[s.icon])}</span><b>${s.name}</b><span class="h">${s.handle}</span><p>${s.desc}</p></a>`;
        if (kind === 'icons') return `<a class="soc-icon" href="${s.href}" ${tgt} style="--c:${s.c}" aria-label="${label}">${svg(ICONS[s.icon])}</a>`;
        return `<a class="soc-pill" href="${s.href}" ${tgt} style="--c:${s.c}" aria-label="${label}"><i>${svg(ICONS[s.icon])}</i>${s.name}</a>`;
      }).join('') + soonHtml;
    });
    /* About mirrors the Community page's involvement list, so there is one source to edit */
    const srcList = q('#community-list');
    qa('[data-mirror="community-list"]').forEach(el => { if (srcList) el.innerHTML = srcList.innerHTML; });
  }

  /* Appropedia projects now live in PROJECTS (CONTENT block), so direct links to them work */

  /* ---------- What's New feed ---------- */
  /* FEED lives in the CONTENT block */
  let feedFilter = 'All';
  function feedCard(f){
    return `<article class="wn-item${f.pending ? ' pending' : ''}">
      <div class="wn-cover" style="--bg:${f.cover.bg};--fg:${f.cover.fg}">${f.image ? `<img src="${f.image}" alt="" loading="lazy">` : ''}<span class="k">${escH(f.type)}</span></div>
      <div class="wn-body"><span class="wn-meta">${escH(f.meta || '')}</span><h3>${escH(f.title)}</h3><p>${escH(f.summary)}</p>
      <a class="go" href="${f.href}" ${f.external ? ext : ''}>${escH(f.cta || (f.external ? 'Open' : 'Read the case study'))} <span aria-hidden="true">${f.external ? '↗' : '→'}</span></a></div>
    </article>`;
  }
  function renderFeeds(){
    qa('[data-feed]').forEach(el => {
      const n = el.dataset.feed === 'all' ? Infinity : +el.dataset.feed;
      const items = FEED.filter(f => el.dataset.feed !== 'all' || feedFilter === 'All' || f.type === feedFilter).slice(0, n);
      el.innerHTML = items.length ? items.map(feedCard).join('') : '<div class="empty" style="grid-column:1/-1"><b>Nothing here yet</b><span>New items will appear as they are published.</span></div>';
    });
    const types = ['All', ...new Set(FEED.map(f => f.type))];
    const fb = q('#wn-filters');
    if (fb) fb.innerHTML = types.map(t => `<button type="button" class="filter" data-wn="${t}" aria-pressed="${t === feedFilter}">${t}</button>`).join('');
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-wn]'); if (b){ feedFilter = b.dataset.wn; renderFeeds(); } });

  /* ---------- router: one page visible at a time ---------- */
  const ORDER = ['home','about','projects','playbook','community','whats-new','contact'];
  const LABEL = { home:'Home', about:'About', projects:'Projects', playbook:'O2O Playbook', community:'Community', 'whats-new':'What’s New', contact:'Contact', privacy:'Privacy notice', awards:'Awards and Recognition', search:'Search', notfound:'Page not found' };
  /* one natural, accurate description per page (set on <meta name="description"> when the page is shown) */
  const META = {
    home: 'J.E.I.N. — Joshua Elekwa Interactive Network. Business, technology, e-commerce and community projects, and how better systems and practical execution create value.',
    about: 'About Joshua Elekwa: a business-minded technology enthusiast and entrepreneur working across e-commerce, operations, web development and information systems.',
    projects: 'Projects by Joshua Elekwa across business transformation, e-commerce, product and IT systems, web and digital marketing, competitions and community impact.',
    playbook: 'O2O Playbook: where online commerce meets real-world operations — e-commerce, logistics, automation and entrepreneurship.',
    community: 'Community work, volunteering and social-impact projects by Joshua Elekwa, plus Seven Figure Employee, a peer-learning community for professionals.',
    'whats-new': 'What’s New at J.E.I.N.: case studies, articles from the J.E.I.N. hub, and where to follow Joshua Elekwa.',
    contact: 'Connect with Joshua Elekwa about roles, project collaboration, business and e-commerce, the O2O Playbook or the Seven Figure Employee community.',
    privacy: 'How the J.E.I.N. website uses the details you share through the contact form.',
    awards: 'Verified awards and recognition for Joshua Elekwa and the teams he has been part of, including Project Stoke and X-Culture 2020.',
    search: 'Search the J.E.I.N. website: projects and case studies, What’s New, O2O Playbook episodes and awards.',
    notfound: 'This page could not be found on the J.E.I.N. website.'
  };
  const RELATED = {
    home: [['#whats-new','What’s new'],['#projects','Projects'],['#connect','Start a conversation']],
    about: [['#strategy','Business & strategy'],['#technology','Technology & systems'],['#projects','See the projects']],
    projects: [['#whats-new','Case studies'],['#community','Community work'],['#connect-collaborate','Collaborate']],
    playbook: [['#whats-new','Latest articles'],['#connect-media','Pitch a guest feature']],
    community: [['#seven-figure-employee','Seven Figure Employee'],['#connect-community','Join the community']],
    'whats-new': [['#projects','All projects'],['#connect','Start a conversation']],
    contact: [['#about','About Joshua'],['#whats-new','What’s new']],
    privacy: [['#contact','Contact'],['#home','Home']],
    awards: [['#projects','Projects'],['#about','About'],['#community','Community']]
  };
  const pages = qa('[data-page]');
  pages.forEach(p => {
    const id = p.dataset.page, i = ORDER.indexOf(id);
    if (id === 'notfound') return;
    const prev = i > 0 ? ORDER[i - 1] : null, next = i > -1 && i < ORDER.length - 1 ? ORDER[i + 1] : null;
    const nav = document.createElement('nav');
    nav.className = 'pg-nav'; nav.setAttribute('aria-label', 'More pages');
    nav.innerHTML = `<div class="wrap">
      ${prev ? `<a class="pg prev" href="#${prev}"><span class="mono">← Previous</span><b>${LABEL[prev]}</b></a>` : '<span></span>'}
      <div class="pg-related">${(RELATED[id] || []).map(([h,t]) => `<a href="${h}">${t}</a>`).join('')}</div>
      ${next ? `<a class="pg next" href="#${next}"><span class="mono">Next →</span><b>${LABEL[next]}</b></a>` : '<span></span>'}
    </div>`;
    p.append(nav);
  });

  function pageFor(hash){
    if (!hash || hash === 'home' || hash === 'main') return 'home';
    if (hash.startsWith('p-'))                                    // project detail (handled by the case-study view)
      return (typeof PROJECTS !== 'undefined' && PROJECTS.some(p => p.slug === hash.slice(2))) ? null : 'notfound';
    if (hash.startsWith('ep-'))                                   // O2O episode page (same detail view)
      return (typeof EPISODES !== 'undefined' && EPISODES.some(e => e.slug === hash.slice(3))) ? null : 'notfound';
    if (/^connect(-[a-z]+)?$/.test(hash)) return 'contact';
    const el = document.getElementById(hash);
    const host = el && el.closest('[data-page]');
    return host ? host.dataset.page : 'notfound';                 // unknown address: branded 404 instead of Home
  }
  let current = null;
  function show(page, targetId){
    if (!page) { current = null; pages.forEach(p => p.hidden = true); qa('[data-nav]').forEach(a => a.removeAttribute('aria-current')); return; }
    const changed = page !== current;
    current = page;
    pages.forEach(p => p.hidden = p.dataset.page !== page);
    const navKey = page === 'whats-new' ? 'whats-new' : page;
    qa('[data-nav]').forEach(a => a.setAttribute('aria-current', a.dataset.nav === navKey ? 'page' : 'false'));
    qa('[data-rail]').forEach(a => {
      const railPage = pageFor(a.dataset.rail);
      a.setAttribute('aria-current', railPage === page && (!targetId || a.dataset.rail === targetId || page !== 'about') ? 'true' : 'false');
    });
    setMeta(page === 'home' ? 'J.E.I.N. — Joshua Elekwa' : `${LABEL[page]} · J.E.I.N.`, META[page]);
    const host = q(`[data-page="${page}"]`);
    const t = targetId && document.getElementById(targetId);
    const first = host && host.querySelector('section');
    requestAnimationFrame(() => {
      if (t && t !== first && host.contains(t)) t.scrollIntoView({ behavior: changed || RM.matches ? 'instant' : 'smooth', block: 'start' });
      else if (changed) window.scrollTo({ top: 0, behavior: 'instant' });
      if (changed && host){
        const h = host.querySelector('h1, h2');
        if (page === 'search'){ const si = q('#site-q'); if (si) si.focus({ preventScroll: true }); }
        else if (h && page !== 'home'){ h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
      }
      document.dispatchEvent(new CustomEvent('jein:page', { detail: { page } }));
    });
  }
  function route(){
    const h = decodeURIComponent(currentHash());
    const page = pageFor(h);
    if (page === null){ show(null); return; }
    if (q('#detail-view') && !q('#detail-view').hidden) return;  // case-study route restores the home view first
    show(page, h && page !== 'home' ? h : (h === 'home-whats-new' || h === 'journey' ? h : null));
  }
  /* multi-page mode: real paths for every page, case study and episode */
  const PAGE_PATH = { home:'', about:'about/', projects:'projects/', playbook:'o2o-playbook/', community:'community/', 'whats-new':'whats-new/',
    contact:'contact/', privacy:'privacy/', awards:'awards/', search:'search/', notfound:'404.html' };
  function pathFor(hash){
    const base = (MP && MP.base) || '/';
    if (!hash || hash === 'home') return base;
    if (hash.startsWith('p-')) return base + 'projects/' + hash.slice(2) + '/';
    if (hash.startsWith('ep-')) return base + 'o2o-playbook/' + hash.slice(3) + '/';
    const page = pageFor(hash);
    if (!page || page === 'notfound') return null;
    return base + PAGE_PATH[page] + (hash === page || (page === 'playbook' && hash === 'playbook') ? '' : '#' + hash);
  }
  window.JEINRouter = {
    go(hash){
      if (MP){ const to = pathFor(hash); if (to && to.split('#')[0] !== location.pathname){
        setTimeout(() => { location.href = to; }, 250);   // lets the contact draft (saved after 200 ms) keep a card chosen on this page
        return; } }
      if (location.hash.slice(1) !== hash){ location.hash = hash; } route();
    },
    current: () => current, pageFor, pathFor
  };
  if (MP){
    const rewrite = scope => scope.querySelectorAll && scope.querySelectorAll('a[href^="#"]').forEach(a => {
      const hash = a.getAttribute('href').slice(1);
      if (!hash || hash === 'main' || a.hasAttribute('data-jump')) return;
      const to = pathFor(hash); if (to) a.setAttribute('href', to);
    });
    rewrite(document);
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) rewrite(n.parentNode || n); })))
      .observe(document.body, { childList: true, subtree: true });
  }
  addEventListener('hashchange', () => setTimeout(route, 0));

  renderSocials(); renderFeeds();
  if (typeof renderFilters === 'function'){ renderFilters(); renderGrid(); }
  route();
})();

