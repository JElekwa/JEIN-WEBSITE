#!/usr/bin/env python3
"""Publish articles from a Google Drive folder to the site (run hourly by .github/workflows/publish-articles.yml).

    GDRIVE_SERVICE_ACCOUNT='{…json key…}' DRIVE_READY_FOLDER_ID=<folder id> python3 scripts/sync_drive.py

• Every Google Doc in the "Ready to publish" folder becomes an article: content/articles/<slug>.json, with its
  images in content/articles/img/<slug>/ (converted to WebP, at most 1600 px wide).
• A doc that changed since the last run is converted again; one that was moved out of the folder (or deleted) is
  unpublished. Nothing else in the repository is touched.
• The run prints what changed and, inside GitHub Actions, sets the outputs `changed` and `summary`.
Without the two settings it exits quietly, so the hourly job stays green until the Google setup is done.
"""
import io, json, os, pathlib, shutil, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'content' / 'articles'
IMG = OUT / 'img'
sys.path.insert(0, str(ROOT / 'scripts'))


def output(name, value):
    path = os.environ.get('GITHUB_OUTPUT')
    if path:
        with open(path, 'a', encoding='utf-8') as f:
            f.write(f'{name}={value}\n')


def webp(data):
    from PIL import Image
    im = Image.open(io.BytesIO(data))
    im = im.convert('RGBA') if im.mode in ('P', 'LA', 'RGBA') else im.convert('RGB')
    if im.width > 1600:
        im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=80, method=6)
    return buf.getvalue()


def main():
    key, folder = os.environ.get('GDRIVE_SERVICE_ACCOUNT', '').strip(), os.environ.get('DRIVE_READY_FOLDER_ID', '').strip()
    if not key or not folder:
        print('Google Drive publishing is not set up yet (GDRIVE_SERVICE_ACCOUNT / DRIVE_READY_FOLDER_ID missing). Nothing to do.')
        output('changed', 'false')
        return
    from google.oauth2 import service_account
    from googleapiclient.discovery import build

    creds = service_account.Credentials.from_service_account_info(json.loads(key), scopes=['https://www.googleapis.com/auth/drive.readonly'])
    sync(build('drive', 'v3', credentials=creds, cache_discovery=False), folder)


def sync(drive, folder):
    """Bring content/articles/ in line with the folder. `drive` is a googleapiclient Drive v3 service (or a test fake)."""
    from gdoc_convert import convert
    files, token = [], None
    while True:
        r = drive.files().list(q=f"'{folder}' in parents and mimeType='application/vnd.google-apps.document' and trashed=false",
                               fields='nextPageToken, files(id, name, modifiedTime, createdTime)', pageSize=100, pageToken=token,
                               supportsAllDrives=True, includeItemsFromAllDrives=True).execute()
        files += r.get('files', [])
        token = r.get('nextPageToken')
        if not token:
            break

    OUT.mkdir(parents=True, exist_ok=True)
    existing = {}
    for p in OUT.glob('*.json'):
        a = json.loads(p.read_text(encoding='utf-8'))
        existing[a.get('source_id')] = (p, a)

    published, updated, removed, skipped = [], [], [], []
    used_slugs = {a['slug'] for _, a in existing.values()}
    for f in files:
        prev = existing.get(f['id'])
        if prev and prev[1].get('modified') == f['modifiedTime']:
            continue
        zip_bytes = drive.files().export(fileId=f['id'], mimeType='application/zip').execute()
        meta, body_html, images = convert(zip_bytes, f['name'], f['createdTime'][:10])
        if not body_html.strip():
            skipped.append(f['name'])
            continue
        if prev:                                   # keep the published address even if the title changes
            fresh, kept = meta['slug'], prev[1]['slug']
            meta['slug'] = kept
            body_html = body_html.replace(f'@ASSETS@/articles/{fresh}/', f'@ASSETS@/articles/{kept}/')
            if meta.get('cover'):
                meta['cover']['src'] = meta['cover']['src'].replace(f'/articles/{fresh}/', f'/articles/{kept}/')
        else:
            base, n = meta['slug'], 2
            while meta['slug'] in used_slugs:      # two docs with the same title get distinct addresses
                meta['slug'] = f'{base}-{n}'; n += 1
            if meta['slug'] != base:
                body_html = body_html.replace(f'@ASSETS@/articles/{base}/', f"@ASSETS@/articles/{meta['slug']}/")
                if meta.get('cover'):
                    meta['cover']['src'] = meta['cover']['src'].replace(f'/articles/{base}/', f"/articles/{meta['slug']}/")
        used_slugs.add(meta['slug'])
        img_dir = IMG / meta['slug']
        if img_dir.exists():
            shutil.rmtree(img_dir)
        for name, data in images:
            img_dir.mkdir(parents=True, exist_ok=True)
            (img_dir / f'{name}.webp').write_bytes(webp(data))
        record = dict(meta, body_html=body_html, source_id=f['id'], modified=f['modifiedTime'])
        if prev and prev[0].name != f"{meta['slug']}.json":
            prev[0].unlink()
        (OUT / f"{meta['slug']}.json").write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        (updated if prev else published).append(meta['title'])

    live = {f['id'] for f in files}
    for source_id, (p, a) in existing.items():
        if source_id not in live:
            p.unlink()
            if (IMG / a['slug']).exists():
                shutil.rmtree(IMG / a['slug'])
            removed.append(a['title'])

    for label, items in (('Published', published), ('Updated', updated), ('Unpublished', removed), ('Skipped (empty)', skipped)):
        for t in items:
            print(f'{label}: {t}')
    changed = bool(published or updated or removed)
    summary = '; '.join(x for x in (
        f"published {', '.join(published)}" if published else '', f"updated {', '.join(updated)}" if updated else '',
        f"unpublished {', '.join(removed)}" if removed else '') if x)
    print(summary or 'No changes.')
    output('changed', 'true' if changed else 'false')
    output('summary', summary.replace('\n', ' ')[:200] or 'no changes')


if __name__ == '__main__':
    main()
