// KONTO API CLIENT — brauseri-poolne sild AMOS konto teenuse külge (lipuga lukus).
//
// MIKS SEE FAIL OLEMAS ON:
//   Konto-vaade (/konto/) ja kinnitusleht (/konto/kinnita/) peavad rääkima
//   AMOS-i konto API-ga: e-posti-link sisselogimine, serveri-seisundi lugemine
//   ja pakettide sünkroonimine. See moodul on AINUS koht, kus need võrgukutsed
//   elavad — leht kutsub neid, ei koosta ise päringuid.
//
// LIPP (FLAG-GATE):
//   `PUBLIC_KONTO_API_BASE` on TÜHI, kuni AMOS on valmis. Tühja baasiga on
//   `kontoEnabled()` false ja leht jääb VANALE localStorage-sillale (välja-
//   logitud käitumine puutumata). Kui lipp seatakse, lülitub päris-tee sisse.
//
// PRIVAATSUS (KÕVA REEGEL):
//   - Server EI SALVESTA nimesid. Paketi NIMI on kliendi vaba tekst ja jääb
//     brauserisse (NAMES_KEY). Serverile lähevad AINULT mitte-PII viited
//     (`out_…`) ja kliendi-poolne `client_id`.
//   - Toorest e-posti EI hoita kuskil; see käib AINULT `requestLogin`-i sisse.
//   - Sessioonipide hoitakse localStorage'is (SESSION_KEY) ja saadetakse
//     AINULT `Authorization: Bearer` päises.
//   - Päringutes saadame AINULT lepingus loetletud välju, ei midagi muud.
//
// VASTUPIDAVUS:
//   Ükski võrgukutse EI VISKA lehe poole — kõik on try/catch sees ja annavad
//   tagasi `null`/`false`. Leht otsustab nähtava käitumise. Sama mustriga
//   on kaitstud kõik localStorage-pöördused (privaatrežiim / quota).

/**
 * AMOS konto API baas-URL. TÜHI string = lipp maas (päris-tee välja lülitatud).
 * Astro asendab `import.meta.env.PUBLIC_KONTO_API_BASE` build-ajal.
 */
export const KONTO_API_BASE: string = import.meta.env.PUBLIC_KONTO_API_BASE ?? "";

/** localStorage võtmed (uued — ei kattu vana sillaga). */
export const SESSION_KEY = "mkval:konto_session";
export const NAMES_KEY = "mkval:konto_names";

/** API tee-osad (üks tõeallikas, et URL-id ei lahkneks). */
const PATH = {
  loginRequest: "/api/konto/v1/login/request",
  loginVerify: "/api/konto/v1/login/verify",
  state: "/api/konto/v1/state",
  sync: "/api/konto/v1/packages/sync",
} as const;

/**
 * Kas päris konto-tee on sees? AINULT siis, kui lipp (baas-URL) on seatud.
 * Tühja baasiga jääb leht vanale localStorage-sillale (välja-logitud käitumine).
 */
export function kontoEnabled(): boolean {
  return !!KONTO_API_BASE;
}

// ── Sessioonipide (localStorage) ───────────────────────────────────────────

/** Loe sessioonipide või null (puudub / privaatrežiim). */
export function getSession(): string | null {
  try {
    const t = localStorage.getItem(SESSION_KEY);
    return t && t.length > 0 ? t : null;
  } catch {
    return null;
  }
}

/** Salvesta sessioonipide. Vaikne privaatrežiimis (ei viska). */
export function setSession(t: string): void {
  try {
    localStorage.setItem(SESSION_KEY, t);
  } catch {
    /* private mode / quota — ignoreeri */
  }
}

/** Kustuta sessioonipide (välja logimine). Vaikne, kui pole. */
export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

// ── Sisemine: ühtne fetch-abi ──────────────────────────────────────────────

/**
 * Koosta absoluutne URL baasi pealt. Trimmib lõpukaldkriipsu, et vältida
 * topelt-kaldkriipsu (`base + path`).
 */
function url(path: string): string {
  return `${KONTO_API_BASE.replace(/\/+$/, "")}${path}`;
}

/**
 * POST JSON ja tagasta läbiparsitud keha AINULT 2xx korral, muidu null.
 * Ei viska kunagi lehe poole (võrk/parse/HTTP — kõik → null).
 */
async function postJson(path: string, body: unknown, bearer?: string): Promise<any | null> {
  if (!kontoEnabled()) return null;
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (bearer) headers["Authorization"] = `Bearer ${bearer}`;
    const res = await fetch(url(path), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ── Sisselogimine (e-posti link) ───────────────────────────────────────────

/**
 * Küsi sisselogimislink e-postile. Oracle-vaba: server vastab alati {ok:true},
 * sõltumata sellest, kas e-post on tuntud. Toorest e-posti EI salvestata.
 * @returns `{ ok: true }` õnnestumisel, `{ ok: false }` mis tahes tõrkel.
 */
export async function requestLogin(email: string): Promise<{ ok: boolean }> {
  const data = await postJson(PATH.loginRequest, { email });
  return { ok: !!(data && data.ok === true) };
}

/**
 * Kinnita sisselogimine lingi tokeniga. Õnnestumisel SALVESTA sessioon ja
 * tagasta `{ session, person_ref }`. Tõrke / vigase tokeni korral null.
 * @returns `{ session, person_ref }` 200 korral, muidu null.
 */
export async function verifyLogin(
  token: string,
): Promise<{ session: string; person_ref: string } | null> {
  const data = await postJson(PATH.loginVerify, { token });
  if (!data || typeof data.session !== "string" || typeof data.person_ref !== "string") {
    return null;
  }
  setSession(data.session);
  return { session: data.session, person_ref: data.person_ref };
}

// ── Seisund + sünkroonimine (Bearer) ───────────────────────────────────────

/**
 * Loe serveri konto-seisund (Bearer). NB: server ei tagasta nimesid — ainult
 * `package_ref` + `outcome_refs` + viimati-arvutatud kattuvuse väljad.
 * @returns `{ packages }` 200 korral; null kui sessioon puudub või 401/tõrge.
 */
export async function fetchState(): Promise<{ packages: any[] } | null> {
  if (!kontoEnabled()) return null;
  const session = getSession();
  if (!session) return null;
  try {
    const res = await fetch(url(PATH.state), {
      method: "GET",
      headers: { Authorization: `Bearer ${session}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { packages: Array.isArray(data?.packages) ? data.packages : [] };
  } catch {
    return null;
  }
}

/**
 * Sünkrooni kliendi paketid serverisse (Bearer). Saadame AINULT mitte-PII
 * viiteid (`out_…`) + kliendi `client_id` (+ valikuline kattuvus), MITTE nimesid
 * ega õpiväljundi teksti. Tagastab serveri-loodud `package_ref`-id.
 * @param payload Sünkroonitavad paketid (vt `buildSyncPayload`).
 * @returns `{ packages: [{ client_id, package_ref }] }` õnnestumisel, muidu null.
 */
export async function syncPackages(
  payload: { client_id: string; outcome_refs: string[]; coverage?: any; package_ref?: string }[],
): Promise<{ packages: { client_id: string; package_ref: string }[] } | null> {
  if (!kontoEnabled()) return null;
  const session = getSession();
  if (!session) return null;
  const data = await postJson(PATH.sync, { packages: payload }, session);
  if (!data || !Array.isArray(data.packages)) return null;
  return { packages: data.packages };
}

// ── Nimekaart (package_ref -> nimi) — AINULT kliendi pool ───────────────────
//
// Server ei salvesta nimesid, seega hoiame `package_ref -> nimi` kaardi
// lokaalselt. Nii saab konto-vaade serveri-seisundile (millel pole nimesid)
// taas inimkeelsed sildid panna, ilma et nimi kunagi serverisse läheks.

/** Loe terve nimekaart (`package_ref` -> nimi). Tõrkel tühi objekt. */
export function getNames(): Record<string, string> {
  try {
    const raw = localStorage.getItem(NAMES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** Salvesta üks `package_ref` -> nimi seos. Vaikne privaatrežiimis. */
export function setName(ref: string, name: string): void {
  if (!ref) return;
  try {
    const names = getNames();
    names[ref] = name;
    localStorage.setItem(NAMES_KEY, JSON.stringify(names));
  } catch {
    /* private mode / quota — ignoreeri */
  }
}

/** Leia ühe `package_ref` nimi, või null kui pole teada. */
export function getNamesFor(ref: string): string | null {
  const names = getNames();
  return ref && typeof names[ref] === "string" ? names[ref] : null;
}
