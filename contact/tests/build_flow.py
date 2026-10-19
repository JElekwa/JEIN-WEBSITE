"""Checks the multi-page build (site/) served over HTTP, as it would be on Namecheap.
Usage: python3 tests/build_flow.py ../site      (run scripts/build_standalone.py first)"""
import http.server, os, pathlib, sys, threading
from playwright.sync_api import sync_playwright

SITE = pathlib.Path(sys.argv[1]).resolve()
class Handler(http.server.SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'   # keep-alive: Python's server stalls on Windows when the browser opens many short connections
    def __init__(self, *a, **k): super().__init__(*a, directory=str(SITE), **k)
    def log_message(self, *a): pass
class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 128   # the default of 5 drops the browser's parallel connections on Windows and stalls page loads
    daemon_threads = True
    def handle_error(self, request, client_address): pass   # browser closing idle keep-alive sockets is normal
srv = Server(('127.0.0.1', 0), Handler)
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{srv.server_address[1]}'
results = []
def check(name, cond, detail=''): results.append((name, bool(cond), detail))

check('sitemap lists pages and case studies', all(x in (SITE / 'sitemap.xml').read_text() for x in ['about/', 'projects/seed/', 'o2o-playbook/']))
check('sitemap leaves out search and 404', 'search/' not in (SITE / 'sitemap.xml').read_text() and '404' not in (SITE / 'sitemap.xml').read_text())
check('robots.txt points to the sitemap', 'Sitemap:' in (SITE / 'robots.txt').read_text())
check('.htaccess serves the branded 404', '404.html' in (SITE / '.htaccess').read_text())
home = (SITE / 'index.html').read_text(encoding='utf-8')
check('home has WebSite + Person structured data', '"@type": "WebSite"' in home and '"@type": "Person"' in home)
check('pages carry their own canonical URL', '/about/"' in (SITE / 'about' / 'index.html').read_text(encoding='utf-8').split('rel="canonical"')[1][:120])

with sync_playwright() as p:
    _ch = os.environ.get('PW_CHANNEL')
    b = p.chromium.launch(channel=_ch) if _ch else p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1280, 'height': 900})
    ctx.route(lambda url: not url.startswith(BASE), lambda r: r.abort())   # block the outside world; local requests are not intercepted
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    visible = lambda: pg.evaluate("[...document.querySelectorAll('[data-page]')].filter(p=>!p.hidden).map(p=>p.dataset.page)")

    for path, page in [('/', 'home'), ('/about/', 'about'), ('/projects/', 'projects'), ('/o2o-playbook/', 'playbook'), ('/community/', 'community'),
                       ('/whats-new/', 'whats-new'), ('/contact/', 'contact'), ('/privacy/', 'privacy'), ('/awards/', 'awards'), ('/search/', 'search'), ('/404.html', 'notfound')]:
        pg.goto(BASE + path, wait_until='domcontentloaded'); pg.wait_for_timeout(250)
        check(f'{path} shows the {page} page', visible() == [page], str(visible()))
    pg.goto(BASE + '/projects/project-stoke/', wait_until='domcontentloaded'); pg.wait_for_timeout(300)
    check('/projects/project-stoke/ opens the case study', pg.is_visible('#detail-view') and 'Project Stoke' in pg.inner_text('#detail-root h1'))
    check('case study title is set', pg.title() == 'Project Stoke · J.E.I.N.')

    pg.goto(BASE + '/', wait_until='domcontentloaded'); pg.wait_for_timeout(300)
    check('nav links are real paths', pg.get_attribute('.nav a[data-nav="about"]', 'href') == '/about/' and pg.get_attribute('.nav a[data-nav="projects"]', 'href') == '/projects/')
    check('case-study links are real paths', pg.locator('a[href="/projects/project-stoke/"]').count() >= 1)
    check('no internal #links left except in-page jumps', pg.evaluate("[...document.querySelectorAll('a[href^=\"#\"]')].filter(a => a.getAttribute('href') !== '#main' && !a.hasAttribute('data-jump')).map(a => a.getAttribute('href'))") == [])
    pg.click('.nav a[data-nav="about"]'); pg.wait_for_load_state('domcontentloaded'); pg.wait_for_timeout(300)
    check('clicking About loads /about/', pg.url == BASE + '/about/' and visible() == ['about'], pg.url)
    pg.goto(BASE + '/about/#strategy', wait_until='domcontentloaded'); pg.wait_for_timeout(1200)   # same-page hash: smooth scroll
    check('/about/#strategy scrolls to chapter 02', visible() == ['about'] and pg.evaluate("document.getElementById('strategy').getBoundingClientRect().top") < 200)

    pg.goto(BASE + '/projects/seed/', wait_until='domcontentloaded'); pg.wait_for_timeout(300)
    pg.click('#detail-root .crumbs a[data-crumb="category"]'); pg.wait_for_load_state('domcontentloaded'); pg.wait_for_timeout(300)
    check('category breadcrumb opens /projects/ filtered', pg.url == BASE + '/projects/' and pg.get_attribute('#filters [data-cat="community"]', 'aria-pressed') == 'true', pg.url)

    pg.goto(BASE + '/contact/#connect-media', wait_until='domcontentloaded'); pg.wait_for_timeout(700)
    check('/contact/#connect-media preselects the card', visible() == ['contact'] and pg.is_checked('#cx-path-media'))
    pg.goto(BASE + '/community/', wait_until='domcontentloaded'); pg.wait_for_timeout(300)
    pg.click('[data-inquiry="community"]'); pg.wait_for_load_state('domcontentloaded'); pg.wait_for_timeout(800)
    check('Register interest moves to /contact/ with the card selected', pg.url.startswith(BASE + '/contact/') and pg.is_checked('#cx-path-community'), pg.url)

    pg.goto(BASE + '/about/', wait_until='domcontentloaded'); pg.wait_for_timeout(300)
    pg.keyboard.press('/'); pg.wait_for_load_state('domcontentloaded'); pg.wait_for_timeout(500)
    check('"/" opens /search/', pg.url == BASE + '/search/' and visible() == ['search'], pg.url)
    pg.fill('#site-q', 'enactus'); pg.wait_for_timeout(150)
    check('search results link to real paths', pg.locator('#site-results a[href="/projects/enactus/"]').count() == 1)

    check('shared CSS, scripts and images load from assets/build', pg.evaluate("[...document.scripts].filter(s => s.src.includes('/assets/build/')).length") >= 5)
    check('no page errors', not errs, '; '.join(errs[:3]))
    b.close()
srv.shutdown()

fails = [r for r in results if not r[1]]
for n, ok, d in results:
    if not ok: print('FAIL ' + n + (f'  [{d}]' if d else ''))
print(f'{len(results) - len(fails)}/{len(results)} passed')
sys.exit(1 if fails else 0)
