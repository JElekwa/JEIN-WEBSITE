"""End-to-end UI checks for the guided contact, run in headless Chromium against the real page.

A fake `window.claude` stands in for the claude.ai page store so writes can be inspected and
failures simulated. Usage: python3 tests/ui_flow.py /path/to/jein-site.html
"""
import json, sys, pathlib
from playwright.sync_api import sync_playwright

PAGE = pathlib.Path(sys.argv[1]).read_text()
import tempfile
TMP = pathlib.Path(tempfile.gettempdir()) / 'jein-test.html'
HTML = ('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" '
        'content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>' + PAGE + '</body></html>')
TMP.write_text(HTML)
URL = TMP.as_uri()

MOCK = """
window.__writes = []; window.__fail = %s; window.__delay = 150;
const ref = path => ({
  set: data => new Promise((res, rej) => setTimeout(() => {
    if (window.__fail) return rej({code:'unavailable'});
    window.__writes.push({path, data}); res();
  }, window.__delay)),
});
const dbApi = { doc: p => ref(p), collection: c => ({ doc: id => ref(c + '/' + id) }) };
window.claude = { use: async name => name === 'db' ? dbApi : name === 'user'
  ? { id: async () => 'u_test', can: async () => true, isOwner: () => false } : null };
"""

results = []
def check(name, cond, detail=''):
    results.append((name, bool(cond), detail))

def new_page(browser, fail=False, mobile=False, rm=False, home=False):
    ctx = browser.new_context(viewport={'width': 390, 'height': 844} if mobile else {'width': 1280, 'height': 900},
                              reduced_motion='reduce' if rm else 'no-preference')
    ctx.route('http*://**/*', lambda r: r.abort())
    pg = ctx.new_page()
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.add_init_script(MOCK % ('true' if fail else 'false'))
    pg.goto(URL + ('' if home else '#connect'), wait_until='domcontentloaded')
    pg.wait_for_timeout(300)
    return ctx, pg, errors

def pick(pg, path):
    pg.locator(f'#cx-path-{path}').check(force=True)
    pg.click('#cx-start')

def step1(pg, role='Recruiter or hiring manager', name='Jordan Lee', company='Example Company', industry='Technology and IT', submit=False):
    pg.fill('#cx-name', name)
    pg.select_option('#cx-role', role)
    if company: pg.fill('#cx-company', company)
    if industry: pg.select_option('#cx-industry', industry)
    if submit: pg.click('#cx-next')

with sync_playwright() as p:
    import os
    _exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
    _ch = os.environ.get('PW_CHANNEL')  # e.g. PW_CHANNEL=msedge to use the installed Edge instead of a downloaded Chromium
    b = p.chromium.launch(channel=_ch) if _ch else p.chromium.launch(executable_path=_exe) if os.path.exists(_exe) else p.chromium.launch()

    # 1. all six cards: confirmation, path-specific topics and follow-ups on one step, then reply + send
    paths = ['hire', 'collaborate', 'business', 'media', 'community', 'other']
    for path in paths:
        ctx, pg, errs = new_page(b)
        pg.locator(f'#cx-path-{path}').check(force=True)
        check(f'[{path}] confirmation appears', pg.is_visible('#cx-confirm') and pg.inner_text('#cx-confirm-copy') != '')
        pg.click('#cx-start')
        check(f'[{path}] step 1 of 2', 'Step 1 of 2' in pg.text_content('#cx-step-count'))
        step1(pg)
        topics = pg.eval_on_selector_all('#cx-topic option', 'o => o.map(x => x.value).filter(Boolean)')
        expected = pg.evaluate(f'JEINContact.PATHS["{path}"].topics')
        check(f'[{path}] topics match card', topics == expected, str(topics[:2]))
        fus = pg.eval_on_selector_all('[data-fu]:not([id$=Other])', 'e => e.map(x => x.dataset.fu)')
        check(f'[{path}] follow-ups shown on the same step', fus == pg.evaluate(f'JEINContact.PATHS["{path}"].followups.map(f=>f.id)') and pg.is_visible('#cx-topic') and pg.is_visible('#cx-name'), str(fus))
        pg.select_option('#cx-topic', expected[0]); pg.click('#cx-next')
        check(f'[{path}] step 2 of 2 with preview', 'Step 2 of 2' in pg.text_content('#cx-step-count') and pg.is_visible('#cx-email') and pg.is_visible('#cx-review'))
        pg.fill('#cx-email', 'jordan@example.com'); pg.check('#cx-privacy')
        check(f'[{path}] preview updates live', 'jordan@example.com' in pg.inner_text('#cx-review'))
        pg.wait_for_timeout(5000)  # respect the minimum fill time
        pg.click('#cx-next'); pg.wait_for_selector('#cx-done:not([hidden])', timeout=4000)
        msgs = [x for x in pg.evaluate('window.__writes') if '/messages/' in x['path']]
        check(f'[{path}] one message written with connection type', len(msgs) == 1 and msgs[0]['data']['path'] == path)
        check(f'[{path}] no page errors', not errs, '; '.join(errs))
        ctx.close()

    # 2. Other fields, validation, back/continue persistence, preview text
    ctx, pg, errs = new_page(b)
    pick(pg, 'hire')
    pg.click('#cx-next')
    check('required name/role/topic errors shown together', pg.inner_text('#err-name') and pg.inner_text('#err-role') and pg.inner_text('#err-topic'))
    check('focus moves to first invalid field', pg.evaluate('document.activeElement.id') == 'cx-name')
    pg.fill('#cx-name', 'Jordan Lee'); pg.select_option('#cx-role', 'Other')
    check('role Other reveals text field', pg.is_visible('#cx-roleOther'))
    pg.select_option('#cx-industry', 'Other'); check('industry Other reveals text field', pg.is_visible('#cx-industryOther'))
    pg.select_option('#cx-topic', 'Other'); check('topic Other reveals text', pg.is_visible('#cx-topicOther'))
    pg.fill('#cx-fu-link', 'not a url'); pg.click('#cx-next')
    check('Other texts required', pg.inner_text('#err-roleOther') and pg.inner_text('#err-industryOther') and pg.inner_text('#err-topicOther'))
    check('bad follow-up URL rejected', pg.inner_text('#err-fu_link') != '')
    pg.fill('#cx-roleOther', 'Operations lead'); pg.fill('#cx-industryOther', 'Logistics'); pg.fill('#cx-topicOther', 'Warehouse automation')
    pg.fill('#cx-fu-opportunity', 'A systems analyst role'); pg.fill('#cx-fu-link', 'example.com/job'); pg.click('#cx-next')
    check('valid step 1 moves to step 2', 'Step 2 of 2' in pg.text_content('#cx-step-count'))
    pg.click('#cx-back')
    check('back keeps answers', pg.input_value('#cx-roleOther') == 'Operations lead' and pg.input_value('#cx-fu-link') == 'example.com/job')
    pg.click('#cx-next')
    pg.wait_for_timeout(5000)  # respect the minimum fill time, otherwise Send answers "That was quick" before validating
    pg.fill('#cx-email', 'jordan@'); pg.click('#cx-next'); pg.wait_for_timeout(200)
    check('invalid email rejected', 'name@example.com' in pg.inner_text('#err-email'))
    pg.fill('#cx-email', 'jordan@example.com'); pg.check('#cx-rm-linkedin', force=True); pg.click('#cx-next'); pg.wait_for_timeout(200)
    check('LinkedIn reply needs LinkedIn URL', pg.inner_text('#err-linkedin') != '')
    pg.check('#cx-rm-email', force=True); pg.click('#cx-next'); pg.wait_for_timeout(200)
    check('privacy acknowledgement required', pg.inner_text('#err-privacyAccepted') != '')
    pg.check('#cx-privacy')
    intro = pg.inner_text('#cx-review .intro')
    check('summary reflects answers only', intro == 'Hi, my name is Jordan Lee. I am an operations lead working in logistics. I would like to connect about warehouse automation.', intro)
    review = pg.inner_text('#cx-review')
    check('preview lists follow-ups', 'A systems analyst role' in review and 'https://example.com/job' in review)
    check('send button label', 'Send my introduction' in pg.inner_text('#cx-next'))
    pg.click('#cx-edit'); check('Edit answers returns to step 1', 'Step 1 of 2' in pg.text_content('#cx-step-count'))
    ctx.close()

    # 3. duplicate prevention + failure state keeps answers, then retry with same id
    ctx, pg, errs = new_page(b, fail=True)
    pick(pg, 'collaborate'); step1(pg)
    pg.select_option('#cx-topic', 'Automation or systems improvement')
    pg.select_option('#cx-fu-stage', 'Other'); pg.click('#cx-next')
    check('stage Other text required', pg.inner_text('#err-fu_stageOther') != '')
    pg.fill('#cx-fu-stageOther', 'Pilot'); pg.click('#cx-next')
    pg.fill('#cx-email', 'jordan@example.com'); pg.check('#cx-privacy')
    pg.wait_for_timeout(5000)
    pg.click('#cx-next'); pg.wait_for_timeout(600)
    check('failure shows error, no success', 'be saved' in pg.text_content('#cx-msg') and pg.is_hidden('#cx-done'), pg.text_content('#cx-msg'))
    check('failure keeps answers', 'Pilot' in pg.inner_text('#cx-review'))
    pg.evaluate('window.__fail = false; window.__delay = 600')
    pg.evaluate("document.querySelector('#cx-next').click(); document.querySelector('#cx-next').click(); document.querySelector('#cx-form').requestSubmit()")
    pg.wait_for_selector('#cx-done:not([hidden])', timeout=5000)
    msgs = [x for x in pg.evaluate('window.__writes') if '/messages/' in x['path']]
    check('rapid triple submit writes once', len(msgs) == 1, str(len(msgs)))
    check('record has consent + timestamp + source', msgs and msgs[0]['data']['privacyAccepted'] is True and msgs[0]['data']['submittedAt'] and msgs[0]['data']['source'] == 'J.E.I.N. Website Contact')
    ctx.close()

    # 4. entry points and persistence of selection
    ctx, pg, errs = new_page(b, home=True)
    pg.click('.hero-actions a[href="#connect"]'); pg.wait_for_timeout(300)
    check('hero Start a conversation reaches contact', pg.evaluate("location.hash") == '#connect')
    pg.wait_for_timeout(400); pg.click('.aud button[data-inquiry="business"]'); pg.wait_for_timeout(700)
    check('chapter-06 button preselects card', pg.is_checked('#cx-path-business') and pg.is_visible('#cx-confirm'))
    pg.click('#cx-start'); pg.fill('#cx-name', 'Sam')
    pg.wait_for_timeout(400)
    pg.click('#cx-change-path')
    check('change path keeps selection', pg.is_checked('#cx-path-business'))
    pg.locator('#cx-path-business').focus(); pg.keyboard.press('ArrowRight')
    check('arrow keys move between cards', pg.evaluate('document.activeElement.id') != 'cx-path-business' and pg.is_visible('#cx-confirm'))
    ctx.close()

    # 5. no backend: honest message, nothing claimed
    ctx = b.new_context(); ctx.route('http*://**/*', lambda r: r.abort())
    pg = ctx.new_page(); pg.goto(URL + '#connect'); pg.wait_for_timeout(400)
    check('no-backend notice shown', 'isn’t available' in pg.inner_text('#cx-delivery'))
    ctx.close()

    # 6. mobile + reduced motion: no horizontal overflow, cards one column
    ctx, pg, errs = new_page(b, mobile=True, rm=True)
    ow = pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
    check('mobile: no horizontal overflow', ow <= 0, str(ow))
    pick(pg, 'media')
    ow = pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
    check('mobile form: no horizontal overflow', ow <= 0, str(ow))
    h = pg.evaluate("getComputedStyle(document.querySelector('#cx-next')).minHeight")
    check('mobile: tap targets ≥ 44px', h in ('46px', '44px') or int(float(h.rstrip('px'))) >= 44, h)
    anim = pg.evaluate("getComputedStyle(document.querySelector('.cx-card')).animationName")
    check('reduced motion: card animation off', anim == 'none', anim)
    ctx.close()
    b.close()

fails = [r for r in results if not r[1]]
for n, ok, d in results:
    print(('PASS ' if ok else 'FAIL ') + n + (f'  [{d}]' if d and not ok else ''))
print(f'\n{len(results) - len(fails)}/{len(results)} passed')
sys.exit(1 if fails else 0)
