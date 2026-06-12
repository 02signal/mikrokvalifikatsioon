# Cookie Consent Standard — 02Signal / AMOS Universe Sites

Status: reference implementation live on mikrokvalifikatsioon.ee (2026-06-12).
Owner intent: one consistent, self-hosted consent solution across all public sites
(mikrokvalifikatsioon.ee, digiteekaart.ee, automatiseerimine.ee, digitaliseerimine.ee,
teekaart.ee, and future AMOS-universe public surfaces). No third-party CMP cost.

## Principles

1. **Consent before cookies.** Google Consent Mode v2 in "basic" mode: `gtag.js` is NOT
   loaded until the visitor clicks "Nõustun analüütikaga". No consent → no analytics
   cookies, no pings. This is the strict/safe reading of ePrivacy + Estonian ESS § 102.
2. **Equal buttons, no dark patterns.** "Nõustun analüütikaga" and "Ainult vajalikud"
   are equally prominent. Declining is one click.
3. **Choice is changeable.** Footer link "Küpsised" (`data-cookie-settings`) reopens the
   banner on every page. Choice stored in `localStorage` (`<site>:consent`).
4. **Functional storage stays minimal.** sessionStorage attribution context (landing
   page, UTM, last CTA) is short-lived, first-party, never leaves the browser except
   inside consented analytics events. Documented on the privacy page.
5. **No ad cookies anywhere.** `ad_storage`, `ad_user_data`, `ad_personalization`
   stay denied. If Google Ads remarketing is ever wanted, that is an owner decision
   and a banner upgrade, not a default.

## Implementation (copy from this repo)

- `src/components/Analytics.astro` — consent default → banner → `loadGa()` on grant.
  The component carries the banner markup and styles, so every page that includes
  `<Analytics />` gets the banner automatically.
- Privacy page section explaining: what is set, when, how to change, retention.
- The custom event helper (`digiteekaartTrack`) keeps queueing into `dataLayer`
  regardless of consent; without consent the array is inert and nothing is sent.

## Adoption checklist per site

1. Replace the unconditional gtag block in `Analytics.astro` with the consent-gated
   version (change the localStorage key prefix to the site's own).
2. Add the "Küpsised" footer link with `data-cookie-settings`.
3. Update the privacy page with the cookie section (mikrokvalifikatsioon.ee
   /privaatsus/ is the template).
4. Verify in GA4 Realtime: no hits before consent, hits after grant, banner does not
   reappear after a stored choice.

## Known adoption backlog

- digiteekaart.ee loads GA unconditionally today — needs this standard.
- automatiseerimine.ee / digitaliseerimine.ee / teekaart.ee — same check needed.
