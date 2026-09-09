#!/usr/bin/env python3
"""T7 same-engine file/HTTP parity and T6 keyboard/dialog evidence on this OS.

No golden updates. Does not claim manual screen-reader or other-OS acceptance.
"""
import asyncio
import functools
import hashlib
import http.server
import io
import json
import os
from pathlib import Path
import platform
import threading

import numpy as np
from PIL import Image
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT.parent / 'work'
OUT = Path(os.environ.get('ATLAS_PACKAGING_REPORT', '/tmp/atlas-packaging.json'))

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

async def capture(browser, url, year):
    ctx = await browser.new_context(viewport={'width': 1600, 'height': 900}, reduced_motion='reduce')
    page = await ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    await page.goto(url)
    await page.wait_for_function('window.__atlas && __atlas.ready !== null')
    await page.evaluate('y => __atlas.setYear(y)', year)
    await page.wait_for_timeout(350)
    image = await page.screenshot()
    text = await page.locator('body').inner_text()
    await ctx.close()
    return image, text, errors

async def keyboard(browser, url):
    ctx = await browser.new_context(viewport={'width': 1400, 'height': 850})
    page = await ctx.new_page()
    await page.goto(url)
    await page.wait_for_function('window.__atlas && __atlas.ready !== null')
    checks = {}
    for button, modal in [('tableBtn','tableModal'),('aboutBtn','aboutModal')]:
        await page.locator('#'+button).focus()
        await page.keyboard.press('Enter')
        year = await page.evaluate('__atlas.year()')
        await page.keyboard.press('Shift+Tab')
        checks[modal+' reverse focus stays inside'] = await page.evaluate('(id)=>document.getElementById(id).contains(document.activeElement)', modal)
        await page.keyboard.press('Tab')
        checks[modal+' forward focus wraps to close'] = await page.evaluate('(id)=>document.activeElement===document.querySelector("#"+id+" .xBtn")', modal)
        await page.keyboard.press('ArrowRight')
        checks[modal+' reading does not scrub background'] = await page.evaluate('__atlas.year()') == year
        await page.keyboard.press('Escape')
        checks[modal+' closing restores opener'] = await page.evaluate('(id)=>document.activeElement.id===id',button)
    await page.locator('#tableBtn').focus()
    await page.keyboard.press('Enter')
    row = page.locator('#dataTable tbody tr').filter(has_text='Venezuelan exodus')
    await row.focus()
    await page.keyboard.press('Enter')
    checks['keyboard row opens stock-labelled detail'] = 'Reported population abroad' in await page.locator('#dpBody').inner_text()
    checks['detail qualifies aggregate geography'] = 'schematically' in await page.locator('#dpBody').inner_text()
    await ctx.close()
    return checks

async def main():
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(WORK)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    report = {'platform':platform.platform(), 'bundle_sha256':hashlib.sha256((WORK/'index.html').read_bytes()).hexdigest(), 'engines':{}}
    try:
        async with async_playwright() as p:
            for engine in ['chromium','firefox','webkit']:
                browser = await getattr(p,engine).launch()
                checks={}
                urls=[(WORK/'index.html').as_uri(),f'http://127.0.0.1:{server.server_port}/index.html']
                for year in [1100,1500,1750,1880,1950,2024]:
                    file_img, file_text, file_errors=await capture(browser,urls[0],year)
                    http_img, http_text, http_errors=await capture(browser,urls[1],year)
                    a=np.asarray(Image.open(io.BytesIO(file_img)).convert('RGB')).astype(int)
                    b=np.asarray(Image.open(io.BytesIO(http_img)).convert('RGB')).astype(int)
                    difference=float((np.abs(a-b)>16).any(axis=2).mean())
                    checks[str(year)]={'pixel_difference':difference,'pass':difference<=0.005 and file_text==http_text and not file_errors and not http_errors}
                for transport,url in zip(['file','http'],urls):
                    checks[transport+' keyboard']=await keyboard(browser,url)
                report['engines'][engine]=checks
                OUT.write_text(json.dumps(report,indent=2)+'\n')
                print(engine, json.dumps(checks),flush=True)
                await browser.close()
    finally:
        server.shutdown()
    assert all(v['pass'] if 'pass' in v else all(v.values()) for e in report['engines'].values() for v in e.values()), 'packaging or keyboard check failed'

asyncio.run(main())
