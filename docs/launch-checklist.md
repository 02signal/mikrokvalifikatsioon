# Launch Checklist — mikrokvalifikatsioon.ee

Owner steps to go fully live. Updated 2026-06-12. Decision: DNS moves to Cloudflare
(family pattern; neither domain has email, so nameserver change is safe).

## 1. DNS via Cloudflare (both domains)

1. Cloudflare dashboard → **Add a domain** → `mikrokvalifikatsioon.ee` → Free plan.
   Repeat for `mikrokvalifikatsioonid.ee`.
2. In each zone make sure these records exist (add if the scan missed them), both
   **DNS only (grey cloud — NOT proxied)**:
   - `A` | `@` | `76.76.21.21`
   - `CNAME` | `www` | `cname.vercel-dns.com`
3. Cloudflare shows two nameservers per zone → at the registrar (Zone.ee panel,
   "Nimeserverid") replace the NS with Cloudflare's pair for each domain.
4. Wait for Cloudflare "site is active" email; Vercel then verifies the domains
   automatically and issues SSL. The plural domain 301s to /kataloog/ (vercel.json).
5. Grey-cloud rule: keep Vercel-pointing records unproxied. If the orange proxy is
   ever wanted, set SSL/TLS mode to Full (strict) first — otherwise redirect loops.

## 2. GA4

1. analytics.google.com → Admin → Create Property `Mikrokvalifikatsioon.ee`
   (timezone Estonia, EUR) → Web data stream `https://mikrokvalifikatsioon.ee`.
2. Copy the Measurement ID (`G-…`) → give it to Claude (adds `vercel env` + redeploy)
   or add manually: Vercel → Settings → Environment Variables →
   `PUBLIC_GA_MEASUREMENT_ID` (Production + Preview) → Redeploy.
3. Consent: nothing extra in GA — the site loads gtag only after banner consent
   (Consent Mode v2 basic).
4. After first data: Admin → Events → mark as key events: `lead_form_submit`,
   `result_high_intent`, optionally `partner_site_click`.

## 3. Search Console

1. search.google.com/search-console → Add property → Domain → `mikrokvalifikatsioon.ee`.
2. Add the given TXT record in Cloudflare DNS → Verify.
3. Sitemaps → submit `https://mikrokvalifikatsioon.ee/sitemap-index.xml`.
4. GA4 Admin → Product links → link Search Console.

## 4. Lead webhook

Set `PUBLIC_SITE_LEAD_WEBHOOK_URL` in Vercel env (family n8n pattern). Until then the
suunatest form falls back to a prefilled email draft — works, but no automation.

## 5. Smoke test after DNS

- https://mikrokvalifikatsioon.ee/ → 200, suunatest answers instantly
- https://mikrokvalifikatsioonid.ee/ → 301 → /kataloog/
- Cookie banner → accept → GA4 Realtime shows tool_start/tool_completed
- /kataloog/ search filters cards; Võrdle → /vordlus/ table incl. õpiväljundid
