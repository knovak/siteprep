#!/usr/bin/env python3
"""T7: cross-browser smoke — load, render, interact on Chromium, Firefox, WebKit."""
import asyncio, os, sys
import numpy as np
from PIL import Image
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUNDLE = os.path.join(os.path.dirname(ROOT), "work/index.html")
URL = "file://" + BUNDLE

results = []
def check(name, cond, detail=""):
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL "), name, "" if cond else f"  <- {detail}")

def color_count(path, rgb, tol=26):
    a = np.asarray(Image.open(path).convert("RGB")).astype(int)
    m = (abs(a[..., 0] - rgb[0]) < tol) & (abs(a[..., 1] - rgb[1]) < tol) & (abs(a[..., 2] - rgb[2]) < tol)
    return int(m.sum())

async def smoke(p, engine):
    browser = await getattr(p, engine).launch()
    pg = await browser.new_page(viewport={"width": 1400, "height": 850})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto(URL)
    await pg.wait_for_timeout(1200)

    # app booted with test hooks
    ready = await pg.evaluate("() => window.__atlas && __atlas.ready != null")
    check(f"T7 {engine}: app boots", ready)

    # render 1880 and confirm land + weur flows present in pixels
    await pg.evaluate("() => __atlas.setYear(1880)")
    await pg.wait_for_timeout(300)
    shot = f"/tmp/t7_{engine}_1880.png"
    await pg.screenshot(path=shot)
    check(f"T7 {engine}: land renders", color_count(shot, (0x1f, 0x54, 0x5c)) > 30000)
    check(f"T7 {engine}: flows render @1880", color_count(shot, (0x5a, 0xa2, 0xf0)) > 3000)

    # click the mass-migration arc -> detail panel
    px = await pg.evaluate("() => __atlas.findPixelFor('european-mass-migration')")
    check(f"T7 {engine}: hit-test works", px is not None)
    if px:
        await pg.mouse.click(px[0], px[1])
        await pg.wait_for_timeout(250)
        check(f"T7 {engine}: click opens detail", await pg.locator("#detailPanel").is_visible())

    # wheel zoom + drag pan don't error
    await pg.mouse.move(700, 400)
    await pg.mouse.wheel(0, -240)
    await pg.mouse.move(700, 400)
    await pg.mouse.down()
    await pg.mouse.move(500, 380, steps=6)
    await pg.mouse.up()
    await pg.wait_for_timeout(300)
    cam = await pg.evaluate("() => __atlas.cam()")
    finite = all(isinstance(v, (int, float)) and v == v for v in cam.values())
    check(f"T7 {engine}: pan/zoom camera finite", finite, str(cam))

    # playback advances
    await pg.evaluate("() => __atlas.setYear(1840)")
    await pg.click("#playBtn")
    await pg.wait_for_timeout(1200)
    await pg.click("#playBtn")
    y = await pg.evaluate("() => __atlas.year()")
    check(f"T7 {engine}: playback advances", 1841 < y < 1900, f"year={y}")

    check(f"T7 {engine}: zero JS errors", not errs, str(errs[:2]))
    await browser.close()

async def main():
    async with async_playwright() as p:
        for engine in ("chromium", "firefox", "webkit"):
            print(f"== {engine} ==")
            try:
                await smoke(p, engine)
            except Exception as e:
                check(f"T7 {engine}: suite ran", False, str(e)[:160])
    npass = sum(1 for _, c in results if c)
    print(f"\n{npass}/{len(results)} cross-browser checks passed")
    return 0 if npass == len(results) else 1

sys.exit(asyncio.run(main()))
