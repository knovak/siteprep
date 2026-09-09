#!/usr/bin/env python3
"""T3 (visual regression) + T4 (interaction) + T5 (performance) + T6 (a11y).

Usage:
  python3 tests/test_browser.py --update-goldens   # regenerate golden images
  python3 tests/test_browser.py                    # run all gates
"""
import asyncio, os, sys, json
import numpy as np
from PIL import Image
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUNDLE = os.path.join(os.path.dirname(ROOT), "work/index.html")
URL = "file://" + BUNDLE
GOLD = os.path.join(ROOT, "tests/goldens")
UPDATE = "--update-goldens" in sys.argv

# T3 golden states: (name, year, camera{rot,k,cyFrac}, reduced_motion, setup_clicks)
STATES = [
    ("g1_1100_world",   1100, None, False, []),
    ("g2_1500_world",   1500, None, False, []),
    ("g3_1750_atlantic",1750, {"rot": 40, "k": 1.8, "cyFrac": 0.5}, False, []),
    ("g4_1880_world",   1880, None, False, []),
    ("g5_1950_sasia",   1950, {"rot": -76, "k": 6, "cyFrac": 1.72}, False, []),
    ("g6_2024_world",   2024, None, False, []),
    ("g7_1880_reduced", 1880, None, True, []),
    ("g8_2015_region_legend", 2015, None, False, ["#colorModeBtn", "#legendBtn"]),
]
DIFF_THRESHOLD = 0.005   # ≤0.5% of pixels may differ
PIXEL_TOL = 16           # per-channel difference that counts as "different"

results = []
def check(name, cond, detail=""):
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL "), name, "" if cond else f"  <- {detail}")

def img_diff(a_path, b_path):
    a = np.asarray(Image.open(a_path).convert("RGB")).astype(int)
    b = np.asarray(Image.open(b_path).convert("RGB")).astype(int)
    if a.shape != b.shape: return 1.0
    d = (np.abs(a - b) > PIXEL_TOL).any(axis=2)
    return d.mean()

async def snap_state(pg, name, yr, camset, clip, setup=()):
    for sel in setup:
        await pg.click(sel)
        await pg.wait_for_timeout(120)
    if camset: await pg.evaluate("c => __atlas.setCamera(c)", camset)
    else:      await pg.evaluate("() => __atlas.setCamera({rot:0, k:1, cyFrac:null})")
    await pg.evaluate("y => __atlas.setYear(y)", yr)
    await pg.wait_for_timeout(320)   # allow LOD settle
    await pg.evaluate("y => __atlas.setYear(y)", yr)  # re-render after LOD
    await pg.wait_for_timeout(120)
    path = os.path.join(GOLD if UPDATE else "/tmp", name + ".png")
    await pg.screenshot(path=path, clip=clip)
    return path

async def main():
    ok_all = True
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=["--js-flags=--expose-gc", "--enable-precise-memory-info"])

        # =========== T3: golden screenshots ===========
        print("== T3 visual regression ==")
        for name, yr, camset, reduced, setup in STATES:
            ctx = await browser.new_context(
                viewport={"width": 1600, "height": 900},
                reduced_motion="reduce" if reduced else "no-preference")
            pg = await ctx.new_page()
            errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            await pg.goto(URL); await pg.wait_for_timeout(600)
            clip = {"x": 0, "y": 0, "width": 1600, "height": 808}  # map area only
            path = await snap_state(pg, name, yr, camset, clip, setup)
            if name == "g5_1950_sasia":
                target = await pg.evaluate("() => __atlas.project([76, 29])")
                check("T3 South Asia golden includes Punjab", 0 < target[0] < 1600
                      and 0 < target[1] < 808, str(target))
            gold = os.path.join(GOLD, name + ".png")
            if UPDATE:
                print("  wrote golden", name)
            else:
                if not os.path.exists(gold):
                    check(f"T3 golden exists: {name}", False, "missing golden"); continue
                frac = img_diff(path, gold)
                check(f"T3 {name} matches golden", frac <= DIFF_THRESHOLD, f"{frac*100:.2f}% pixels differ")
            check(f"T3 {name} no JS errors", not errs, str(errs[:1]))
            await ctx.close()
        if UPDATE:
            print("goldens updated; run again without --update-goldens to compare")

        # =========== T4: interactions ===========
        print("== T4 interactions ==")
        ctx = await browser.new_context(viewport={"width": 1600, "height": 900})
        pg = await ctx.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(600)

        # load-to-first-render (T5 but measured here)
        ready = await pg.evaluate("() => __atlas.ready")
        check("T5 first render < 2000ms", ready is not None and ready < 2000, f"{ready:.0f}ms")

        # scrub gating: Irish famine visible at 1848, absent at 1830
        await pg.evaluate("() => __atlas.setYear(1848)")
        px = await pg.evaluate("() => __atlas.findPixelFor('irish-famine')")
        check("T4 Irish famine arc present @1848", px is not None)
        await pg.evaluate("() => __atlas.setYear(1830)")
        px2 = await pg.evaluate("() => __atlas.findPixelFor('irish-famine')")
        check("T4 Irish famine arc absent @1830", px2 is None)

        # click the transatlantic arc -> detail panel with 12.5M + SlaveVoyages
        await pg.evaluate("() => __atlas.setYear(1750)")
        px = await pg.evaluate("() => __atlas.findPixelFor('atlantic-slave-trade')")
        check("T4 atlantic arc hit-testable @1750", px is not None)
        if px:
            await pg.mouse.click(px[0], px[1])
            await pg.wait_for_timeout(200)
            vis = await pg.locator("#detailPanel").is_visible()
            body = (await pg.locator("#dpTitle").inner_text()) + " " + \
                   (await pg.locator("#dpBody").inner_text())
            check("T4 detail panel opens on click", vis)
            check("T4 panel shows 12.5M", "12.5M" in body, body[:120])
            check("T4 panel cites SlaveVoyages", "SlaveVoyages" in body)

            # focus button: camera should move to Atlantic and timeline to period start
            await pg.click("#dpFocus"); await pg.wait_for_timeout(400)
            yr = await pg.evaluate("() => __atlas.year()")
            camr = await pg.evaluate("() => __atlas.cam()")
            check("T4 focus sets year to period start", abs(yr - 1500) <= 1, f"year={yr}")
            check("T4 focus zooms in", camr["k"] > 1.2, f"k={camr['k']:.2f}")
            chip = await pg.locator("#focusChip").is_visible()
            check("T4 focus chip shown", chip)
            await pg.click("#focusClear")

        # filter to forced-enslavement only -> exactly 2 migrations shown
        await pg.click("#filtersBtn"); await pg.wait_for_timeout(150)
        await pg.click("#noTypes")
        await pg.check("#flt-type-forced-enslavement")
        await pg.wait_for_timeout(150)
        counts = await pg.evaluate("() => __atlas.counts()")
        check("T4 filter forced-enslavement -> 2 shown", counts["shown"] == 2, str(counts))
        await pg.click("#allTypes")
        counts = await pg.evaluate("() => __atlas.counts()")
        check("T4 all-types restores 48 shown", counts["shown"] == 48, str(counts))

        # search filter
        await pg.fill("#searchBox", "partition")
        await pg.wait_for_timeout(150)
        counts = await pg.evaluate("() => __atlas.counts()")
        check("T4 search 'partition' -> 1 shown", counts["shown"] == 1, str(counts))
        await pg.fill("#searchBox", "")
        await pg.click("#fpClose")

        # wheel zoom keeps cursor geo point fixed (±2 px)
        await pg.evaluate("() => __atlas.setCamera({rot:0,k:1,cyFrac:null})")
        gpt = await pg.evaluate("() => __atlas.invert([700, 300])")
        await pg.mouse.move(700, 300)
        await pg.mouse.wheel(0, -240); await pg.wait_for_timeout(120)
        spt = await pg.evaluate("g => __atlas.project(g)", gpt)
        drift = ((spt[0] - 700) ** 2 + (spt[1] - 300) ** 2) ** 0.5
        check("T4 wheel zoom anchors cursor (≤2px)", drift <= 2.0, f"drift={drift:.2f}px")

        # pan 3x around the world -> no NaN camera, arcs still hit-testable
        await pg.evaluate("() => __atlas.setYear(1890)")
        for _ in range(24):   # 24 drags of ~600px ≈ >3 world widths at k=1
            await pg.mouse.move(1200, 400); await pg.mouse.down()
            await pg.mouse.move(600, 400, steps=4); await pg.mouse.up()
        camr = await pg.evaluate("() => __atlas.cam()")
        nan_free = all(isinstance(v, (int, float)) and v == v for v in camr.values())
        check("T4 camera finite after 3x world pan", nan_free, str(camr))
        px = await pg.evaluate("() => __atlas.findPixelFor('european-mass-migration')")
        check("T4 arcs hit-testable after wrap", px is not None)

        # keyboard-only session
        await pg.evaluate("() => __atlas.setCamera({rot:0,k:1,cyFrac:null})")
        await pg.keyboard.press("Home")
        await pg.keyboard.press("Space"); await pg.wait_for_timeout(400)
        await pg.keyboard.press("Space")
        y1 = await pg.evaluate("() => __atlas.year()")
        check("T4 keyboard play/pause advances", y1 > 1000, f"year={y1}")
        await pg.keyboard.press("ArrowRight")
        y2 = await pg.evaluate("() => __atlas.year()")
        check("T4 keyboard step", y2 == int(y1) + 1, f"{y1}->{y2}")
        await pg.keyboard.press("Escape")

        # permalink round trip
        await pg.evaluate("() => __atlas.setYear(1948)")
        await pg.evaluate("() => __atlas.setCamera({rot:-76,k:6,cyFrac:0.72})")
        await pg.wait_for_timeout(600)  # hash debounce
        url = pg.url
        check("T4 permalink written", "#y=1948" in url and "k=6.00" in url, url[-60:])
        pg2 = await ctx.new_page()
        await pg2.goto(url); await pg2.wait_for_timeout(800)
        y = await pg2.evaluate("() => __atlas.year()")
        k = (await pg2.evaluate("() => __atlas.cam()"))["k"]
        check("T4 permalink restores state", abs(y - 1948) < 0.2 and abs(k - 6) < 0.1, f"y={y} k={k:.2f}")
        await pg2.close()

        # data table opens and row opens detail
        await pg.click("#tableBtn"); await pg.wait_for_timeout(200)
        rows = await pg.locator("#dataTable tbody tr").count()
        check("T4 data table lists all 48", rows == 48, str(rows))
        await pg.locator("#dataTable tbody tr").nth(0).click()
        await pg.wait_for_timeout(300)
        check("T4 table row opens detail", await pg.locator("#detailPanel").is_visible())
        await pg.keyboard.press("Escape")

        # drag-drop dataset: valid extra migration accepted; bad one rejected
        good = {"type_legend": {"religious": "x"}, "region_legend": {"weur": "Western Europe"},
                "migrations": [{"id": "test-flow", "name": "Test Flow",
                  "period": {"start": 1200, "end": 1210}, "type": "religious", "region": "weur",
                  "cause": "test", "migrants": 5000, "confidence": "low", "references": ["r"],
                  "source": {"name": "A", "lat": 50, "lon": 0},
                  "destinations": [{"name": "B", "lat": 40, "lon": 10, "settled": 4000, "diaspora_today": None}]}]}
        res = await pg.evaluate("""async (d) => {
            const dt = new DataTransfer();
            dt.items.add(new File([JSON.stringify(d)], 'migrations.json', {type:'application/json'}));
            window.dispatchEvent(new DragEvent('drop', {dataTransfer: dt}));
            await new Promise(r => setTimeout(r, 300));
            return __atlas.counts();
        }""", good)
        check("T4 drag-drop valid dataset adopted", res["total"] == 1, str(res))
        bad = dict(good); bad["migrations"] = [dict(good["migrations"][0], migrants=-1)]
        res2 = await pg.evaluate("""async (d) => {
            const dt = new DataTransfer();
            dt.items.add(new File([JSON.stringify(d)], 'bad.json', {type:'application/json'}));
            window.dispatchEvent(new DragEvent('drop', {dataTransfer: dt}));
            await new Promise(r => setTimeout(r, 300));
            return {counts: __atlas.counts(), toast: document.getElementById('toast').textContent};
        }""", bad)
        check("T4 drag-drop invalid dataset rejected", res2["counts"]["total"] == 1 and "rejected" in res2["toast"],
              str(res2)[:120])

        # restore the canonical bundled dataset (drag-drop replaced it)
        await pg.evaluate("() => { location.hash = ''; }")
        await pg.reload(); await pg.wait_for_timeout(700)

        # ---- E1: legend toggle ----
        check("E1 legend hidden at load", not await pg.locator("#legend").is_visible())
        await pg.click("#legendBtn"); await pg.wait_for_timeout(120)
        check("E1 legend shows on toggle", await pg.locator("#legend").is_visible())
        pressed = await pg.get_attribute("#legendBtn", "aria-pressed")
        check("E1 button reflects pressed state", pressed == "true", pressed)
        await pg.wait_for_timeout(600)  # hash debounce
        check("E1 permalink carries lg=1", "lg=1" in pg.url, pg.url[-50:])
        pg3 = await ctx.new_page()
        await pg3.goto(pg.url); await pg3.wait_for_timeout(800)
        check("E1 permalink restores legend", await pg3.locator("#legend").is_visible())
        await pg3.close()
        await pg.click("#legendBtn"); await pg.wait_for_timeout(120)
        check("E1 legend hides on second toggle", not await pg.locator("#legend").is_visible())

        # ---- E2/E5/E6: spectrum legends (type default, region geographic sweep) ----
        btn = await pg.locator("#colorModeBtn").inner_text()
        check("E5 default color mode is type", btn.strip() == "Color: type", btn)
        await pg.click("#legendBtn"); await pg.wait_for_timeout(150)
        rows = await pg.locator("#legendRegions .lgRow").count()
        check("E2 default type legend has 9 rows", rows == 9, str(rows))
        SW1 = "() => getComputedStyle(document.querySelector('#legendRegions .lgRow:first-child .sw')).backgroundColor"
        SW9 = "() => getComputedStyle(document.querySelector('#legendRegions .lgRow:last-child .sw')).backgroundColor"
        check("E2 first row is voluntary blue", await pg.evaluate(SW1) == "rgb(90, 162, 240)")
        check("E2 last row is coerced red", await pg.evaluate(SW9) == "rgb(238, 71, 71)")
        title = await pg.locator("#legendColorTitle").inner_text()
        check("E2 legend states blue->red convention",
              "BLUE" in title and "RED" in title and "COERCED" in title, title)
        await pg.click("#colorModeBtn"); await pg.wait_for_timeout(150)   # -> region mode
        rows = await pg.locator("#legendRegions .lgRow").count()
        check("E6 region legend has 10 rows", rows == 10, str(rows))
        check("E6 first region is N America deep blue", await pg.evaluate(SW1) == "rgb(74, 125, 232)",
              await pg.evaluate(SW1))
        check("E6 last region is SE Asia violet", await pg.evaluate(SW9) == "rgb(200, 110, 232)",
              await pg.evaluate(SW9))
        title = await pg.locator("#legendColorTitle").inner_text()
        check("E6 region legend states west->east sweep",
              "WEST" in title and "EAST" in title, title)
        # cm=region permalink round trip (E5)
        await pg.wait_for_timeout(600)
        check("E5 permalink carries cm=region", "cm=region" in pg.url, pg.url[-60:])
        pg4 = await ctx.new_page()
        await pg4.goto(pg.url); await pg4.wait_for_timeout(800)
        btn4 = await pg4.locator("#colorModeBtn").inner_text()
        check("E5 permalink restores region mode", btn4.strip() == "Color: region", btn4)
        await pg4.close()
        await pg.click("#colorModeBtn"); await pg.wait_for_timeout(120)   # back to type default
        await pg.click("#legendBtn")      # hide legend

        # ---- E3: vivid circles, colored per active mode ----
        def sample_hue_dist(path, cx, cy, r=8):
            a = np.asarray(Image.open(path).convert("RGB")).astype(int)
            h, w, _ = a.shape
            best, bestsat = None, -1
            for yy in range(max(0, cy - r), min(h, cy + r + 1)):
                for xx in range(max(0, cx - r), min(w, cx + r + 1)):
                    px = a[yy, xx]
                    sat = int(px.max()) - int(px.min())
                    if sat > bestsat: bestsat, best = sat, px
            rr, gg, bb = [int(v) for v in best]
            mx, mn = max(rr, gg, bb), min(rr, gg, bb)
            if mx == mn: hue = 0.0
            elif mx == rr: hue = (((gg - bb) / (mx - mn)) % 6) * 60
            elif mx == gg: hue = ((bb - rr) / (mx - mn) + 2) * 60
            else: hue = ((rr - gg) / (mx - mn) + 4) * 60
            hue = (hue + 360) % 360
            land = sum(abs(v - c) for v, c in zip((rr, gg, bb), (0x1f, 0x54, 0x5c)))
            ocean = sum(abs(v - c) for v, c in zip((rr, gg, bb), (0x12, 0x3a, 0x42)))
            return hue, min(land, ocean)

        # Use an isolated circle (Cuban exodus -> Madrid, topmost of its dests;
        # at 2010 no active flows cross Iberia) so the sampler can't grab an
        # overlapping arrow's pixels.
        await pg.evaluate("() => __atlas.setCamera({rot:0,k:1,cyFrac:null})")
        await pg.evaluate("() => __atlas.setYear(2010)")   # exodus arcs gone, circles remain
        await pg.wait_for_timeout(200)
        px = await pg.evaluate("() => __atlas.findPixelFor('cuban-exodus')")
        check("E3 residual circle hit-testable @2010", px is not None)
        if px:
            await pg.screenshot(path="/tmp/e3_type.png")
            hue, dist = sample_hue_dist("/tmp/e3_type.png", px[0], px[1])
            check("E3 circle vivid (>=140 L1 from basemap)", dist >= 140, f"dist={dist}")
            check("E3 circle yellow in default type mode (refugee-flight)",
                  abs(hue - 46) <= 20, f"hue={hue:.0f}")
            await pg.click("#colorModeBtn")   # region mode: Latin America sky blue
            await pg.wait_for_timeout(200)
            px2 = await pg.evaluate("() => __atlas.findPixelFor('cuban-exodus')")
            await pg.screenshot(path="/tmp/e3_region.png")
            hue2, dist2 = sample_hue_dist("/tmp/e3_region.png", px2[0], px2[1])
            check("E3 circle recolors sky blue in region mode",
                  abs(hue2 - 198) <= 20 and dist2 >= 140, f"hue={hue2:.0f} dist={dist2}")
            await pg.click("#colorModeBtn")   # back to type default

        check("T4 no JS errors in interaction run", not errs, str(errs[:2]))
        await ctx.close()

        # =========== E4: hostile WebView (iOS app viewer emulation) ===========
        print("== E4 hostile-webview guards ==")
        ctx = await browser.new_context(viewport={"width": 1600, "height": 900})
        await ctx.add_init_script("""
            history.replaceState = function(){ throw new DOMException('denied','SecurityError'); };
            Element.prototype.setPointerCapture = function(){ throw new DOMException('gone','NotFoundError'); };
        """)
        pg = await ctx.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(700)
        box = await pg.locator("#scrub").bounding_box()
        await pg.mouse.click(box["x"] + box["width"] * 0.8, box["y"] + box["height"] * 0.6)
        await pg.wait_for_timeout(200)
        y_after = await pg.evaluate("() => __atlas.year()")
        check("E4 scrub works despite capture failure", y_after > 1500, f"year={y_after}")
        await pg.mouse.move(800, 400); await pg.mouse.down()
        await pg.mouse.move(500, 400, steps=6); await pg.mouse.up()
        await pg.click("#playBtn"); await pg.wait_for_timeout(700); await pg.click("#playBtn")
        await pg.wait_for_timeout(800)   # let any debounced hash write fire
        check("E4 zero errors with replaceState/setPointerCapture throwing", not errs, str(errs[:2]))
        await ctx.close()

        # =========== E7: responsive layout (phone emulation) ===========
        print("== E7 responsive layout ==")
        for label, vw, vh in [("portrait-phone", 390, 844), ("landscape-phone", 844, 390)]:
            ctx = await browser.new_context(viewport={"width": vw, "height": vh},
                                            device_scale_factor=3, is_mobile=True, has_touch=True)
            pg = await ctx.new_page()
            errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            await pg.goto(URL); await pg.wait_for_timeout(800)
            sw = await pg.evaluate("() => document.documentElement.scrollWidth")
            check(f"E7 {label}: no horizontal overflow", sw <= vw + 1, str(sw))
            for sel in ("#playBtn", "#zoomIn", "#speedSel", "#nextEvt"):
                bb = await pg.locator(sel).bounding_box()
                inside = bb and bb["x"] >= -1 and bb["x"] + bb["width"] <= vw + 1 \
                         and bb["y"] + bb["height"] <= vh + 1
                check(f"E7 {label}: {sel} inside viewport", inside, str(bb))
            ph = (await pg.locator("#playBtn").bounding_box())["height"]
            check(f"E7 {label}: touch target >= 40px", ph >= 40, str(ph))
            mh = await pg.evaluate("() => document.getElementById('flows').clientHeight")
            check(f"E7 {label}: map keeps >= 45% of height", mh >= vh * 0.45, str(mh))
            check(f"E7 {label}: no JS errors", not errs, str(errs[:1]))
            await ctx.close()

        # =========== T5: performance & memory ===========
        print("== T5 performance ==")
        ctx = await browser.new_context(viewport={"width": 1600, "height": 900})
        pg = await ctx.new_page()
        await pg.goto(URL); await pg.wait_for_timeout(600)
        await pg.evaluate("() => __atlas.setYear(1890)")
        await pg.click("#playBtn")
        ft = await pg.evaluate("""() => new Promise(res => {
            const t = []; let last = performance.now(); let n = 0;
            function f(now){ t.push(now-last); last = now;
              if(++n < 120) requestAnimationFrame(f); else res(t.slice(10)); }
            requestAnimationFrame(f); })""")
        await pg.click("#playBtn")
        ft.sort()
        # Median measures steady-state cadence (vsync ~16.7ms); mean is inflated
        # by occasional CI scheduler hiccups, which p95 polices instead.
        med = ft[len(ft) // 2]; p95 = ft[int(len(ft) * 0.95)]
        check("T5 median frame < 17ms (1890s)", med < 17.0, f"{med:.1f}ms")
        check("T5 p95 frame < 33ms", p95 < 33, f"{p95:.1f}ms")
        size = os.path.getsize(BUNDLE)
        check("T5 bundle ≤ 3.5MB", size <= 3.5e6, f"{size/1e6:.2f}MB")

        # memory: 3 full timeline sweeps, heap growth < 5% (after GC)
        heap = await pg.evaluate("""async () => {
            const sweep = async () => {
              for (let y = 1000; y <= 2026; y += 4) {
                __atlas.setYear(y);
                await new Promise(r => requestAnimationFrame(r));
              }};
            if (window.gc) window.gc();
            await sweep();  // warm-up
            if (window.gc) window.gc();
            const before = performance.memory.usedJSHeapSize;
            for (let i = 0; i < 3; i++) await sweep();
            if (window.gc) window.gc();
            await new Promise(r => setTimeout(r, 300));
            const after = performance.memory.usedJSHeapSize;
            return {before, after};
        }""")
        growth = (heap["after"] - heap["before"]) / heap["before"]
        check("T5 heap growth < 5% over 3 sweeps", growth < 0.05,
              f"{heap['before']/1e6:.1f}MB -> {heap['after']/1e6:.1f}MB ({growth*100:.1f}%)")
        await ctx.close()

        # =========== T6: accessibility ===========
        print("== T6 accessibility ==")
        ctx = await browser.new_context(viewport={"width": 1600, "height": 900})
        pg = await ctx.new_page()
        await pg.goto(URL); await pg.wait_for_timeout(600)
        await pg.add_script_tag(path=os.path.join(ROOT, "tests/axe.min.js"))
        async def run_axe(label):
            res = await pg.evaluate("() => axe.run(document, {resultTypes:['violations']})")
            vio = [v for v in res["violations"] if v["impact"] in ("serious", "critical")]
            check(f"T6 axe no serious/critical ({label})", not vio,
                  "; ".join(v["id"] for v in vio))
            for v in res["violations"]:
                if v["impact"] not in ("serious", "critical"):
                    print(f"   note ({label}): {v['impact']}: {v['id']}")
        await run_axe("main view")
        await pg.click("#tableBtn"); await pg.wait_for_timeout(200)
        await run_axe("data table")
        await pg.keyboard.press("Escape")
        await pg.click("#filtersBtn"); await pg.wait_for_timeout(150)
        await run_axe("filters")
        await ctx.close()

        await browser.close()

    npass = sum(1 for _, c in results if c)
    print(f"\n{npass}/{len(results)} browser checks passed")
    return 0 if npass == len(results) else 1

sys.exit(asyncio.run(main()))
