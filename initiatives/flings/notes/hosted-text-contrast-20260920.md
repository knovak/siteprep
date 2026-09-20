# Hosted text contrast — September 20, 2026 (UTC)

Continued T12 acceptance on the existing [Flings test Site](https://flings-test.ken-novak.chatgpt.site).
The Sites API confirmed version 13, public access and access-policy revision 2.
The macOS Codex in-app browser used the actual owner's native organizer session
and the existing **Hosted populated recovery — fictional — 2026-09-16**
gathering. No application source or hosted business records changed.

## Method

Ran the read-only DOM probe below at 1280 × 844 and 390 × 844 CSS pixels.
It measures elements containing direct text and nonempty text-entry/select
values, using computed text colors and ancestor background colors. Transparent
backgrounds are composited from the root outward. It excludes hidden subtrees
and closed-details content, and exempts the wordmark and disabled controls.
The final probe was checked against both collapsed and expanded history:
their inventories differ, so collapsed content is not silently counted.

The comparison follows [WCAG 2.2 SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html):
4.5:1 for ordinary text and 3:1 for text at least 24 CSS pixels, or bold text
at least 18.67 CSS pixels. Pass/fail uses the unrounded computed ratio.
Elements with background images, unsupported colors or ancestor opacity
would be reported separately rather than assigned a passing ratio; none
occurred among the measured, non-exempt elements.

## Results

All **20 surface/viewport observations** passed this text-contrast probe.
Counts below are elements in each observation, not unique elements across
the audit. Every row was measured at both widths; counts matched between
widths. Histories stayed expanded while inspecting each coordination editor.

| Surface | Checked at each width | Exempt at each width | Contrast failures |
|---|---:|---:|---:|
| Organizer, history collapsed | 129 | 11 | 0 |
| Organizer, poll/message/report/discussion history expanded | 160 | 11 | 0 |
| Write a post editor | 156 | 11 | 0 |
| Create a poll editor | 162 | 11 | 0 |
| Request a payment editor | 162 | 11 | 0 |
| Replace poll editor | 165 | 11 | 0 |
| Record adjustment editor | 159 | 11 | 0 |
| Hide post editor | 154 | 11 | 0 |
| Accepted-member preview | 56 | 15 | 0 |
| Invited-member preview | 35 | 9 | 0 |

The lowest ratio in every observation was **4.703055909809959:1**:
muted text `#5e6a64` on `#eeeae2`. Other measured examples include white
button text on `#245545` at 8.535379118460115:1, eyebrow text `#9d5038`
on `#eeeae2` at 4.810842569573869:1, and accepted-state text `#28533b`
on `#e3eee4` at 7.368734398155246:1. No palette correction was needed.

Opened and cancelled all six coordination editors without saving. Expanded
both poll histories, message history, the reviewed discussion and report
history. Both member pages were organizer previews, with profile and vote
controls disabled. No member code was issued, message prepared, payment link
followed, backup uploaded or access policy changed. Reset the viewport override
after measurement.

## Limits and remaining work

This is a targeted computed-color check in one browser and one owner session,
not an axe audit, complete WCAG conformance result or screen-reader assessment.
It does not measure placeholder/pseudo-element text, browser-native dropdown
menus, icons, control borders, focus indicators, overlapping content or
text shadows. Hover, error, loading and denied states were not exercised.
Disabled controls are excluded from the contrast criterion rather than
claimed to pass it. The white root fallback is harmless here because the
page has an opaque computed background.

Text zoom, the remaining automated accessibility checks, actual screen-reader
use, the full hosted browser/workflow matrix, independent second-organizer
sign-in and managed-provider recovery evidence remain open. Preview checks
do not establish an actual member's authentication or writable journey.
`verify-hosted-test` remains actionable and Phase 6 is not complete.

## Reproducible read-only probe

Evaluate this function against the loaded page after opening the intended
surface. Navigation, viewport changes and editor cancellation are separate
browser actions. The result contains counts, measured color pairs, unsupported
cases and failures; successful observations do not export account or fixture
text.

```javascript
() => {
  const rgb = value => {
    const match = value.match(/^rgba?\(([^)]+)\)$/);
    if (!match) return null;
    const parts = match[1].split(',').map(Number);
    return parts.length === 3 ? [...parts, 1] : parts;
  };
  const luminance = color => color.slice(0, 3).map(value => {
    value /= 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
  const blend = (fg, bg) => fg.slice(0, 3)
    .map((value, i) => value * fg[3] + bg[i] * (1 - fg[3]));
  const pairs = {}, unsupported = {}, violations = [];
  let candidates = 0, checked = 0, exempt = 0;
  for (const element of document.querySelectorAll('body *')) {
    if (['SCRIPT', 'STYLE', 'OPTION', 'NOSCRIPT'].includes(element.tagName)
        || !element.getClientRects().length) continue;
    const direct = [...element.childNodes]
      .some(node => node.nodeType === 3 && node.textContent.trim());
    const valued = element.matches(
      'input:not([type=checkbox]):not([type=radio]):not([type=file]),textarea,select'
    ) && Boolean(element.value);
    if (!direct && !valued) continue;
    const chain = [];
    let hidden = false;
    for (let parent = element; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      chain.push(style);
      if (style.display === 'none' || style.visibility === 'hidden') hidden = true;
    }
    if (chain.some(style => style.contentVisibility === 'hidden')) hidden = true;
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      if (parent.tagName === 'DETAILS' && !parent.hasAttribute('open')) {
        const summary = parent.querySelector('summary');
        if (!summary || !summary.contains(element)) hidden = true;
      }
    }
    if (hidden) continue;
    candidates++;
    if (element.closest('.wordmark')
        || element.closest(':disabled,[aria-disabled="true"]')) {
      exempt++;
      continue;
    }
    let reason = chain.some(style => Number(style.opacity) !== 1)
      ? 'ancestor opacity' : chain.some(style => style.backgroundImage !== 'none')
        ? 'background image' : null;
    const fg = rgb(chain[0].color);
    if (!fg) reason = 'unsupported text color';
    let bg = [255, 255, 255];
    for (const style of chain.slice().reverse()) {
      const color = rgb(style.backgroundColor);
      if (!color) { reason = 'unsupported background color'; break; }
      bg = blend(color, bg);
    }
    if (reason) {
      unsupported[reason] = (unsupported[reason] || 0) + 1;
      continue;
    }
    const foreground = blend(fg, bg);
    const a = luminance(foreground), b = luminance(bg);
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    const size = Number.parseFloat(chain[0].fontSize);
    const weight = Number.parseFloat(chain[0].fontWeight);
    const minimum = size >= 24 || (size >= 18.6666666667 && weight >= 700) ? 3 : 4.5;
    checked++;
    const key = foreground.join(',') + ' / ' + bg.join(',') + ' / ' + minimum;
    if (!pairs[key]) pairs[key] = { foreground, background: bg, minimum, ratio, count: 0 };
    pairs[key].count++;
    if (ratio < minimum) violations.push({
      tag: element.tagName, className: element.className, ratio, minimum,
      text: element.textContent.trim().slice(0, 65),
    });
  }
  return {
    viewport: { width: innerWidth, height: innerHeight },
    candidates, checked, exempt, unsupported, violations,
    pairs: Object.values(pairs).sort((a, b) => a.ratio - b.ratio),
  };
}
```
