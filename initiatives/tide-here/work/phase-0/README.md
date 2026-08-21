# Phase 0 — Provider reachability evidence

Observed 2026-08-20 from a real Chromium page whose origin was
`https://httpbin.org`. The page issued ordinary `fetch(..., { mode: "cors" })`
requests, read each response body, and rendered the result into its DOM. NOAA
CO-OPS, CHS IWLS, and Nominatim each returned HTTP 200, a browser response type
of `cors`, and readable JSON.

This proves the direct static-page boundary in `spec.md` §6.1 for the three
current providers on the observation date. It does not make that fact permanent:
the live check is repeated at deployment, while the response bodies here become
the deterministic inputs to later adapter tests.

## Observation method

The temporary HTTPS document made one request to each provider, in sequence,
and recorded:

- page origin and Chromium user agent;
- UTC retrieval time;
- request URL, HTTP status, browser response type, and response URL;
- response headers exposed to page JavaScript; and
- the parsed JSON body.

The same browser and origin then requested `https://example.com/`, a page that
does not allow cross-origin reads. That negative control failed with
`TypeError: Failed to fetch`. The provider successes therefore were not caused
by a browser session with CORS enforcement disabled.

No user location, account, credential, cookie, request header, or response
header unrelated to the API contract is in these fixtures. Seattle and Halifax
are public test locations chosen by the initiative's test plan. The temporary
page itself stored nothing and had no form input.

Machine-readable observation metadata is in `evidence.json`; the exact small
response bodies are under `fixtures/`.

## Results

| Provider | Request | Browser result | Fixture |
|---|---|---|---|
| NOAA CO-OPS | Seattle station `9447130`, 2026-08-20 through 2026-08-21, high/low predictions in UTC and metres | HTTP 200; `cors`; seven readable predictions | `fixtures/noaa-seattle-hilo.json` |
| CHS IWLS | Halifax station `00490` / API id `5cebf1df3d0f4a073c4bbcbb`, 2026-08-20 through 2026-08-22, `wlp-hilo` | HTTP 200; `cors`; seven readable predictions | `fixtures/chs-halifax-hilo.json` |
| Nominatim | One forward lookup for `Halifax, Nova Scotia`, JSONv2, limit 1 | HTTP 200; `cors`; one readable result | `fixtures/nominatim-halifax.json` |

An independent header observation with the same `Origin` value showed
`Access-Control-Allow-Origin: *` on NOAA and CHS. That header is used by the
browser but is not a CORS-safelisted response header exposed to page JavaScript.
Nominatim's edge response did not expose or repeat that header to the independent
client, so its recorded proof is the successful browser read plus the failing
negative control, not a header copied from a different request path.

## Source and use conditions recorded with the fixtures

### NOAA CO-OPS

- API: <https://api.tidesandcurrents.noaa.gov/api/prod/>
- Source label: **NOAA Center for Operational Oceanographic Products and
  Services (CO-OPS)**.
- Disclaimer: <https://www.tidesandcurrents.noaa.gov/disclaimers.html>
- The NOAA disclaimer says information on government servers is public domain
  unless specifically annotated otherwise, and modified content must not be
  presented as official government material. The finished page must retain its
  separate informational/not-for-navigation boundary.

### Canadian Hydrographic Service IWLS

- Service description and limits:
  <https://tides.gc.ca/en/web-services-offered-canadian-hydrographic-service>
- API documentation: <https://api-sine.dfo-mpo.gc.ca/swagger-ui/index.html>
- Licence: <https://www.tides.gc.ca/en/licence-agreement>
- Source label: **Canadian Hydrographic Service (CHS), Fisheries and Oceans
  Canada**.

The licence permits this non-commercial, non-navigation validation use and
requires a derivative product to display this notice, completed with the user
or corporate name:

> This product is not to be used for navigation. This product was made by or
> for [User name or corporate name] and contains intellectual property (Data)
> of the Canadian Hydrographic Service of the Department of Fisheries and
> Oceans. The copyrights in the Data remain the property of His Majesty the
> King in Right of Canada. Incorporating the Data does not constitute CHS,
> Fisheries and Oceans, or Crown endorsement or approval.

That is a compact rendering of the required notice for planning and tests; the
finished product must copy the current licence's complete notice verbatim and
fill in the name. The licence prohibits navigation use and commercial
derivative products. A later commercial or public successor therefore needs a
fresh rights review rather than inheriting this Phase 0 conclusion.

### Nominatim / OpenStreetMap

- API manual: <https://nominatim.org/release-docs/latest/api/Search/>
- Public-service policy:
  <https://operations.osmfoundation.org/policies/nominatim/>
- Response attribution: **Data © OpenStreetMap contributors, ODbL 1.0 —
  <https://www.openstreetmap.org/copyright>**.

The policy caps use at one request per second, requires an identifying Referer
or User-Agent, visible attribution, caching, and the ability to switch services
without a software update. It forbids autocomplete and systematic queries. The
Phase 0 harness made one user-like lookup; later code must pin those operational
rules in tests rather than treating this success as an unlimited service grant.

## Replaying the live observation

Serve a page from any ordinary HTTPS origin and run the three request URLs from
`evidence.json` sequentially with `fetch` in CORS mode. Record the new UTC time,
origin, browser, status, response type, exposed headers, and bodies. Also fetch
a known non-CORS page as a negative control. Replace or add dated fixtures only
when intentionally refreshing provider evidence; ordinary tests use the
committed recordings and never call the live services.
