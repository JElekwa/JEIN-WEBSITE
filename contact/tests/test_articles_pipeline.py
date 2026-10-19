"""Google Docs → article pipeline: converter rules and the publish / update / unpublish sync, with a fake Drive.
Usage: python3 tests/test_articles_pipeline.py      (needs beautifulsoup4 and Pillow; no Google account)"""
import io, json, pathlib, shutil, sys, tempfile, unittest, zipfile

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts'))
import gdoc_convert as gc
import sync_drive

def png():
    from PIL import Image
    b = io.BytesIO(); Image.new('RGB', (2400, 1200), (184, 138, 54)).save(b, 'PNG'); return b.getvalue()

# shaped like a real Google Docs "Download → Web page (.html, zipped)" export
DOC = """<html><head><meta content="text/html; charset=UTF-8" http-equiv="content-type">
<style type="text/css">.c1{font-weight:700}.c2{font-style:italic}.c3{color:#000000;font-size:11pt}.title{font-size:26pt}</style></head>
<body class="c9 doc-content">
<p class="c3 title"><span>Ignored doc title</span></p>
<p class="c3"><span>Summary: Why last-mile delivery decides whether online orders feel instant.</span></p>
<p class="c3"><span>Topics: Logistics, E-commerce</span></p>
<p class="c3"><span>Date: 2026-11-03</span></p>
<p class="c3"><span>Projects: last-mile-wholesale</span></p>
<p class="c3"><span>---</span></p>
<p class="c3"><span>Online shoppers judge a store by the parcel, </span><span class="c1">not the website</span><span class="c2"> alone</span><span>.</span></p>
<p class="c3"><span></span></p>
<h1 class="c4"><span class="c1">Where value leaks</span></h1>
<p class="c3"><span>Read the </span><span><a href="https://www.google.com/url?q=https://example.com/report&amp;sa=D&amp;source=editors&amp;ust=1">full report</a></span><span>.</span></p>
<ul class="lst-kix_a-0 start"><li class="c3 li-bullet-0"><span>Sourcing</span></li><li class="c3 li-bullet-0"><span>Packing</span></li></ul>
<ul class="lst-kix_a-0"><li class="c3 li-bullet-0"><span>Delivery</span></li></ul>
<p class="c3"><span style="overflow: hidden; display: inline-block;"><img alt="A delivery van at dawn" src="images/image1.png" style="width: 624px;" title=""></span></p>
<h2><span>Numbers</span></h2>
<table><tr><td><p><span>Step</span></p></td><td><p><span>Days</span></p></td></tr><tr><td><p><span>Ship</span></p></td><td><p><span>2</span></p></td></tr></table>
<p><span><a href="javascript:alert(1)">bad link</a></span><script>alert(1)</script></p>
<hr>
</body></html>"""

def export_zip(doc=DOC, with_image=True):
    b = io.BytesIO()
    with zipfile.ZipFile(b, 'w') as z:
        z.writestr('Article.html', doc)
        if with_image:
            z.writestr('images/image1.png', png())
    return b.getvalue()


class Converter(unittest.TestCase):
    def setUp(self):
        self.meta, self.body, self.images = gc.convert(export_zip(), 'Last-mile delivery, explained', '2026-10-30')

    def test_metadata(self):
        m = self.meta
        self.assertEqual(m['slug'], 'last-mile-delivery-explained')
        self.assertEqual(m['title'], 'Last-mile delivery, explained')
        self.assertEqual(m['date'], '2026-11-03')
        self.assertEqual(m['topics'], ['Logistics', 'E-commerce'])
        self.assertEqual(m['projects'], ['last-mile-wholesale'])
        self.assertTrue(m['summary'].startswith('Why last-mile delivery'))
        self.assertEqual(m['cover'], {'src': '@ASSETS@/articles/last-mile-delivery-explained/image1.webp', 'alt': 'A delivery van at dawn'})

    def test_metadata_lines_and_doc_title_are_not_in_the_body(self):
        for s in ('Summary:', 'Topics:', '---', 'Ignored doc title'):
            self.assertNotIn(s, self.body)

    def test_formatting_kept_styles_dropped(self):
        self.assertIn('<strong>not the website</strong>', self.body)
        self.assertIn('<em> alone</em>', self.body)
        self.assertIn('<h2>Where value leaks</h2>', self.body)
        self.assertIn('<h3>Numbers</h3>', self.body)
        self.assertNotIn('class=', self.body.replace('class="table-wrap"', ''))
        self.assertNotIn('style=', self.body)

    def test_google_link_unwrapped_and_unsafe_dropped(self):
        self.assertIn('<a href="https://example.com/report" target="_blank" rel="noopener">full report</a>', self.body)
        self.assertNotIn('javascript:', self.body)
        self.assertNotIn('<script', self.body)
        self.assertIn('bad link', self.body)

    def test_split_lists_merged_and_tables_kept(self):
        self.assertIn('<ul><li>Sourcing</li><li>Packing</li><li>Delivery</li></ul>', self.body)
        self.assertIn('<div class="table-wrap"><table><tr><th>Step</th><th>Days</th></tr><tr><td>Ship</td><td>2</td></tr></table></div>', self.body)

    def test_images_become_figures_with_alt(self):
        self.assertIn('<figure><img src="@ASSETS@/articles/last-mile-delivery-explained/image1.webp" alt="A delivery van at dawn" loading="lazy"></figure>', self.body)
        self.assertEqual(len(self.images), 1)

    def test_without_metadata_block_everything_is_body(self):
        doc = '<html><body><p><span>Just a first paragraph that becomes the summary.</span></p><p><span>More.</span></p></body></html>'
        m, body, _ = gc.convert(export_zip(doc, False), 'Plain', '2026-10-30')
        self.assertEqual(m['date'], '2026-10-30')
        self.assertEqual(m['summary'], 'Just a first paragraph that becomes the summary.')
        self.assertIn('<p>More.</p>', body)
        self.assertNotIn('cover', m)


class FakeDrive:
    """Just enough of the Drive v3 client for sync(): files().list(...).execute() and files().export(...).execute()."""
    def __init__(self): self.docs = {}
    def files(self): return self
    def list(self, **kw): return _Exec({'files': [dict(id=i, **{k: v for k, v in d.items() if k != 'zip'}) for i, d in self.docs.items()]})
    def export(self, fileId, mimeType): return _Exec(self.docs[fileId]['zip'])
class _Exec:
    def __init__(self, v): self.v = v
    def execute(self): return self.v


class Sync(unittest.TestCase):
    def setUp(self):
        self.tmp = pathlib.Path(tempfile.mkdtemp())
        sync_drive.OUT, sync_drive.IMG = self.tmp / 'articles', self.tmp / 'articles' / 'img'
        self.drive = FakeDrive()
        self.drive.docs['doc1'] = {'name': 'Last-mile delivery, explained', 'modifiedTime': '2026-11-01T10:00:00Z', 'createdTime': '2026-10-30T09:00:00Z', 'zip': export_zip()}
    def tearDown(self): shutil.rmtree(self.tmp)
    def articles(self): return {p.stem: json.loads(p.read_text(encoding='utf-8')) for p in sync_drive.OUT.glob('*.json')}

    def test_publish_update_rename_unpublish(self):
        sync_drive.sync(self.drive, 'folder')
        a = self.articles()
        self.assertEqual(list(a), ['last-mile-delivery-explained'])
        img = sync_drive.IMG / 'last-mile-delivery-explained' / 'image1.webp'
        self.assertTrue(img.exists())
        from PIL import Image
        with Image.open(img) as im:
            self.assertEqual(im.width, 1600, 'large images are scaled to 1600 px')

        before = img.stat().st_mtime_ns
        sync_drive.sync(self.drive, 'folder')               # unchanged doc: nothing rewritten
        self.assertEqual(img.stat().st_mtime_ns, before)

        self.drive.docs['doc1'].update(name='A new title', modifiedTime='2026-11-02T10:00:00Z')
        sync_drive.sync(self.drive, 'folder')               # edited and renamed: same address, new title
        a = self.articles()
        self.assertEqual(list(a), ['last-mile-delivery-explained'])
        self.assertEqual(a['last-mile-delivery-explained']['title'], 'A new title')
        self.assertIn('@ASSETS@/articles/last-mile-delivery-explained/image1.webp', a['last-mile-delivery-explained']['body_html'])

        self.drive.docs['doc2'] = dict(self.drive.docs['doc1'], name='A new title')
        sync_drive.sync(self.drive, 'folder')               # a second doc with the same title gets its own address
        self.assertEqual(sorted(self.articles()), ['a-new-title', 'last-mile-delivery-explained'])

        del self.drive.docs['doc1']
        sync_drive.sync(self.drive, 'folder')               # moved out of "Ready to publish": unpublished
        self.assertEqual(list(self.articles()), ['a-new-title'])
        self.assertFalse((sync_drive.IMG / 'last-mile-delivery-explained').exists())

    def test_not_configured_is_a_quiet_no_op(self):
        import os
        for k in ('GDRIVE_SERVICE_ACCOUNT', 'DRIVE_READY_FOLDER_ID'):
            os.environ.pop(k, None)
        sync_drive.main()                                   # must not raise


if __name__ == '__main__':
    unittest.main(verbosity=1)
