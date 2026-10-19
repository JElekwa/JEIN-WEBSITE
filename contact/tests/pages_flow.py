"""Page routing, interlinking, What's New and footer checks in headless Chromium.
Usage: python3 tests/pages_flow.py /path/to/jein-site.html"""
import sys, pathlib
from playwright.sync_api import sync_playwright

PAGE = pathlib.Path(sys.argv[1]).read_text()
import tempfile
TMP = pathlib.Path(tempfile.gettempdir()) / 'jein-pages-test.html'
TMP.write_text('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
               '<style>[hidden]{display:none!important}</style></head><body>' + PAGE + '</body></html>')
URL = TMP.as_uri()
results = []
def check(name, cond, detail=''): results.append((name, bool(cond), detail))

with sync_playwright() as p:
    import os
    _exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
    _ch = os.environ.get('PW_CHANNEL')  # e.g. PW_CHANNEL=msedge to use the installed Edge instead of a downloaded Chromium
    b = p.chromium.launch(channel=_ch) if _ch else p.chromium.launch(executable_path=_exe) if os.path.exists(_exe) else p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1280, 'height': 900})
    ctx.route('http*://**/*', lambda r: r.abort())
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(500)
    visible = lambda: pg.evaluate("[...document.querySelectorAll('[data-page]')].filter(p=>!p.hidden).map(p=>p.dataset.page)")
    check('home shows only the home page', visible() == ['home'], str(visible()))
    check('home features What\'s New teaser', pg.is_visible('#home-whats-new') and pg.locator('#home-whats-new .wn-item').count() == 3)

    menu = {'about': 'about', 'projects': 'projects', 'playbook': 'playbook', 'community': 'community', 'whats-new': 'whats-new', 'contact': 'contact'}
    for nav, page in menu.items():
        pg.click(f'.nav a[data-nav="{nav}"]'); pg.wait_for_timeout(250)
        check(f'menu → {page} page', visible() == [page], str(visible()))
        check(f'menu marks {nav} current', pg.get_attribute(f'.nav a[data-nav="{nav}"]', 'aria-current') == 'page')
        check(f'{page} has prev/next interlinks', pg.locator(f'[data-page="{page}"] .pg-nav a').count() >= 2)
        check(f'{page}: scrolled to top', pg.evaluate('scrollY') < 5, str(pg.evaluate('scrollY')))

    pg.goto(URL + '#strategy'); pg.wait_for_timeout(400)
    check('#strategy opens About and scrolls to chapter 02', visible() == ['about'] and pg.evaluate("document.getElementById('strategy').getBoundingClientRect().top") < 200)

    # every chapter on the home journey links to its page
    pg.goto(URL); pg.wait_for_timeout(300)
    hrefs = pg.eval_on_selector_all('.jx-scene .jx-ctas a.btn-primary', 'a => a.map(x => x.getAttribute("href"))')
    targets = [pg.evaluate(f"(document.getElementById('{h[1:]}')||{{}}).closest ? document.getElementById('{h[1:]}').closest('[data-page]').dataset.page : null") for h in hrefs]
    check('journey chapters link to About/About/About/Projects/Community/Contact', targets == ['about', 'about', 'about', 'projects', 'community', 'contact'], str(targets))

    # footer: pages + chapters all resolve to a page
    for a in pg.eval_on_selector_all('footer nav a', 'a => a.map(x => x.getAttribute("href"))'):
        pg.goto(URL + a); pg.wait_for_timeout(200)
        v = visible()
        check(f'footer {a} → one page', len(v) == 1 or a.startswith('#p-'), str(v))
    check('footer has 4 social icons', pg.locator('footer .soc-icon').count() == 4)
    hrefs = pg.eval_on_selector_all('footer .soc-icon', 'a => a.map(x => x.href)')
    check('social links are the real profiles', set(hrefs) == {'https://jeinelekwa.base44.app/', 'https://ca.linkedin.com/in/joshuaelekwa', 'https://www.facebook.com/JoshuaJEIN/', 'https://www.appropedia.org/User:Joshua_Elekwa'}, str(hrefs))
    check('social links open in new tab safely', all(pg.eval_on_selector_all('footer .soc-icon', 'a => a.map(x => x.target==="_blank" && x.rel.includes("noopener"))')))

    # What's New page
    pg.goto(URL + '#whats-new'); pg.wait_for_timeout(300)
    check('What\'s New: 4 social cards', pg.locator('#whats-new .soc-card').count() == 4)
    n_all = pg.locator('#wn-feed .wn-item').count()
    pg.click('#wn-filters [data-wn="Case study"]'); pg.wait_for_timeout(100)
    n_cs = pg.locator('#wn-feed .wn-item').count()
    check('feed filter narrows to case studies', 0 < n_cs < n_all, f'{n_cs}/{n_all}')
    pg.click('#wn-feed a[href="#p-project-stoke"]'); pg.wait_for_timeout(400)
    check('case study opens project detail', pg.is_visible('#detail-view') and 'Project Stoke' in pg.inner_text('#detail-root h1'))
    check('detail shows verified result + source link', '2016 TD Entrepreneurship Regional Challenge' in pg.inner_text('#detail-root') and pg.locator('#detail-root a[href*="appropedia"]').count() == 1)
    crumbs = pg.eval_on_selector_all('#detail-root .crumbs li', 'l => l.map(x => x.innerText.trim())')
    check('breadcrumbs: Home › Projects › category › (parent) › project', crumbs == ['Home', 'Projects', 'Community and Social Impact', 'Enactus', 'Project Stoke'], str(crumbs))
    check('case study sets its own title + description', pg.title() == 'Project Stoke · J.E.I.N.' and 'Project Stoke' in pg.get_attribute('meta[name="description"]', 'content'))
    pg.click('#detail-root .crumbs a[data-crumb="category"]'); pg.wait_for_timeout(400)
    check('category crumb opens Projects filtered to that category', visible() == ['projects'] and pg.get_attribute('#filters [data-cat="community"]', 'aria-pressed') == 'true', str(visible()))
    pg.goto(URL + '#p-project-stoke'); pg.wait_for_timeout(400)
    pg.click('#detail-root .crumbs a[data-crumb="projects"]'); pg.wait_for_timeout(400)
    check('back from detail returns to Projects page', visible() == ['projects'] and pg.is_hidden('#detail-view'), str(visible()))
    check('portfolio has 22 projects (13 core + 9 Appropedia)', pg.locator('#grid .pcard').count() == 22, str(pg.locator('#grid .pcard').count()))
    labels = pg.eval_on_selector_all('#filters .filter', 'b => b.map(x => x.childNodes[0].textContent.trim())')
    check('category labels match the master list', labels == ['All', 'Business and Transformation', 'E-commerce and Commercial Ventures', 'Product, IT and Systems', 'Web, Design and Digital Marketing', 'Competitions and Business Case Studies', 'Community and Social Impact'], str(labels))
    pg.click('#filters [data-cat="entrepreneurship"]'); pg.wait_for_timeout(100)
    names = pg.eval_on_selector_all('#grid .pcard h3', 'h => h.map(x => x.innerText)')
    check('Vivacity and X-Culture are under Competitions', 'Vivacity Challenge' in names and 'X-Culture 2020' in names, str(names))
    pg.click('#filters [data-cat="all"]'); pg.wait_for_timeout(100)
    pg.click('#filters [data-cat="community"]'); pg.wait_for_timeout(100)
    check('community filter now has real projects', pg.locator('#grid .pcard').count() >= 5)

    # cross-page entry into the contact flow
    pg.goto(URL + '#community'); pg.wait_for_timeout(300)
    pg.click('[data-inquiry="community"]'); pg.wait_for_timeout(700)
    check('community "Register interest" opens contact with card selected', visible() == ['contact'] and pg.is_checked('#cx-path-community'))
    pg.goto(URL + '#connect-media'); pg.wait_for_timeout(700)
    check('#connect-media deep link preselects card', visible() == ['contact'] and pg.is_checked('#cx-path-media'))

    # phase 1: hero buttons, About subsections, 404, per-page meta, social slots, footer lockup
    pg.goto(URL); pg.wait_for_timeout(300)
    hero = pg.eval_on_selector_all('#home .hero-actions a', 'a => a.map(x => [x.innerText.replace("→","").trim(), x.getAttribute("href")])')
    check('hero buttons are exactly Explore / About / Connect', hero == [['Explore My Projects', '#projects'], ['About Me', '#about'], ['Connect With Me', '#connect']], str(hero))
    check('home sets its own description', 'Joshua Elekwa Interactive Network' in pg.get_attribute('meta[name="description"]', 'content'))
    pg.goto(URL + '#about'); pg.wait_for_timeout(300)
    check('About intro is the new narrative', pg.inner_text('#about .lead').startswith("I'm a business-minded technology enthusiast"))
    for sid in ['professional-background', 'approach', 'learning', 'ventures', 'community-volunteering']:
        check(f'About has #{sid}', pg.locator(f'[data-page="about"] #{sid}').count() == 1)
    check('About mirrors the community list', pg.locator('[data-mirror="community-list"] li').count() == pg.locator('#community-list li').count() == 5)
    vlinks = pg.eval_on_selector_all('#ventures a', 'a => a.map(x => x.getAttribute("href"))')
    check('About venture links all resolve to case studies', len(vlinks) == 8 and all(pg.evaluate(f'PROJECTS.some(p => "#p-" + p.slug === "{h}")') for h in vlinks), str(vlinks))
    descs = set()
    for page in ['about', 'projects', 'playbook', 'community', 'whats-new', 'contact', 'privacy']:
        pg.goto(URL + '#' + page); pg.wait_for_timeout(200)
        descs.add(pg.get_attribute('meta[name="description"]', 'content'))
    check('each page has a distinct meta description', len(descs) == 7, str(len(descs)))
    for bad in ['#no-such-page', '#p-no-such-project']:
        pg.goto(URL + bad); pg.wait_for_timeout(300)
        check(f'{bad} shows the 404 page', visible() == ['notfound'] and pg.is_hidden('#detail-view') and 'not found' in pg.title().lower(), str(visible()))
    check('404 links to Home, Projects and Contact', pg.eval_on_selector_all('#not-found .hero-actions a', 'a => a.map(x => x.getAttribute("href"))') == ['#home', '#projects', '#connect'])
    pg.goto(URL + '#contact'); pg.wait_for_timeout(300)
    soon = pg.eval_on_selector_all('#connect .soc-pill.is-soon', 's => s.map(x => x.innerText)')
    check('contact shows email/GitHub/design slots as coming soon, not links', len(soon) == 3 and pg.locator('#connect a.soc-pill').count() == 4, str(soon))
    check('no empty-href social links anywhere', pg.locator('a.soc-pill[href=""], a.soc-icon[href=""], a.soc-card[href=""]').count() == 0)
    check('footer uses the full lockup', pg.get_attribute('footer .foot-logo', 'width') == '760' and 'Interactive Network' in pg.get_attribute('footer .foot-logo', 'alt'))
    check('current page is highlighted in the nav', pg.evaluate("getComputedStyle(document.querySelector('.nav a[data-nav=contact]')).color") == 'rgb(104, 58, 115)')

    # v0.5: portrait + ventures/programs strip
    pg.goto(URL); pg.wait_for_timeout(300)
    check('portrait renders in hero and About', pg.locator('[data-portrait] .portrait-btn').count() == 2)
    check('portrait images all have alt text', pg.locator('[data-portrait] img').count() == 4 and pg.locator('[data-portrait] img:not([alt])').count() == 0)
    on0 = pg.evaluate("[...document.querySelectorAll('#home [data-portrait] img')].findIndex(i => i.classList.contains('on'))")
    pg.click('#home [data-portrait] .portrait-btn'); pg.wait_for_timeout(100)
    on1 = pg.evaluate("[...document.querySelectorAll('#home [data-portrait] img')].findIndex(i => i.classList.contains('on'))")
    check('pressing the portrait switches photo', on0 == 0 and on1 == 1, f'{on0}->{on1}')
    pg.focus('#home [data-portrait] .portrait-btn'); pg.keyboard.press('Enter'); pg.wait_for_timeout(100)
    check('portrait switches with the keyboard too', pg.evaluate("document.querySelector('#home [data-portrait] img').classList.contains('on')"))
    check('org strip: 14 tiles plus a hidden duplicate for the loop', pg.locator('#orgs .orgs-set:not([aria-hidden]) .org').count() == 14 and pg.locator('#orgs .orgs-set[aria-hidden="true"] .org[tabindex="-1"]').count() == 14)
    org_links = pg.eval_on_selector_all('#orgs .orgs-set:not([aria-hidden]) .org', 'a => a.map(x => x.getAttribute("href"))')
    bad = []
    for h in org_links:
        pg.goto(URL + h); pg.wait_for_timeout(150)
        if visible() == ['notfound'] or (not visible() and pg.is_hidden('#detail-view')): bad.append(h)
    check('every org tile links to a real page or case study', not bad, str(bad))


    # phase 2: content, case-study template, awards, experience, community, O2O, SFE, search
    for slug in ['project-stoke', 'seed', 'x-culture-2020', 'wash-tech-platform']:
        pg.goto(URL + '#p-' + slug); pg.wait_for_timeout(250)
        check(f'direct link #p-{slug} opens its case study', pg.is_visible('#detail-view') and pg.locator('#detail-root h1').count() == 1)
    pg.goto(URL + '#p-hallyu-radiance'); pg.wait_for_timeout(250)
    t = pg.inner_text('#detail-root')
    check('Hallyu: master summary, tags, planned areas to confirm', 'emerging Korean beauty brands' in t and 'Emerging Brands' in t and pg.locator('#d-planned .tbc').count() == 6)
    check('Hallyu: status Active with to-confirm note', 'active' in pg.inner_text('#detail-root .facts').lower() and 'to confirm' in pg.inner_text('#detail-root .facts').lower())
    pg.goto(URL + '#p-farafeet'); pg.wait_for_timeout(250)
    check('Farafeet is labelled a concept, not a finished product', 'not a finished commercial product' in pg.inner_text('#detail-root .detail-hero'))
    pg.goto(URL + '#p-inventory-automation'); pg.wait_for_timeout(250)
    t = pg.inner_text('#detail-root')
    check('automation case study uses its own sections', all(x in t for x in ['Previous workflow', 'Solution design', 'Testing and adoption', 'Verified results']))
    check('4,000 SKUs only shown as To confirm', pg.locator('#d-unconfirmed .todo', has_text='4,000 SKUs').count() == 1)
    check('employer is not named; confidentiality note shown', 'not named' in t and pg.locator('#d-confidentiality').count() == 1)
    check('confirmed tech shown as tags', pg.locator('#detail-root .detail-hero .tech-tags li', has_text='VBA').count() == 1)
    check('empty optional fields stay hidden', pg.locator('#d-objectives, #d-constraints, #d-images').count() == 0)
    pg.goto(URL + '#p-next-health-global'); pg.wait_for_timeout(250)
    check('Next Health Global: three sub-brand slots "Name to confirm"', pg.locator('#d-children .child', has_text='Name to confirm').count() == 3)
    pg.goto(URL + '#p-the-hint-group'); pg.wait_for_timeout(250)
    check('Hint Group lists its stores without linking ModelHint.com', pg.locator('#d-children .child').count() == 3 and pg.locator('#detail-root a[href*="modelhint"]').count() == 0)
    pg.goto(URL + '#p-project-stoke'); pg.wait_for_timeout(250)
    crumbs = pg.eval_on_selector_all('#detail-root .crumbs li', 'l => l.map(x => x.innerText.trim())')
    check('Project Stoke breadcrumb runs through its parent, Enactus', crumbs == ['Home', 'Projects', 'Community and Social Impact', 'Enactus', 'Project Stoke'], str(crumbs))
    check("case study shows related What's New items", pg.locator('#d-related a').count() >= 1)
    pg.goto(URL + '#p-vivacity-challenge'); pg.wait_for_timeout(250)
    check('Vivacity keeps a visible Details to confirm note', 'details to confirm' in pg.inner_text('#detail-root .detail-hero').lower())
    check('competition template sections', all(x in pg.inner_text('#detail-root') for x in ['Problem statement', 'Options considered', 'Recommendation']))
    pg.goto(URL + '#p-home-lab'); pg.wait_for_timeout(250)
    check('home lab: topics to confirm + GitHub slot', pg.locator('#d-checklist .tbc').count() == 8 and 'GitHub link to be added' in pg.inner_text('#d-links'))
    pg.goto(URL + '#projects'); pg.wait_for_timeout(250)
    pg.click('#filters [data-cat="all"]'); pg.wait_for_timeout(100)
    pg.fill('#proj-search', 'shopify'); pg.wait_for_timeout(150)
    names = pg.eval_on_selector_all('#grid .pcard h3', 'h => h.map(x => x.innerText)')
    check('search finds projects by technology', 'Furniture H' in names and len(names) < 22, str(names) + ' ' + pg.inner_text('#result-count'))
    pg.click('#filters [data-cat="community"]'); pg.wait_for_timeout(100)
    check('search and category filter combine', pg.locator('#grid .pcard').count() == 0 and pg.locator('[data-clear-search]').count() == 1)
    pg.click('[data-clear-search]'); pg.wait_for_timeout(100)
    check('clearing search restores the category', pg.locator('#grid .pcard').count() == 7, str(pg.locator('#grid .pcard').count()))
    pg.click('#filters [data-cat="all"]'); pg.wait_for_timeout(100)
    pg.goto(URL + '#awards'); pg.wait_for_timeout(250)
    check('Awards page: 3 verified entries + labelled empty slots', pg.locator('[data-awards] .award').count() == 3 and pg.locator('[data-award-slots] li .tbc').count() == 4)
    check('Vivacity award flagged to confirm', pg.locator('.award', has_text='Vivacity').locator('.todo').count() == 1)
    pg.goto(URL + '#about'); pg.wait_for_timeout(250)
    check('About: experience lists UNAC internship with fields to confirm', pg.locator('#experience .xp', has_text='UNAC').locator('.tbc').count() == 4)
    check('About links to Awards', pg.locator('[data-page="about"] a[href="#awards"]').count() >= 1)
    pg.goto(URL + '#community'); pg.wait_for_timeout(250)
    check('Community: 6 involvement items, each with a type and an outcome line', pg.locator('[data-community-work] .cw-item').count() == 6 and pg.locator('.cw-outcome').count() == 6)
    check('SFE: Join says coming soon and is not a link', pg.locator('[data-sfe-join] .is-soon').count() == 1 and pg.locator('[data-sfe-join] a').count() == 0)
    check('SFE: events and newsletter hidden while empty', pg.is_hidden('[data-sfe-events]') and pg.is_hidden('[data-sfe-newsletter]'))
    pg.goto(URL + '#playbook'); pg.wait_for_timeout(250)
    check('O2O: new positioning line + 10 topics', 'people, processes, technologies, and business models' in pg.inner_text('#playbook') and pg.locator('[data-o2o-topics] li').count() == 10)
    check('O2O: honest empty archive, no subscribe links', 'No episodes have been published yet' in pg.inner_text('#ep-list') and pg.is_hidden('[data-podcast-links]'))
    # an injected example episode exercises the archive, filters, search and episode page without publishing one
    pg.evaluate("""EPISODES.push({slug:'test-ep', number:1, title:'Test episode', date:'2026-01-01', topics:['Logistics'], summary:'A test.',
      notes:['Notes.'], guests:[{name:'Test Guest', role:'Tester'}], links:[{label:'Listen', href:'https://example.com'}], projects:['last-mile-wholesale']});
      PODCAST_LINKS[0].href = 'https://example.com/pod'; renderPlaybook();""")
    check('archive lists an episode and its guest', pg.locator('#ep-list .ep-item').count() == 1 and pg.locator('[data-guests] .format').count() == 1 and pg.is_visible('[data-podcast-links]'))
    pg.click('#ep-filters [data-ep-topic="IT"]'); pg.wait_for_timeout(100)
    check('topic filter narrows the archive', pg.locator('#ep-list .ep-item').count() == 0)
    pg.click('#ep-filters [data-ep-topic="All"]'); pg.fill('#ep-search', 'guest'); pg.wait_for_timeout(100)
    check('episode search matches guest names', pg.locator('#ep-list .ep-item').count() == 1)
    pg.evaluate("location.hash = '#ep-test-ep'"); pg.wait_for_timeout(300)
    check('episode page renders with related project', pg.is_visible('#detail-view') and 'Test episode' in pg.inner_text('#detail-root h1') and pg.locator('#d-projects a[href="#p-last-mile-wholesale"]').count() == 1)

    # mobile: menu has all items, no overflow on each page
    m = b.new_context(viewport={'width': 390, 'height': 844}); m.route('http*://**/*', lambda r: r.abort())
    mp = m.new_page(); mp.goto(URL); mp.wait_for_timeout(300)
    mp.click('#menu-btn'); check('mobile menu opens with 7 pages', mp.is_visible('#nav') and mp.locator('#nav a[data-nav]').count() == 7)
    for pgname in ['home', 'about', 'projects', 'playbook', 'community', 'whats-new', 'contact', 'privacy', 'awards', 'no-such-page', 'p-project-stoke', 'p-inventory-automation', 'p-next-health-global', 'p-x-culture-2020', 'p-home-lab']:
        mp.goto(URL + '#' + pgname); mp.wait_for_timeout(250)
        ow = mp.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
        check(f'mobile {pgname}: no horizontal overflow', ow <= 0, str(ow))
        # body has overflow-x:hidden, so also look for visible text pushed past the screen edge (clipped, not scrollable)
        off = mp.evaluate("""() => { const W = document.documentElement.clientWidth, out = [];
          for (const el of document.querySelectorAll('main p, main li, main h1, main h2, main h3, main a, main button, main label, main span, footer p, footer a')) {
            if (el.closest('[hidden], svg, .rail, .nav, .fcards, .detail-toc, .orgs-viewport')) continue;   // .detail-toc and the org strip scroll sideways by design
            const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
            if (r.right > W + 1 || r.left < -1) out.push(el.id || el.className || el.tagName);
          } return out.slice(0, 5); }""")
        check(f'mobile {pgname}: no clipped text past the screen edge', not off, str(off))
    check('no page errors', not errs, '; '.join(errs))
    b.close()

fails = [r for r in results if not r[1]]
for n, ok, d in results:
    if not ok: print('FAIL ' + n + (f'  [{d}]' if d else ''))
print(f'{len(results) - len(fails)}/{len(results)} passed')
sys.exit(1 if fails else 0)
