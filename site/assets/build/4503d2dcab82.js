
/* ---------- v0.5: portrait (hero + About) and the ventures / programs strip ---------- */
(() => {
  const RM = matchMedia('(prefers-reduced-motion: reduce)');

  /* Joshua's own photos, supplied by him. The first is shown by default; pressing the portrait switches. */
  const PORTRAITS = ['/assets/build/29f527a59e69.webp', '/assets/build/177c849d55b9.webp'];
  const ALT = 'Portrait of Joshua Elekwa';
  const ORBIT = [['0deg', 'var(--plum)'], ['130deg', 'var(--terracotta)'], ['245deg', 'var(--sage)']];
  document.querySelectorAll('[data-portrait]').forEach(slot => {
    slot.innerHTML = `<button type="button" class="portrait-btn" aria-label="${ALT}. Press to see another photo.">
      <span class="portrait-glow" aria-hidden="true"></span>
      <span class="portrait-orbit" aria-hidden="true">${ORBIT.map(([o, c]) => `<i style="--o:${o};--c:${c}"></i>`).join('')}</span>
      <span class="portrait-ring" aria-hidden="true"></span>
      <span class="portrait-frame">${PORTRAITS.map((src, i) => `<img src="${src}" alt="${ALT}" width="560" height="560" decoding="async"${i === 0 ? ' class="on"' : ''}>`).join('')}</span>
      <span class="portrait-hint" aria-hidden="true">↻ Tap to switch</span>
    </button>`;
    const btn = slot.firstElementChild, imgs = [...btn.querySelectorAll('img')];
    let cur = 0;
    btn.addEventListener('click', () => {
      imgs[cur].classList.remove('on'); cur = (cur + 1) % imgs.length; imgs[cur].classList.add('on');
    });
    if (matchMedia('(pointer: fine)').matches){
      btn.addEventListener('pointermove', e => {
        if (RM.matches) return;
        const r = btn.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        btn.style.setProperty('--ty', (x * 14).toFixed(2) + 'deg'); btn.style.setProperty('--tx', (-y * 14).toFixed(2) + 'deg');
      });
      btn.addEventListener('pointerleave', () => { btn.style.setProperty('--tx', '0deg'); btn.style.setProperty('--ty', '0deg'); });
    }
  });

  /* ORGS lives in the CONTENT block */
  const cover = o => { if (o.bg) return { bg: o.bg, fg: o.fg || '#171717' };
    const p = typeof PROJECTS !== 'undefined' && PROJECTS.find(x => '#p-' + x.slug === o.href); return p ? p.cover : { bg: '#F0EBE1', fg: '#171717' }; };
  const initials = n => n.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const tile = (o, dup) => { const c = cover(o);
    return `<li><a class="org" href="${o.href}"${dup ? ' tabindex="-1"' : ''}><span class="org-mark" style="--bg:${c.bg};--fg:${c.fg}">${o.logo ? `<img src="${o.logo}" alt="${esc(o.name)} logo" loading="lazy">` : `<span aria-hidden="true">${initials(o.name)}</span>`}</span><b>${esc(o.name)}</b><span class="mono">${esc(o.rel)}</span></a></li>`; };
  document.querySelectorAll('[data-orgs]').forEach(track => {
    track.innerHTML = `<ul class="orgs-set">${ORGS.map(o => tile(o)).join('')}</ul><ul class="orgs-set" aria-hidden="true">${ORGS.map(o => tile(o, true)).join('')}</ul>`;
  });
})();
