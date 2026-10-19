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
    b = p.chromium.launch(executable_path=_exe) if os.path.exists(_exe) else p.chromium.launch()
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
    pg.click('#detail-root a.back'); pg.wait_for_timeout(400)
    check('back from detail returns to Projects page', visible() == ['projects'] and pg.is_hidden('#detail-view'), str(visible()))
    check('portfolio includes Appropedia projects', pg.locator('#grid .pcard').count() == 15, str(pg.locator('#grid .pcard').count()))
    pg.click('#filters [data-cat="community"]'); pg.wait_for_timeout(100)
    check('community filter now has real projects', pg.locator('#grid .pcard').count() >= 5)

    # cross-page entry into the contact flow
    pg.goto(URL + '#community'); pg.wait_for_timeout(300)
    pg.click('[data-inquiry="community"]'); pg.wait_for_timeout(700)
    check('community "Register interest" opens contact with card selected', visible() == ['contact'] and pg.is_checked('#cx-path-community'))
    pg.goto(URL + '#connect-media'); pg.wait_for_timeout(700)
    check('#connect-media deep link preselects card', visible() == ['contact'] and pg.is_checked('#cx-path-media'))

    # mobile: menu has all items, no overflow on each page
    m = b.new_context(viewport={'width': 390, 'height': 844}); m.route('http*://**/*', lambda r: r.abort())
    mp = m.new_page(); mp.goto(URL); mp.wait_for_timeout(300)
    mp.click('#menu-btn'); check('mobile menu opens with 7 pages', mp.is_visible('#nav') and mp.locator('#nav a[data-nav]').count() == 7)
    for pgname in ['home', 'about', 'projects', 'playbook', 'community', 'whats-new', 'contact', 'privacy']:
        mp.goto(URL + '#' + pgname); mp.wait_for_timeout(250)
        ow = mp.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
        check(f'mobile {pgname}: no horizontal overflow', ow <= 0, str(ow))
    check('no page errors', not errs, '; '.join(errs))
    b.close()

fails = [r for r in results if not r[1]]
for n, ok, d in results:
    if not ok: print('FAIL ' + n + (f'  [{d}]' if d else ''))
print(f'{len(results) - len(fails)}/{len(results)} passed')
sys.exit(1 if fails else 0)
