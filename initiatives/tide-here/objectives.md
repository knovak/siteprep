# Objectives

The first useful version is a small, friendly web page that answers one
question without making the user translate between several services: *what are
the tide, sun, and moon doing near this place over the next five days?*

## Outcomes

1. **A place can be entered the way a person has it.** The page accepts either
   latitude and longitude or a location string. It preserves what the user
   entered, shows the standard place name it resolved, and names the coastal
   place whose tide information is being shown.

2. **“Nearest seafront” means a relevant coast, not merely the closest station
   or model point in a straight line.** The result distinguishes the resolved
   place, the seafront, and the prediction station or model source. Islands,
   estuaries, and inland locations must not silently produce a plausible but
   inappropriate tide table.

3. **Five days of high and low tides are readable at a glance.** For each of
   the next five local calendar days, every available high and low prediction
   is shown with its local time and type. The page names the prediction source
   and says clearly when coverage or a prediction is unavailable.

4. **The sun and moon use the same days and place as the tide table.** Each day
   shows sunrise and sunset, moonrise and moonset, and the current moon phase.
   A day with zero, one, or two moonrise or moonset events is represented
   honestly rather than forced into one slot.

5. **Dates and times mean one thing throughout the page.** “Today” and the next
   four days are calculated in the selected coastal location's civil time, and
   the displayed time zone is visible. A user near a date or time-zone boundary
   should not see device-local dates mixed with coast-local events.

6. **Failure is visible and useful.** An unrecognised place, an unsuitable or
   out-of-coverage tide source, a provider failure, and a day with no event are
   different states with different messages. The page never turns “closest
   available” into “correct for this coast.” Tide predictions are presented as
   informational and not as navigation or safety advice.

7. **It is a standalone page that can be shared today.** The first version can
   live at an ordinary temporary URL, works on phone and desktop, and does not
   depend on owning the eventual `tidehere.info`-style domain. Its visual tone
   should feel compact and cheerful without making the data harder to scan.

8. **Location privacy is proportional to the product.** A typed place,
   coordinates, or one location fix requested only after **Show here** is
   chosen is used only to resolve and display this result. The page never asks
   on load or watches location. It retains at most 100 successful or partial
   forecast records only in this browser, provides explicit view, download,
   and clear controls, and never transmits that history through the
   application. It does not imply that a public geocoder, tide service, or the
   Tide Here stored-provider gateway is private.

## Originally outside the first version

The wish named automatic browser location as version 2. It has since been
delivered as the explicit **Show here** action: the browser asks only after the
click, uses the returned coordinates through the manual-coordinate path, and
always leaves the form available. Permission denied or unavailable falls back
to the same manual form.

A custom domain is also later. So are navigation, flood, fishing, or surf-safety
recommendations; historical tide analysis; and a general weather forecast.
None is needed to prove the five-day display.

## How we will know

- A location string and a latitude/longitude pair for the same coastal place
  resolve to the same standard place, coastal location, and five local dates.
- At least two supported coasts with different tide regimes and time zones show
  all tide, sun, and moon events without mixing time zones.
- An inland place and an out-of-coverage coast either identify a defensible
  coastal result with its source made explicit or stop with a clear coverage
  message; neither invents confidence.
- A fixture day with no moonrise or moonset and one with two events render
  without changing the five-day table's structure.
- Provider, geocoder, and malformed-input failures remain distinguishable, and
  the page still explains what the user can try next.
- The finished first version is usable from a temporary HTTPS URL on a phone
  and a desktop without granting location permission.

## Questions for the spec

The objectives deliberately leave implementation choices to `spec.md`: which
geocoder and tide data cover the first version; how coastal relevance is ranked
and when the page refuses a weak match; which astronomical calculation or
provider supplies sun and moon events; and whether the standalone page calls
those services directly or through a small server-side boundary. The
background research gives each choice a failure mode, so the spec must compare
alternatives rather than treating one provider as the product definition.
