"""End to end: a Google Doc export → converter → content/articles → real build → served over HTTP → checked in a browser.
Builds into a temporary folder, so site/ and content/ are never touched.
Usage: python3 tests/articles_flow.py      (needs beautifulsoup4, Pillow, Playwright)"""
import http.server, json, os, pathlib, shutil, subprocess, sys, tempfile, threading

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / 'scripts')); sys.path.insert(0, str(HERE))
from test_articles_pipeline import FakeDrive, export_zip
import sync_drive
from playwright.sync_api import sync_playwright

tmp = pathlib.Path(tempfile.mkdtemp())
content, out = tmp / 'content' / 'articles', tmp / 'site'
sync_drive.OUT, sync_drive.IMG = content, content / 'img'
drive = FakeDrive()
drive.docs['doc1'] = {'name': 'Last-mile delivery, explained', 'modifiedTime': '2026-11-01T10:00:00Z', 'createdTime': '2026-10-30T09:00:00Z', 'zip': export_zip()}
sync_drive.sync(drive, 'folder')
(out / 'assets').mkdir(parents=True)
for f in (ROOT / 'site' / 'assets').glob('*.*'):
    shutil.copy(f, out / 'assets' / f.name)
env = dict(os.environ, JEIN_SITE_OUT=str(out), JEIN_ARTICLES_DIR=str(content))
build = subprocess.run([sys.executable, '-X', 'utf8', str(ROOT / 'scripts' / 'build_standalone.py')], env=env, capture_output=True, text=True)
assert build.returncode == 0, build.stderr

class Handler(http.server.SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    def __init__(self, *a, **k): super().__init__(*a, directory=str(out), **k)
    def log_message(self, *a): pass
class Server(http.server.ThreadingHTTPServer):
    daemon_threads = True
    def handle_error(self, *a): pass
srv = Server(('127.0.0.1', 0), Handler); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{srv.server_address[1]}'
SLUG = 'last-mile-delivery-explained'
results = []
def check(name, cond, detail=''): results.append((name, bool(cond), detail))

page_html = (out / 'articles' / SLUG / 'index.html').read_text(encoding='utf-8')
check('build reports the article', 'Articles: 1' in build.stdout, build.stdout)
check('article page has its own title and description', '<title>Last-mile delivery, explained · J.E.I.N.</title>' in page_html and 'Why last-mile delivery' in page_html)
check('article page is og:type article with its cover image', 'og:type" content="article"' in page_html and f'/assets/articles/{SLUG}/image1.webp' in page_html)
check('Article structured data', '"@type": "Article"' in page_html and '"datePublished": "2026-11-03"' in page_html)
check('sitemap lists the article', f'articles/{SLUG}/' in (out / 'sitemap.xml').read_text())
check('article image copied into the site', (out / 'assets' / 'articles' / SLUG / 'image1.webp').exists())
check('other pages carry metadata but not the body', 'JEIN_ARTICLES' in (out / 'index.html').read_text(encoding='utf-8') and 'JEIN_ARTICLE_BODY' not in (out / 'index.html').read_text(encoding='utf-8'))

with sync_playwright() as p:
    ch = os.environ.get('PW_CHANNEL')
    b = p.chromium.launch(channel=ch) if ch else p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1280, 'height': 900})
    ctx.route(lambda u: not u.startswith(BASE), lambda r: r.abort())
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    imgs = []
    pg.on('response', lambda r: imgs.append((r.url, r.status)) if '/assets/articles/' in r.url else None)

    pg.goto(f'{BASE}/articles/{SLUG}/', wait_until='domcontentloaded'); pg.wait_for_timeout(500)
    check('article page renders', pg.is_visible('#detail-view') and pg.inner_text('#detail-root h1') == 'Last-mile delivery, explained')
    body = pg.inner_text('#detail-root .article-body')
    check('article body shows headings, lists and the table', 'Where value leaks' in body and 'Delivery' in body and 'Ship' in body)
    check('article meta line shows date and reading time', 'november 3, 2026' in pg.inner_text('#detail-root .detail-hero').lower() and 'min read' in pg.inner_text('#detail-root .detail-hero').lower())
    check('article images load', imgs and all(s == 200 for _, s in imgs), str(imgs))
    check('related project linked as a real path', pg.locator('#d-related-projects a[href="/projects/last-mile-wholesale/"]').count() == 1)
    check('breadcrumb: Home › What’s New › article', pg.eval_on_selector_all('#detail-root .crumbs li', 'l => l.map(x => x.innerText.trim())') == ['Home', 'What’s New', 'Last-mile delivery, explained'])

    pg.goto(f'{BASE}/whats-new/', wait_until='domcontentloaded'); pg.wait_for_timeout(400)
    first = pg.locator('#wn-feed .wn-item').first
    check("article is first in What's New, linking to its page", 'Last-mile delivery, explained' in first.inner_text() and first.locator(f'a[href="/articles/{SLUG}/"]').count() == 1)
    pg.goto(f'{BASE}/', wait_until='domcontentloaded'); pg.wait_for_timeout(400)
    check('home teaser shows the article first', 'Last-mile delivery' in pg.locator('#home-whats-new .wn-item').first.inner_text())
    pg.goto(f'{BASE}/o2o-playbook/', wait_until='domcontentloaded'); pg.wait_for_timeout(300)
    check('O2O article count is live', pg.inner_text('[data-count="articles"]') == '1 published')
    pg.goto(f'{BASE}/search/', wait_until='domcontentloaded'); pg.wait_for_timeout(300)
    pg.fill('#site-q', 'last-mile'); pg.wait_for_timeout(200)
    check('site search finds the article', pg.locator(f'#site-results a[href="/articles/{SLUG}/"]').count() == 1)
    pg.goto(f'{BASE}/articles/no-such-article/', wait_until='domcontentloaded'); pg.wait_for_timeout(200)
    check('no page errors', not errs, '; '.join(errs[:3]))
    b.close()
srv.shutdown(); shutil.rmtree(tmp, ignore_errors=True)

fails = [r for r in results if not r[1]]
for n, ok, d in results:
    if not ok: print('FAIL ' + n + (f'  [{d}]' if d else ''))
print(f'{len(results) - len(fails)}/{len(results)} passed')
sys.exit(1 if fails else 0)
