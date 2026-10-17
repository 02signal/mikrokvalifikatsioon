// Vercel serverless function: CSP Report-Only vastuvõtja (mikrokvalifikatsioon.ee).
// Brauser saadab siia rikkumisaruanded (Content-Security-Policy-Report-Only päise `report-uri`).
// Funktsioon ei salvesta midagi ega tee välispäringuid: kirjutab ühe lühikese JSON-rea Verceli
// runtime-logisse (`csp_report ...`) ja vastab 204. Ainult direktiiv, blokeeritud host ja leht (ilma
// päringustringita, et URL-i parameetrid ei läheks logisse). Piirid: ainult POST, <= 8 kB.
const MAX_BYTES = 8 * 1024;

const hostOf = (value) => {
  if (!value || typeof value !== 'string') return '';
  if (value === 'inline' || value === 'eval' || value === 'self' || value === 'data') return value;
  try { const u = new URL(value); return u.protocol === 'data:' ? 'data' : u.host; } catch { return String(value).slice(0, 40); }
};
const pathOf = (value) => {
  try { return new URL(value).pathname.slice(0, 120); } catch { return ''; }
};

export function summarise(body) {
  const raw = body && (body['csp-report'] || (Array.isArray(body) ? body[0]?.body : body.body) || body);
  if (!raw || typeof raw !== 'object') return null;
  return {
    directive: String(raw['effective-directive'] || raw.effectiveDirective || raw['violated-directive'] || '').slice(0, 40),
    blocked: hostOf(raw['blocked-uri'] || raw.blockedURL),
    page: pathOf(raw['document-uri'] || raw.documentURL)
  };
}

const finish = (res, text) => {
  if (text && text.length <= MAX_BYTES) {
    try {
      const entry = summarise(JSON.parse(text));
      if (entry) console.log('csp_report ' + JSON.stringify(entry));
    } catch { /* vigane keha: vaikne 204 */ }
  }
  res.statusCode = 204;
  res.end();
};

export default function handler(req, res) {
  if (req.method !== 'POST') { res.statusCode = 405; res.setHeader('Allow', 'POST'); res.end(); return; }
  // Vercel parsib application/json ise; application/csp-report ja reports+json jäävad vooks/Bufferiks.
  const pre = req.body;
  if (pre !== undefined && pre !== null) {
    if (Buffer.isBuffer(pre)) return finish(res, pre.toString('utf8'));
    if (typeof pre === 'string') return finish(res, pre);
    return finish(res, JSON.stringify(pre));
  }
  const chunks = [];
  let size = 0;
  req.on('data', (chunk) => { size += chunk.length; if (size <= MAX_BYTES) chunks.push(chunk); });
  req.on('end', () => finish(res, size <= MAX_BYTES ? Buffer.concat(chunks).toString('utf8') : ''));
}
