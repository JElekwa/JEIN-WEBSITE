#!/usr/bin/env python3
"""Build the deployable site from the claude.ai version.

    python3 scripts/build_standalone.py

Reads  artifact/jein-site.html  (the page as published on claude.ai, which has no <html>/<head> wrapper)
Writes site/                     real pages with readable addresses for any static host (e.g. Namecheap):
         index.html              home                     about/index.html        /about/
         projects/index.html     /projects/               projects/<slug>/        one page per case study
         o2o-playbook/index.html /o2o-playbook/           o2o-playbook/<slug>/    one page per published episode
         community/  whats-new/  contact/  privacy/  awards/  search/
         404.html  sitemap.xml  robots.txt  .htaccess (Apache: 404 page)

Every page is the same site with its own <title>, description, canonical URL and share tags, so search
engines and link previews see the right page. Inside the browser the site works exactly as on claude.ai.

Edit the artifact file (or ask Claude to), then re-run this script before uploading the whole site/ folder.
"""
import json, pathlib, re, shutil
from urllib.parse import urlparse

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'artifact' / 'jein-site.html'
OUT = ROOT / 'site'

CONTACT_ENDPOINT = ''          # e.g. 'https://jein-contact.<your-subdomain>.workers.dev/api/contact'
SITE_URL = 'https://YOUR-DOMAIN.com/'   # your public address, ending in "/"; used for canonical URLs, sitemap and share tags
SHARE_IMAGE_APPROVED = True    # approved by Joshua on 19 October 2026; docs/share-preview.png is published as assets/share.png

# page key (as in the artifact router) -> folder
PAGES = {'home': '', 'about': 'about/', 'projects': 'projects/', 'playbook': 'o2o-playbook/', 'community': 'community/',
         'whats-new': 'whats-new/', 'contact': 'contact/', 'privacy': 'privacy/', 'awards': 'awards/', 'search': 'search/'}
NOINDEX = {'search'}
GENERATED = [d.rstrip('/') for d in PAGES.values() if d] + ['404.html', 'sitemap.xml', 'robots.txt', '.htaccess']

page = SRC.read_text(encoding='utf-8')
base_path = urlparse(SITE_URL).path or '/'
if not base_path.endswith('/'):
    base_path += '/'


def js_str(s):
    """Decode a JavaScript single-quoted string body."""
    s = re.sub(r'\\u([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1), 16)), s)
    return s.replace("\\'", "'").replace('\\\\', '\\')


def js_block(start, end='\n};'):
    i = page.index(start)
    return page[i:page.index(end, i)]


# per-page labels and descriptions, read from the artifact's router (single source of truth)
LABEL = {k: js_str(v) for k, v in re.findall(r"'?([\w-]+)'?:'((?:[^'\\]|\\.)*)'", js_block('const LABEL = {', '};'))}
META = {k: js_str(v) for k, v in re.findall(r"^\s+'?([\w-]+)'?: '((?:[^'\\]|\\.)*)',?$", js_block('const META = {', '\n  };'), re.M)}

# projects and episodes, read from the CONTENT block
projects_src = js_block('const PROJECTS = [', '\n];')
PROJECTS = []
for chunk in re.split(r'\n\s*\{slug:', projects_src)[1:]:
    slug = re.match(r"'([^']+)'", chunk).group(1)
    name = js_str(re.search(r"name:'((?:[^'\\]|\\.)*)'", chunk).group(1))
    summary = js_str(re.search(r"summary:'((?:[^'\\]|\\.)*)'", chunk).group(1))
    PROJECTS.append((slug, name, summary))
episodes_src = js_block('const EPISODES = [', '];')
EPISODES = [(m.group(1), js_str(m.group(2))) for m in re.finditer(r"\{slug:'([^']+)'.*?title:'((?:[^'\\]|\\.)*)'", episodes_src, re.S)]

# split the artifact: everything before the skip link belongs in <head>
split = page.index('<a class="skip"')
head_part, body_part = page[:split], page[split:]
head_part = head_part.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '')
head_part = re.sub(r'<title>.*?</title>\n?', '', head_part, count=1)
head_part = re.sub(r'<meta name="description"[^>]*>\n?', '', head_part, count=1)

# Shared CSS, scripts and embedded images become cached files in assets/build/, so moving between pages only
# downloads each page's own markup. Images are written byte-for-byte from the artifact (no re-encoding).
import hashlib, base64
BUILD = OUT / 'assets' / 'build'
if BUILD.exists():
    shutil.rmtree(BUILD)
BUILD.mkdir(parents=True)


def asset(data: bytes, ext: str) -> str:
    name = hashlib.sha256(data).hexdigest()[:12] + '.' + ext
    (BUILD / name).write_bytes(data)
    return f'{base_path}assets/build/{name}'


def externalize_images(text):
    return re.sub(r'data:image/(webp|png|jpeg);base64,([A-Za-z0-9+/=]+)',
                  lambda m: asset(base64.b64decode(m.group(2)), 'jpg' if m.group(1) == 'jpeg' else m.group(1)), text)


head_part = externalize_images(head_part)
body_part = externalize_images(body_part)
css = '\n'.join(re.findall(r'<style>(.*?)</style>', head_part, re.S))
head_part = re.sub(r'<style>.*?</style>\n?', '', head_part, flags=re.S)
head_part += f'\n<link rel="stylesheet" href="{asset(css.encode("utf-8"), "css")}">'
body_part = re.sub(r'<script>(.*?)</script>',
                   lambda m: f'<script src="{asset(m.group(1).encode("utf-8"), "js")}"></script>', body_part, flags=re.S)

config = f'<script>window.JEIN_CONTACT_ENDPOINT = {CONTACT_ENDPOINT!r};</script>\n' if CONTACT_ENDPOINT else ''
share_url = SITE_URL + 'assets/share.png' if SHARE_IMAGE_APPROVED else ''
SAME_AS = ['https://ca.linkedin.com/in/joshuaelekwa', 'https://www.facebook.com/JoshuaJEIN/',
           'https://www.appropedia.org/User:Joshua_Elekwa', 'https://jeinelekwa.base44.app']


def esc(s):
    return s.replace('&', '&amp;').replace('"', '&quot;').replace('<', '&lt;').replace('>', '&gt;')


def doc(route, path, title, description, noindex=False, structured=()):
    url = SITE_URL + path.lstrip('/') if path else SITE_URL
    ld = ''.join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>\n' for x in structured)
    tags = [
        f'<title>{esc(title)}</title>',
        f'<meta name="description" content="{esc(description)}">',
        f'<link rel="canonical" href="{esc(url)}">',
        '<meta property="og:type" content="website">',
        '<meta property="og:site_name" content="J.E.I.N.">',
        f'<meta property="og:title" content="{esc(title)}">',
        f'<meta property="og:description" content="{esc(description)}">',
        f'<meta property="og:url" content="{esc(url)}">',
        f'<meta name="twitter:card" content="{"summary_large_image" if share_url else "summary"}">',
    ]
    if share_url:
        tags += [f'<meta property="og:image" content="{share_url}">', '<meta property="og:image:width" content="1200">',
                 '<meta property="og:image:height" content="630">',
                 '<meta property="og:image:alt" content="J.E.I.N. — Joshua Elekwa Interactive Network logo">']
    if noindex:
        tags.append('<meta name="robots" content="noindex">')
    mp = json.dumps({'base': base_path, 'route': route})
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
{chr(10).join(tags)}
<link rel="icon" type="image/webp" href="{base_path}assets/jein-mark.webp">
<style>[hidden]{{display:none!important}} img{{max-width:100%}} body{{margin:0}}</style>
{head_part.strip()}
<script>window.JEIN_MULTIPAGE = {mp};</script>
{config}{ld}</head>
<body>
{body_part.strip()}
</body>
</html>
'''


# structured data: only facts the site already states
person = {'@context': 'https://schema.org', '@type': 'Person', 'name': 'Joshua Elekwa', 'url': SITE_URL,
          'image': SITE_URL + 'assets/portrait-1.webp', 'sameAs': SAME_AS}
website = {'@context': 'https://schema.org', '@type': 'WebSite', 'name': 'J.E.I.N. — Joshua Elekwa Interactive Network',
           'alternateName': 'J.E.I.N.', 'url': SITE_URL}

# clear what a previous build generated (assets/ is never touched)
for name in GENERATED:
    p = OUT / name
    if p.is_dir():
        shutil.rmtree(p)
    elif p.exists():
        p.unlink()

pages_written, sitemap = [], []


def write(rel, html, in_sitemap=True):
    target = OUT / rel / 'index.html' if not rel.endswith('.html') else OUT / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(html, encoding='utf-8')
    pages_written.append(rel or '/')
    if in_sitemap:
        sitemap.append(SITE_URL + rel)


for key, folder in PAGES.items():
    title = 'J.E.I.N. — Joshua Elekwa' if key == 'home' else f'{LABEL.get(key, key)} · J.E.I.N.'
    ld = (website, person) if key == 'home' else (person,) if key == 'about' else ()
    write(folder, doc(key, folder, title, META[key], noindex=key in NOINDEX, structured=ld), in_sitemap=key not in NOINDEX)

for slug, name, summary in PROJECTS:
    write(f'projects/{slug}/', doc('p-' + slug, f'projects/{slug}/', f'{name} · J.E.I.N.', f'{name} — case study by Joshua Elekwa. {summary}'))
for slug, title in EPISODES:
    write(f'o2o-playbook/{slug}/', doc('ep-' + slug, f'o2o-playbook/{slug}/', f'{title} · O2O Playbook · J.E.I.N.', f'O2O Playbook episode: {title}.'))

write('404.html', doc('not-found', '404.html', 'Page not found · J.E.I.N.', META['notfound'], noindex=True), in_sitemap=False)

(OUT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + ''.join(f'  <url><loc>{esc(u)}</loc></url>\n' for u in sitemap) + '</urlset>\n', encoding='utf-8')
(OUT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\n\nSitemap: {SITE_URL}sitemap.xml\n', encoding='utf-8')
(OUT / '.htaccess').write_text(f'# Apache (Namecheap shared hosting): show the branded 404 page for unknown addresses\nErrorDocument 404 {base_path}404.html\n', encoding='utf-8')

if SHARE_IMAGE_APPROVED:
    shutil.copyfile(ROOT / 'docs' / 'share-preview.png', OUT / 'assets' / 'share.png')

size = (OUT / 'index.html').stat().st_size // 1024
notes = []
if not CONTACT_ENDPOINT:
    notes.append('contact endpoint not set; the form will say sending is unavailable')
if 'YOUR-DOMAIN' in SITE_URL:
    notes.append('SITE_URL is still the placeholder; set it before uploading')
if not SHARE_IMAGE_APPROVED:
    notes.append('share image not approved yet; pages have no og:image')
print(f'Wrote {len(pages_written)} pages to site/ ({size} KB each), sitemap.xml ({len(sitemap)} URLs), robots.txt, .htaccess')
for n in notes:
    print(' - ' + n)
