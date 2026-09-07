#!/usr/bin/env python3
"""T3/T4 smoke verification of the built single-file app."""
import asyncio, json, os
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.abspath(__file__))
URL = "file://" + os.path.join(os.path.dirname(ROOT), "work/index.html")

async def main():
    errors = []
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1600, "height": 900})
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        await page.goto(URL)
        await page.wait_for_timeout(800)

        async def shot(name):
            os.makedirs("shots", exist_ok=True)
            await page.screenshot(path=f"shots/{name}.png")
            print("shot", name)

        # world at 1000
        await shot("01_world_1000")

        # scrub to 1550 (slave trade rising, colonization)
        box = await page.locator("#scrub").bounding_box()
        def sx(year): return box["x"] + (year - 1000) / 1026 * box["width"]
        await page.mouse.click(sx(1550), box["y"] + box["height"] * 0.6)
        await page.wait_for_timeout(300)
        await shot("02_world_1550")

        # 1880 — the draft scene
        await page.mouse.click(sx(1880), box["y"] + box["height"] * 0.6)
        await page.wait_for_timeout(300)
        await shot("03_world_1880")

        # 1948 — partition era
        await page.mouse.click(sx(1948), box["y"] + box["height"] * 0.6)
        await page.wait_for_timeout(300)
        await shot("04_world_1948")

        # 2024 — modern crises
        await page.mouse.click(sx(2024), box["y"] + box["height"] * 0.6)
        await page.wait_for_timeout(300)
        await shot("05_world_2024")

        # T4: year label reflects scrub
        yr = await page.locator("#yearBig").inner_text()
        print("year label at ~2024:", yr)

        # zoom into South Asia at 1948 (wheel at a point over India)
        await page.mouse.click(sx(1948), box["y"] + box["height"] * 0.6)
        await page.wait_for_timeout(200)
        for _ in range(7):
            await page.mouse.move(1050, 480)
            await page.mouse.wheel(0, -240)
            await page.wait_for_timeout(60)
        await page.wait_for_timeout(400)
        await shot("06_zoom_southasia_1948")

        # pan test: drag and confirm no errors; then zoom out with buttons
        await page.mouse.move(800, 450)
        await page.mouse.down()
        await page.mouse.move(400, 450, steps=12)
        await page.mouse.up()
        await page.wait_for_timeout(200)
        await shot("07_after_pan")
        for _ in range(8):
            await page.click("#zoomOut")
        await page.wait_for_timeout(300)

        # playback: play for 3 seconds from 1840
        await page.mouse.click(sx(1840), box["y"] + box["height"] * 0.6)
        await page.click("#playBtn")
        await page.wait_for_timeout(3000)
        await page.click("#playBtn")
        yr2 = await page.locator("#yearBig").inner_text()
        print("year after 3s playback at 2x from 1840:", yr2)  # expect ~1840+3*2*(4..10)
        await shot("08_during_playback")

        # keyboard step
        await page.keyboard.press("ArrowRight")
        await page.wait_for_timeout(120)
        yr3 = await page.locator("#yearBig").inner_text()
        print("year after ArrowRight:", yr3)

        # jump next event
        await page.click("#nextEvt")
        await page.wait_for_timeout(120)
        print("year after nextEvt:", await page.locator("#yearBig").inner_text())

        # perf probe: measure frame time during play at densest era
        await page.mouse.click(sx(1890), box["y"] + box["height"] * 0.6)
        await page.click("#playBtn")
        ft = await page.evaluate("""() => new Promise(res => {
            const t = []; let last = performance.now(); let n = 0;
            function f(now){ t.push(now-last); last=now; if(++n<90) requestAnimationFrame(f);
                             else res(t.slice(10)); }
            requestAnimationFrame(f);
        })""")
        await page.click("#playBtn")
        ft.sort()
        mean = sum(ft) / len(ft)
        p95 = ft[int(len(ft) * 0.95)]
        print(f"frame time during 1890s playback: mean {mean:.1f}ms, p95 {p95:.1f}ms")

        await browser.close()
    print("JS errors:", errors if errors else "none")

asyncio.run(main())
