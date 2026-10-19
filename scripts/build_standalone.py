#!/usr/bin/env python3
"""Build the deployable site from the claude.ai version.

    python3 scripts/build_standalone.py

Reads  artifact/jein-site.html  (the page as published on claude.ai, which has no <html>/<head> wrapper)
Writes site/index.html          (a complete HTML document for any static host, e.g. Namecheap)

Edit the artifact file (or ask Claude to), then re-run this script before uploading.
Set CONTACT_ENDPOINT below once the contact endpoint in contact/server is deployed.
"""
import pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'artifact' / 'jein-site.html'
OUT = ROOT / 'site' / 'index.html'

CONTACT_ENDPOINT = ''          # e.g. 'https://jein-contact.<your-subdomain>.workers.dev/api/contact'
SITE_URL = 'https://YOUR-DOMAIN.com/'   # used for the canonical and social-share tags

page = SRC.read_text(encoding='utf-8')

# Everything before the skip link (title, meta, font links, the main <style>) belongs in <head>.
split = page.index('<a class="skip"')
head_part, body_part = page[:split], page[split:]
head_part = head_part.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '')

config = ''
if CONTACT_ENDPOINT:
    config = f'<script>window.JEIN_CONTACT_ENDPOINT = {CONTACT_ENDPOINT!r};</script>\n'

doc = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta property="og:type" content="website">
<meta property="og:title" content="J.E.I.N. — Joshua Elekwa Interactive Network">
<meta property="og:description" content="Business meets technology. Ideas become impact. Projects across business transformation, e-commerce, IT, web and community.">
<meta property="og:url" content="{SITE_URL}">
<link rel="canonical" href="{SITE_URL}">
<link rel="icon" type="image/webp" href="assets/jein-mark.webp">
<style>[hidden]{{display:none!important}} img{{max-width:100%}} body{{margin:0}}</style>
{head_part.strip()}
{config}</head>
<body>
{body_part.strip()}
</body>
</html>
'''
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(doc, encoding='utf-8')
print(f'Wrote {OUT.relative_to(ROOT)} ({len(doc)//1024} KB)' + ('' if CONTACT_ENDPOINT else ' — contact endpoint not set; the form will say sending is unavailable'))
