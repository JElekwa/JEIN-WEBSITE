
/* ---------- scroll journey (v0.2) — reuses PROJECTS, STATUS_LABEL, catLabel, esc from above ---------- */
(() => {
  const jx = document.getElementById('jx-journey') || document.getElementById('journey');
  const track = document.getElementById('jx-track'), stage = document.getElementById('jx-stage');
  const scenes = [...jx.querySelectorAll('.jx-scene')], stops = [...jx.querySelectorAll('.jx-stop')];
  const mqWide = matchMedia('(min-width: 900px) and (min-height: 600px)');
  const mqRM = matchMedia('(prefers-reduced-motion: reduce)');
  const N = scenes.length;
  let pinned = false, active = -1, ticking = false;

  /* floating project cards built from the same project data as the portfolio */
  const spots = [
    {l:2,t:4,d:70,r:-4},{l:56,t:0,d:110,r:3},{l:0,t:62,d:95,r:2},
    {l:58,t:66,d:60,r:-3},{l:30,t:-6,d:140,r:-2},{l:34,t:80,d:125,r:4}
  ];
  document.getElementById('fcards').innerHTML = PROJECTS.slice(0,6).map((p,i) => {
    const s = spots[i];
    return `<a class="fcard ${i%2?'drift b':'drift'}" href="#p-${p.slug}" style="left:${s.l}%;top:${s.t}%;--d:${s.d};--r:${s.r}deg;--sw:${p.cover.bg}">
      <span class="sw" aria-hidden="true"></span>
      <span class="fc-cat">${esc(catLabel(p.category))}</span>
      <b>${esc(p.name)}</b>
      <span class="status" data-s="${p.status}">${STATUS_LABEL[p.status]}</span>
    </a>`;
  }).join('');

  function setActive(i){
    if (i === active) return;
    active = i;
    scenes.forEach((s,k) => {
      s.classList.toggle('is-active', k === i);
      s.inert = pinned && k !== i;
    });
    stops.forEach((b,k) => b.setAttribute('aria-current', k === i ? 'step' : 'false'));
    jx.style.setProperty('--scene-bg', scenes[i].dataset.bg);
  }
  function span(){ return Math.max(1, track.offsetHeight - stage.offsetHeight); }
  function layout(){
    pinned = mqWide.matches && !mqRM.matches;
    jx.classList.toggle('is-pinned', pinned);
    if (pinned){
      track.style.height = Math.round(stage.offsetHeight + (N - 1) * innerHeight * 0.85) + 'px';
    } else {
      track.style.height = '';
      jx.style.removeProperty('--scene-bg');
      scenes.forEach(s => { s.inert = false; s.style.setProperty('--t', .5); s.style.backgroundColor = ''; });
    }
    active = -1;
    update();
  }
  function update(){
    ticking = false;
    if (document.getElementById('home-view').hidden || jx.offsetParent === null) return;
    if (pinned){
      const top = track.getBoundingClientRect().top;
      const stickyTop = parseFloat(getComputedStyle(stage).top) || 0;
      const f = Math.min(1, Math.max(0, (stickyTop - top) / span()));
      const x = f * N, i = Math.min(N - 1, Math.floor(x));
      setActive(i);
      scenes[i].style.setProperty('--t', Math.min(1, x - i).toFixed(3));
      stops.forEach((b,k) => b.style.setProperty('--fill', Math.min(1, Math.max(0, x - k)).toFixed(3)));
    } else {
      let best = 0, bestD = Infinity;
      scenes.forEach((s,k) => {
        const r = s.getBoundingClientRect();
        if (!mqRM.matches) s.style.setProperty('--t', Math.min(1, Math.max(0, 1 - (r.bottom) / (innerHeight + r.height))).toFixed(3));
        const d = Math.abs(r.top + r.height / 2 - innerHeight / 2);
        if (d < bestD){ bestD = d; best = k; }
      });
      stops.forEach((b,k) => b.setAttribute('aria-current', k === best ? 'step' : 'false'));
    }
  }
  const onScroll = () => { if (!ticking){ ticking = true; requestAnimationFrame(update); } };
  addEventListener('scroll', onScroll, {passive:true});
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layout, 120); });
  [mqWide, mqRM].forEach(m => m.addEventListener ? m.addEventListener('change', layout) : m.addListener(layout));
  addEventListener('hashchange', () => setTimeout(layout, 30));
  document.addEventListener('jein:page', e => { if (e.detail.page === 'home') setTimeout(layout, 30); });

  /* chapter stops jump to their scene */
  stops.forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.go;
    const behavior = mqRM.matches ? 'auto' : 'smooth';
    if (pinned){
      const trackTop = track.getBoundingClientRect().top + scrollY;
      const stickyTop = parseFloat(getComputedStyle(stage).top) || 0;
      scrollTo({top: trackTop - stickyTop + span() * ((i + 0.08) / N), behavior});
      setTimeout(() => { const h = scenes[i].querySelector('h3'); h.setAttribute('tabindex','-1'); h.focus({preventScroll:true}); }, behavior === 'smooth' ? 700 : 0);
    } else {
      scenes[i].scrollIntoView({behavior, block:'start'});
    }
  }));

  /* gentle pointer parallax on fine pointers only */
  if (matchMedia('(pointer: fine)').matches){
    stage.addEventListener('pointermove', e => {
      if (!pinned) return;
      const r = stage.getBoundingClientRect();
      stage.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
    });
    stage.addEventListener('pointerleave', () => stage.style.setProperty('--mx', 0));
  }

  layout();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
})();
