"""Turn a Google Doc (exported by Drive as zipped HTML) into a clean J.E.I.N. article.

Pure functions, no network: used by scripts/sync_drive.py and by contact/tests/test_gdoc_convert.py.

How Joshua writes an article in Google Docs:
  • The document's file name is the article title.
  • Optional details go at the very top, one per line, then a line with three dashes:
        Summary: One or two sentences shown on cards and in search results.
        Topics: E-commerce, Logistics
        Date: 2026-11-03            (defaults to the day the doc was created)
        Projects: last-mile-wholesale, hallyu-radiance     (case-study slugs to link)
        Slug: o2o-basics            (optional fixed address; defaults to the title)
        ---
  • Then the article: Heading 1 / Heading 2 / Heading 3, normal text, bold, italic, links, bullet and numbered
    lists, images (set alt text: right-click the image → Alt text), tables and horizontal lines.
Anything else (fonts, colours, sizes, comments) is dropped so every article matches the site's design.
"""
import html, io, math, re, unicodedata, zipfile
from urllib.parse import urlparse, parse_qs
from bs4 import BeautifulSoup, NavigableString, Tag

META_KEYS = {'summary', 'topics', 'date', 'projects', 'slug'}
HEADING_MAP = {'h1': 'h2', 'h2': 'h3', 'h3': 'h4', 'h4': 'h4', 'h5': 'h4', 'h6': 'h4'}


def slugify(text):
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')[:80] or 'article'


def _class_styles(soup):
    """Google Docs puts bold/italic in CSS classes (.c4{font-weight:700}); map class -> {'b','i'}."""
    out = {}
    for style in soup.find_all('style'):
        for name, body in re.findall(r'\.([\w-]+)\s*\{([^}]*)\}', style.get_text()):
            marks = set()
            if re.search(r'font-weight\s*:\s*(700|bold)', body):
                marks.add('b')
            if re.search(r'font-style\s*:\s*italic', body):
                marks.add('i')
            if marks:
                out[name] = marks
    return out


def _marks(tag, styles):
    marks = set()
    for c in tag.get('class', []) or []:
        marks |= styles.get(c, set())
    st = tag.get('style', '')
    if re.search(r'font-weight\s*:\s*(700|bold)', st):
        marks.add('b')
    if re.search(r'font-style\s*:\s*italic', st):
        marks.add('i')
    return marks


def _clean_href(href):
    """Google wraps links: https://www.google.com/url?q=<real>&sa=D… — keep only the real address."""
    if not href:
        return ''
    u = urlparse(href)
    if u.netloc.endswith('google.com') and u.path == '/url':
        href = parse_qs(u.query).get('q', [''])[0]
    if not re.match(r'^(https?:|mailto:|#)', href):
        return ''
    return href


def _inline(node, styles, images, ctx):
    """Render inline content (text, spans with bold/italic, links, images) as safe HTML."""
    out = []
    for child in node.children:
        if isinstance(child, NavigableString):
            if child.__class__.__name__ in ('Comment', 'Declaration', 'Doctype'):
                continue
            out.append(html.escape(str(child), quote=False))
        elif isinstance(child, Tag):
            name = child.name
            if name == 'br':
                out.append('<br>')
            elif name == 'img':
                out.append(_image(child, images, ctx))
            elif name == 'a':
                href = _clean_href(child.get('href', ''))
                inner = _inline(child, styles, images, ctx)
                if href and inner.strip() and not href.startswith('#'):
                    ext = ' target="_blank" rel="noopener"' if href.startswith('http') else ''
                    out.append(f'<a href="{html.escape(href)}"{ext}>{inner}</a>')
                else:
                    out.append(inner)
            elif name in ('sup', 'sub'):
                out.append(f'<{name}>{_inline(child, styles, images, ctx)}</{name}>')
            elif name in ('style', 'script', 'head', 'title', 'meta'):
                continue
            else:
                inner = _inline(child, styles, images, ctx)
                m = _marks(child, styles) if name in ('span', 'b', 'strong', 'i', 'em') else set()
                if name in ('b', 'strong'):
                    m.add('b')
                if name in ('i', 'em'):
                    m.add('i')
                if inner.strip():
                    if 'i' in m:
                        inner = f'<em>{inner}</em>'
                    if 'b' in m:
                        inner = f'<strong>{inner}</strong>'
                out.append(inner)
    return ''.join(out)


def _image(img, images, ctx):
    src = img.get('src', '')
    data = images.get(src) or images.get(src.split('/')[-1])
    if not data:
        return ''
    ctx['img_n'] += 1
    name = f"image{ctx['img_n']}"
    ctx['images'].append((name, data))
    alt = (img.get('alt') or img.get('title') or '').strip() or f"Image {ctx['img_n']} from “{ctx['title']}”"
    ctx.setdefault('first_image', (name, alt))
    return f'<img src="@ASSETS@/articles/{ctx["slug"]}/{name}.webp" alt="{html.escape(alt)}" loading="lazy">'


def _text(tag):
    return re.sub(r'\s+', ' ', tag.get_text(' ')).strip()


def parse_meta(paragraph_texts):
    """Read 'Key: value' lines at the top until a '---' line. Returns (meta, number of paragraphs consumed)."""
    meta, used = {}, 0
    for t in paragraph_texts:
        if t == '':
            used += 1
            continue
        if re.fullmatch(r'-{3,}|—+|–{3,}', t):
            return meta, used + 1
        m = re.match(r'^([A-Za-z]+)\s*:\s*(.*)$', t)
        if not m or m.group(1).lower() not in META_KEYS:
            return ({}, 0)          # no complete metadata block: treat everything as article text
        meta[m.group(1).lower()] = m.group(2).strip()
        used += 1
    return ({}, 0)


def convert(zip_bytes, title, created_date):
    """Return (meta, body_html, images[(name, bytes)]) for one exported Google Doc."""
    z = zipfile.ZipFile(io.BytesIO(zip_bytes))
    html_name = next(n for n in z.namelist() if n.lower().endswith('.html'))
    images = {n: z.read(n) for n in z.namelist() if n.lower().startswith('images/')}
    images.update({n.split('/')[-1]: v for n, v in list(images.items())})
    soup = BeautifulSoup(z.read(html_name).decode('utf-8', 'replace'), 'html.parser')
    styles = _class_styles(soup)
    body = soup.body or soup

    blocks = [b for b in body.children if isinstance(b, Tag)]
    # drop the Docs "Title"/"Subtitle" paragraphs: the file name is the title
    blocks = [b for b in blocks if not set(b.get('class', []) or []) & {'title', 'subtitle'}]
    texts = [_text(b) if b.name == 'p' else '\u0000' for b in blocks]
    meta, used = parse_meta(texts)
    blocks = blocks[used:]

    slug = slugify(meta.get('slug') or title)
    ctx = {'slug': slug, 'title': title, 'img_n': 0, 'images': []}
    parts = []
    for b in blocks:
        name = b.name
        if name in HEADING_MAP:
            inner = _inline(b, styles, images, ctx).strip()
            if inner:
                parts.append(f'<{HEADING_MAP[name]}>{re.sub(r"</?strong>", "", inner)}</{HEADING_MAP[name]}>')
        elif name == 'p':
            inner = _inline(b, styles, images, ctx).strip()
            if not inner or inner == '<br>':
                continue
            only_img = re.fullmatch(r'(<img [^>]+>\s*)+', inner)
            parts.append(f'<figure>{inner}</figure>' if only_img else f'<p>{inner}</p>')
        elif name in ('ul', 'ol'):
            items = [_inline(li, styles, images, ctx).strip() for li in b.find_all('li', recursive=False)]
            items = [i for i in items if i]
            if items:
                # Google Docs starts a new <ol>/<ul> at each indent level; merge consecutive lists of the same kind
                if parts and parts[-1].startswith(f'<{name}>'):
                    parts[-1] = parts[-1][:-len(f'</{name}>')] + ''.join(f'<li>{i}</li>' for i in items) + f'</{name}>'
                else:
                    parts.append(f'<{name}>' + ''.join(f'<li>{i}</li>' for i in items) + f'</{name}>')
        elif name == 'hr':
            parts.append('<hr>')
        elif name == 'table':
            rows = []
            for i, tr in enumerate(b.find_all('tr')):
                cell = 'th' if i == 0 else 'td'
                rows.append('<tr>' + ''.join(f'<{cell}>{_inline(td, styles, images, ctx).strip()}</{cell}>' for td in tr.find_all(['td', 'th'])) + '</tr>')
            if rows:
                parts.append('<div class="table-wrap"><table>' + ''.join(rows) + '</table></div>')
        elif name == 'div':
            inner = _inline(b, styles, images, ctx).strip()
            if inner:
                parts.append(f'<p>{inner}</p>')

    body_html = '\n'.join(parts)
    plain = re.sub(r'<[^>]+>', ' ', body_html)
    words = len(plain.split())
    summary = meta.get('summary', '')
    if not summary:
        first = next((re.sub(r'<[^>]+>', '', p) for p in parts if p.startswith('<p>')), '')
        first = html.unescape(first).strip()
        summary = first if len(first) <= 200 else first[:200].rsplit(' ', 1)[0] + '…'
    date = meta.get('date', '') if re.fullmatch(r'\d{4}-\d{2}-\d{2}', meta.get('date', '')) else created_date
    out = {
        'slug': slug, 'title': title.strip(), 'date': date, 'summary': summary,
        'topics': [t.strip() for t in meta.get('topics', '').split(',') if t.strip()],
        'projects': [p.strip() for p in meta.get('projects', '').split(',') if p.strip()],
        'readMinutes': max(1, math.ceil(words / 220)),
    }
    if 'first_image' in ctx:
        name, alt = ctx['first_image']
        out['cover'] = {'src': f'@ASSETS@/articles/{slug}/{name}.webp', 'alt': alt}
    return out, body_html, ctx['images']
