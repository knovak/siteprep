"""Render model-computed demo skies (from tools/dump-demo.mjs) as a 2x2
grid in the Style A (twilight photographic) aesthetic. Unlike the earlier
draft mockups, every point here comes from the Phase 1 physics model:
positions, magnitudes, shadowing, and sky-brightness visibility."""
import json
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

skies = json.load(open("/tmp/demo-skies.json"))
W, H = 1400, 700
AZ0, AZ1, ALT0, ALT1 = 90.0, 270.0, 0.0, 70.0  # facing south, E to W

def to_px(az, alt):
    return ((az - AZ0) / (AZ1 - AZ0) * (W - 1),
            (1 - (alt - ALT0) / (ALT1 - ALT0)) * (H - 1))

def splat(img, x, y, flux, sigma, color):
    r = int(max(2, sigma * 4)); xi, yi = int(round(x)), int(round(y))
    x0, x1 = max(0, xi - r), min(W, xi + r + 1)
    y0, y1 = max(0, yi - r), min(H, yi + r + 1)
    if x0 >= x1 or y0 >= y1: return
    gx = np.arange(x0, x1) - x; gy = np.arange(y0, y1) - y
    g = np.exp(-(gy[:, None] ** 2 + gx[None, :] ** 2) / (2 * sigma ** 2))
    for c in range(3):
        img[y0:y1, x0:x1, c] += flux * color[c] * g

def sky_bg(sun_alt, sun_az):
    yy, xx = np.mgrid[0:H, 0:W]
    altf = 1 - yy / (H - 1)
    f = max(0.0, min(1.0, (sun_alt + 18) / 18))  # twilight factor
    top = np.array([0.03, 0.03, 0.08]) + f * np.array([0.02, 0.01, 0.03])
    hor = np.array([0.06, 0.05, 0.12]) + f * np.array([0.12, 0.07, 0.10])
    base = hor[None, None, :] + (top - hor)[None, None, :] * altf[..., None] ** 0.9
    if f > 0 and AZ0 - 25 < sun_az < AZ1 + 25:
        gx, gy = to_px(min(max(sun_az, AZ0 - 20), AZ1 + 20), 1)
        d = np.sqrt(((xx - gx) / (0.32 * W)) ** 2 + ((yy - gy) / (0.55 * H)) ** 2)
        glow = np.exp(-np.clip(d, 0, 6) ** 2.1) * f
        base = base + np.array([0.75, 0.5, 0.28])[None, None, :] * glow[..., None]
    return np.clip(base, 0, 1)

fig = plt.figure(figsize=(16.4, 9.6), facecolor="#0a0a10")
fig.suptitle("Phase 1 model output — four scenarios, one physics engine (300,000 SBDCs, 70% SSO, seed 12345)",
             color="#f0ede4", fontsize=15, weight="bold", y=0.985)

FAM_COLOR = {0: (1.0, 0.93, 0.80), 1: (0.85, 0.92, 1.0), 2: (1.0, 0.98, 0.85)}
MAX_DRAWN = 4000  # subsample densest skies for the figure

for p, sky in enumerate(skies):
    ax = fig.add_subplot(2, 2, p + 1)
    img = sky_bg(sky["sunAltDeg"], sky["sunAzDeg"])
    im = np.zeros((H, W, 3))
    for az, alt, m in sky["stars"]:
        if not (AZ0 <= az <= AZ1 and alt <= ALT1): continue
        x, y = to_px(az, alt)
        splat(im, x, y, 10 ** (-0.4 * (m - 1.2)), 1.0, (0.9, 0.93, 1.0))
    sats = sky["sats"]
    if len(sats) > MAX_DRAWN:
        idx = np.random.default_rng(1).choice(len(sats), MAX_DRAWN, replace=False)
        sats = [sats[i] for i in idx]
        scale = 1.0
    for az, alt, m, fam in sats:
        if not (AZ0 <= az <= AZ1 and alt <= ALT1): continue
        x, y = to_px(az, alt)
        flux = 10 ** (-0.4 * (m - 1.2))
        splat(im, x, y, flux, 1.4 * (1 + 0.4 * np.log10(1 + flux)), FAM_COLOR[fam])
    im = 1 - np.exp(-im)
    out = np.clip(img + im, 0, 1)
    out[int(H * 0.965):, :, :] = 0.008  # thin ground strip
    ax.imshow(out); ax.axis("off")
    for azl, lab in [(90, "E"), (135, "SE"), (180, "S"), (225, "SW"), (270, "W")]:
        x, _ = to_px(azl, 0)
        ax.text(x, H - 8, lab, color="#c7cde0", fontsize=9, ha="center")
    note = f"sun {sky['sunAltDeg']}° · visible SBDCs {sky['nVisibleSats']:,} · visible stars {sky['nVisibleStars']:,}"
    if len(sky["sats"]) > MAX_DRAWN:
        note += f" (drawing {MAX_DRAWN:,} of {sky['nVisibleSats']:,})"
    ax.set_title(sky["name"] + "\n" + note, color="#e8e4d8", fontsize=10.5, pad=6)

fig.text(0.5, 0.008,
         "Every point is model-computed: constellation geometry, Earth-shadow eclipsing, per-satellite magnitude, and twilight sky-brightness visibility. "
         "Warm points = SSO family, cool points = 30° shells. Facing south (E to W).",
         color="#b9b4a6", fontsize=10.5, ha="center")
fig.subplots_adjust(left=0.015, right=0.985, top=0.9, bottom=0.05, hspace=0.24, wspace=0.04)
fig.savefig("/home/claude/sbdc-sim/drafts/phase1_model_demo.png", dpi=105, facecolor=fig.get_facecolor())
print("saved")
