// Vercel serverless function — lead capture for mikrokvalifikatsioon.ee.
//
// Two kinds of public capture post here:
//   - topic_subscribe   "telli teavitus" form (a bounded interest topic)
//   - outcome_package    /oskused/ — the visitor's self-assembled learning-outcome package
//
// Both validate against the SAME bounded taxonomy as the AMOS warehouse
// (amos.outreach.lead_capture/v1) and forward to the AMOS capture ingress
// (AMOS_TOPIC_CAPTURE_URL), which owns the double-opt-in + the warehouse write + the
// notify. This function stores nothing itself and never sees secrets beyond the forward
// token.
//
// Required env (Vercel project settings):
//   AMOS_TOPIC_CAPTURE_URL   the AMOS ingress endpoint (https)
//   AMOS_CAPTURE_TOKEN       shared bearer the ingress checks (optional but advised)

const ALLOWED_TOPICS = new Set([
  'mikrokvalifikatsioon', 'b2b_koolitus', 'digiteekaart',
  'automatiseerimine', 'sundmus_veebinar', 'konverents', 'projekt',
]);
const ALLOWED_SITES = new Set([
  'mikrokvalifikatsioon_ee', 'daca_landing', 'ettevotluskeskus_ee',
  'funnel_teekaart', 'funnel_automatiseerimine', 'funnel_digitaliseerimine',
  'funnel_digiteekaart', 'event_webinar', 'conference', 'project',
]);
const ALLOWED_KINDS = new Set([
  'topic_subscribe', 'outcome_package',
  // Account-layer kinds — canonical names per the AMOS lead_capture/v1 contract.
  'account_created', 'package_saved', 'reminder_subscribed', 'funding_profile_set', 'combo_waitlist',
]);
// The /konto/ face uses action-verb names; normalise them to the canonical AMOS kinds
// (so both repos agree on one taxonomy and the account path actually connects).
const KIND_ALIASES = {
  account_create: 'account_created',
  deadline_reminder: 'reminder_subscribed',
  notify_list: 'combo_waitlist',
  funding_profile: 'funding_profile_set',
};
const ACCOUNT_KINDS = new Set(['account_created', 'package_saved', 'reminder_subscribed', 'funding_profile_set', 'combo_waitlist']);
const ALLOWED_FUNDING_ROUTES = new Set(['ise', 'tootukassa', 'tooandja']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Bounded outcome-package payload — never trust client size/length.
const MAX_OUTCOMES = 50;
const MAX_OUTCOME_LEN = 300;

function readBody(req) {
  return new Promise((resolve) => {
    if (req.body) { resolve(typeof req.body === 'string' ? safeParse(req.body) : req.body); return; }
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 32768) req.destroy(); });
    req.on('end', () => resolve(safeParse(raw)));
    req.on('error', () => resolve(null));
  });
}
function safeParse(s) { try { return JSON.parse(s); } catch { return null; } }

function cleanOutcomes(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const out = [];
  for (const item of value) {
    const text = String(item || '').trim().slice(0, MAX_OUTCOME_LEN);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= MAX_OUTCOMES) break;
  }
  return out;
}

// GDPR erasure (Art. 17): route an account-deletion request to the AMOS erasure endpoint
// (POST /api/outreach/v1/erasure — suppression-first, then deletion). NEVER subscribes.
// Endpoint: AMOS_ERASURE_URL, else derived from AMOS_TOPIC_CAPTURE_URL (…/erasure).
async function forwardErasure(email, sourceSite, res) {
  const erasureUrl =
    process.env.AMOS_ERASURE_URL
    || (process.env.AMOS_TOPIC_CAPTURE_URL || '').replace(/\/[^/]*$/, '/erasure');
  if (erasureUrl) {
    try {
      const r = await fetch(erasureUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(process.env.AMOS_CAPTURE_TOKEN ? { authorization: `Bearer ${process.env.AMOS_CAPTURE_TOKEN}` } : {}),
        },
        body: JSON.stringify({
          capture_version: 'amos.outreach.lead_capture/v1',
          email,
          requested_at: new Date().toISOString(),
          scope: 'all_outreach_data',
          status: 'received',
          source_site: sourceSite,
        }),
      });
      if (r.ok) { res.status(200).json({ ok: true, status: 'erasure_requested' }); return; }
      console.error('subscribe: erasure ingress status', r.status);
    } catch (e) {
      console.error('subscribe: erasure ingress error', e && e.message);
    }
  } else {
    console.error('subscribe: no erasure endpoint configured (AMOS_ERASURE_URL / AMOS_TOPIC_CAPTURE_URL)');
  }
  // Fail-closed for GDPR: we did NOT subscribe. Honest response; the /konto/ UI offers a mailto fallback.
  res.status(200).json({
    ok: true,
    status: 'erasure_pending',
    message: 'Kustutustaotlus on vastu võetud. Kui see ei jõua automaatselt kohale, kirjuta info@mikrokvalifikatsioon.ee.',
  });
}

export default async function handler(req, res) {
  res.setHeader('content-type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') { res.status(405).json({ message: 'Method not allowed' }); return; }

  const body = await readBody(req);
  if (!body || typeof body !== 'object') { res.status(400).json({ message: 'Vigane päring.' }); return; }

  const rawKind = KIND_ALIASES[body.kind] || body.kind;
  const kind = ALLOWED_KINDS.has(rawKind) ? rawKind : 'topic_subscribe';
  const email = String(body.email || '').trim().toLowerCase();
  const field = body.field ? String(body.field).trim().slice(0, 64) : null;
  const sourceSite = ALLOWED_SITES.has(body.source_site) ? body.source_site : 'mikrokvalifikatsioon_ee';

  if (!EMAIL_RE.test(email) || email.length > 254) { res.status(400).json({ message: 'Palun sisesta korrektne e-post.' }); return; }

  // PBI-01 (GDPR Art. 17): account deletion must NEVER fall through to a subscription.
  // Route the raw account_delete/erasure kind to the AMOS erasure endpoint (suppression-first),
  // with an honest fallback. Checked on the RAW body.kind before the capture-kind normalisation.
  if (body.kind === 'account_delete' || body.kind === 'erasure') {
    return forwardErasure(email, sourceSite, res);
  }

  // Per-kind validation + the bounded payload we forward to AMOS.
  let topic;
  let outcomes = null;
  let fundingRoute = null;
  if (kind === 'outcome_package' || ACCOUNT_KINDS.has(kind)) {
    topic = 'mikrokvalifikatsioon'; // package/account live on the mikrokvalifikatsioon register
    outcomes = cleanOutcomes(body.outcomes);
    if (kind === 'outcome_package' && !outcomes.length) { res.status(400).json({ message: 'Lisa vähemalt üks õpiväljund paketti.' }); return; }
    if (kind === 'funding_profile_set') { fundingRoute = ALLOWED_FUNDING_ROUTES.has(body.funding_route) ? body.funding_route : null; }
  } else {
    topic = String(body.topic || '').trim();
    if (!ALLOWED_TOPICS.has(topic)) { res.status(400).json({ message: 'Tundmatu teema.' }); return; }
  }

  const ingress = process.env.AMOS_TOPIC_CAPTURE_URL;
  if (!ingress) {
    // Never silently drop a subscriber: tell them honestly + log for the operator.
    console.error('subscribe: AMOS_TOPIC_CAPTURE_URL is not configured');
    res.status(503).json({ message: 'Teavituste tellimine on hetkel ajutiselt suletud. Proovi varsti uuesti.' });
    return;
  }

  try {
    const r = await fetch(ingress, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(process.env.AMOS_CAPTURE_TOKEN ? { authorization: `Bearer ${process.env.AMOS_CAPTURE_TOKEN}` } : {}),
      },
      body: JSON.stringify({
        kind,
        email,
        interest_topic: topic,
        field,
        ...(outcomes && outcomes.length ? { outcomes } : {}),
        ...(fundingRoute ? { funding_route: fundingRoute } : {}),
        consent_purpose: 'course_offers',
        source_site: sourceSite,
        captured_at: new Date().toISOString(),
      }),
    });
    if (!r.ok) { console.error('subscribe: ingress status', r.status); res.status(502).json({ message: 'Tellimine ebaõnnestus. Proovi hiljem uuesti.' }); return; }
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('subscribe: ingress error', e && e.message);
    res.status(502).json({ message: 'Tellimine ebaõnnestus. Proovi hiljem uuesti.' });
  }
}
