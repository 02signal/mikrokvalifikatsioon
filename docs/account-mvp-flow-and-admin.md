# Minu konto — EVK kaubamärgiülene konto: töövoog, haldusvaade, taristu-checklist

mkval ET avalik nägu (`/konto/`) ↔ AMOS aju ↔ Twenty ↔ üks saatemootor. Aus seis: avalik
staatiline nägu on valmis, build-green, embargo-turvaline ja GDPR-korrektne; live-ühenduseks
AMOS-i on veel taristusamme. PR-id: mikrokvalifikatsioon #6 (nägu + gate), 02S-AMOS #1103
(kontraktid/skeem). ADR: `docs/amos-account-layer-plan.md` + `amos-identity-engagement-amendment.md`
(+ AMOS ratifitseeritud cross-brand identity ADR).

## 1. Täielik töövoog

```
[ANON brauser]  /oskused/ → mkval:pakett[]  (+ mkval:interest:<slug>)   localStorage, ei PII, ei nõusolekut
      ▼  CTA "Salvesta pakett ja loo konto"
[/konto/]  e-post + kohustuslik nõusoleku linnuke (topelt-nõusoleku tekst)
      ▼
[mkval api/subscribe.js]  POST → AMOS ingress (AMOS_TOPIC_CAPTURE_URL)
      │  account_create→account_created (normaliseeritud kanoonilisteks kindideks)
      ▼
[AMOS amos_consent.consent_records]  double_opt_in_state = PENDING  → magic-link e-kiri (HMAC)
      ▼  /konto/kinnita?token=… → DOI = CONFIRMED → sessioon
[ESMA-LOGIN MIGRATSIOON]  kadudeta union-merge (võti = outcome .key / interest slug; local kustub alles peale serveri kinnitust)
      ▼
[Twenty Person]  üks inimene = üks person_ref kõigi kaubamärkide üleselt; ROLL elab Person×Brand serval
      ▼
[ÜKS MOOTOR, mitu nägu]  brand_sender_registry → õige saatja; meeldetuletused/teavitused send-gate'iga
      ▼
[rev-web]  operaator: /person/:ref · /demand cohorts
```

**Põhimõte:** avalik nägu hoiab ainult lühiajalist sessiooni + migreeritavat localStorage'i.
Identiteet, nõusolek, paketid, meeldetuletused elavad AMOS-is. Ükski avalik leht ei vihja, et
EVK-l oleks oma programm — nõudlust kogutakse neutraalselt.

## 2. Mis töötab täna vs. mis vajab taristut

| Funktsioon | Seis | Selgitus |
|---|---|---|
| Konto loomine **koos paketiga** | 🟢 LIVE | `outcome_package` jõuab AMOS-i, `course_offers` pending double-opt-in. |
| `/konto/` UI, demo-login, magic-link maandumine | 🟡 SILD | kontoseis `localStorage`-is (`mkval:account`), kollane "Demorežiim" bänner + `// BRIDGE:` kommentaarid. |
| Esma-login union-merge | 🟡 SILD | verifitseeritud kadudeta; backend stub. |
| Meeldetuletused / teavituslehed / toetuse profiil | 🔴 TARISTU | nimed nüüd ühtsed (gate normaliseerib); AMOS ingress-adapter peab account-kindid envelope'iks mapima (PR #1103 follow-up). |
| Magic-link HMAC, `/konto/state·migrate·delete` | 🔴 TARISTU | vajab `konto.*` SSR alamdomeeni; apex jääb `output:"static"`. |
| Twenty Person + kaubamärgiülesed rollid | 🔴 TARISTU | Twenty juurutus + `amos_crm.person_brand_relationship` tabel. |

**Roheliseks tõestatud:** mkval build 406 lehte, `astro check` 0 viga; embargo puhas; GDPR
(ainult `course_offers`, kohustuslik DOI, tagasivõtt/kustutus/eksport). AMOS smoke 14/0 + 7/0.

## 3. Haldusvaade (operaator — Twenty + rev-web; PII piiratud tsoonis)

**(a) `/person/:person_ref` — üks inimene, kõik kaubamärgid:** identiteedi-päis (resolutsioon
`resolved`/`pending_merge`) · **kaubamärgipõhised rollid** (üks rida per brand×role; taksonoomia
`learner, owner_grant_seeker, b2b_buyer, provider, trainer, partner, staff, alumni`) ·
**kaubamärgipõhised nõusolekud** (per brand×purpose, DOI chip, ainult `confirmed` on mailable) ·
salvestatud paketid (`combo_size>1` = nõudlussignaal) · meeldetuletused · toetuse-segment
(`ise`/`tootukassa`/`tooandja`, mitte kunagi isikukood) · kaubamärgiülene logi.

**(b) `/demand` — build-next:** combo-ootenimekirja kohordid (PII-vabad banded veerud:
kombinatsioon, suurus, rahastuse jaotus, parim minimaal-katvus, trend) · põhjuse-rida
("8 inimest tahavad X+Y; ükski üksik programm ei kata") · identified drill-down (PII-lukus) ·
ready-launch lipp (kohort ≥ lävi JA ≥ X% `confirmed` nõusolek).

**(c) Kontrollid:** manuaalne identiteedi-merge järjekord (union-by-key, never overwrite) ·
nõusoleku tagasivõtt/kustutus **suppression-first** (globaalne `email_hmac` tombstone enne
delete; pole un-suppress nuppu) · **send-gate igal saatel** (nimeline inimene kinnitab; agendid
ainult mustandavad).

**(d) Kaubamärgiülene kaitse:** püsibänner "Cross-brand reuse: DEFAULT NO"; aktiivne block kui
brändi A andmeid üritatakse brändi B jaoks; `Log cross-brand lawful basis` ainult omanikule, per
(brand-pair, purpose), pole standing exception'eid.

## 4. UAT (live capture tee)

```bash
cd /Users/ak/GitHub/mikrokvalifikatsioon && npm run build && npm run preview
```
1. `/oskused/` → korja oskusi (tekib `mkval:pakett`). 2. "Salvesta pakett ja loo konto" → `/konto/`.
3. e-post + nõusoleku linnuke (kohustuslik) → "Saada link". 4. Network: POST `api/subscribe`
→ `outcome_package` jõuab AMOS-i. 5. Screen "Kontrolli e-posti" (magic-link demorežiimis).
Kontrolli: nõusolek kohustuslik uuele kontole; migratsioon kadudeta; `grep -ri daca dist/konto/` tühi.

## 5. Taristu-checklist (omanik / AMOS-service)

- [ ] AMOS ingress-adapter `buildMkvalTopicCaptureEnvelope` mapib account-kindid envelope'iks (PR #1103 follow-up).
- [ ] `konto.*` SSR alamdomeen (HMAC confirm-token); apex jääb staatiliseks.
- [ ] Konto-store + endpointid `/konto/state·migrate·delete` (AMOS-is).
- [ ] Magic-link saatja (confirm-token seam + `info@mikrokvalifikatsioon.ee`).
- [ ] Twenty standup + `amos_crm.person_brand_relationship` tabeli migratsioon (CHECK == S2 Set'id).
- [ ] Env: `AMOS_TOPIC_CAPTURE_URL`, `AMOS_CAPTURE_TOKEN`, confirm-token secret, suppression pepper.
- **Drift-valve:** iga enum-muutus = kontrakti `Set` + SQL `CHECK` samas patchis; `brand_key` joondatud `brand_sender_registry`-ga.
