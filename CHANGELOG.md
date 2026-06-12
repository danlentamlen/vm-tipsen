# vm-tipsen — Komplett förbättringspaket

## Korrekthet: dedupe av tips/svar + live skytteliga (2026-06-12)

**Bugg (åtgärdad):** Topplistan och deltagarprofilen dubbelräknade poäng. Tips-
och FrågorSvar-arken är append-baserade — en redigering kan ge flera rader för
samma `(user, match)` resp. `(user, fråga)` — och poänglogiken summerade alla
rader. En ledare visade t.ex. 23p i stället för 7p.

**Lösning:** Två rena helpers i `_scoring.js` — `dedupliceraTips()` och
`dedupliceraSvar()` — behåller bara den **sista** raden per nyckel (senare rad =
senare sparad). De appliceras centralt så att alla vyer räknar lika:

| Var | Fil | Effekt |
|-----|-----|--------|
| Match-/tippoäng | `_scoring.js` (`beräknaMatchpoängPerAnvändare`) | Topplista, "bäst igår", snapshot |
| Frågepoäng | `_scoring.js` (`beräknaTopplista`) | Tilläggsfrågor räknas en gång |
| Deltagarprofil | `participants.js` | Visar en rad per match/fråga, delad poänglogik |
| Match-statistik | `match-stats.js` | Fördelning/träffsäkerhet ej uppblåst |
| Regressionstester | `tests/unit/scoring.test.js` | Dubbletter → räknas en gång |

**Skytteligan (live):** `top-scorers`-widgeten på startsidan läste ett manuellt
`Skytteliga`-ark som saknades (kraschade med "Unable to parse range"). Nu hämtar
writern topp-15 målskyttar live (`getTopScorers()` i `_resultsSource.js`) och
skriver dem till `Skytteliga`-arket var 5:e minut. Läsvägen förblir billig (litet
ark, inget API-anrop per sidladdning). Saknas data (innan VM) lämnas arket orört.

**Viktigt vid uppgradering:** topplistan läses från snapshot — kör
`sync-results` en gång (eller vänta på schemat) så att `Topplista`-arket och
cachen `standings:v1` skrivs om med dedupe. Enbart omstart räcker inte.

---

## Prestanda & resultat (2026-06-12)

Mål: snabbare startsida + topplista, snabbare resultatuppdatering, och poäng
sparade per match i Sheets.

| Område | Filer | Status |
|--------|-------|--------|
| Delad poänglogik | `_scoring.js` + `tests/unit/scoring.test.js` | ✅ |
| Persistent cache (överlever cold starts) | `_persistentCache.js`, `_lockedData.js` | ✅ |
| Förberäknad snapshot (writer) | `sync-results.js` → nytt `Topplista`-ark + Tips kol. F | ✅ |
| Snabba läs-endpoints | `scores.js`, `scores-yesterday.js`, `match-stats.js`, `matches.js`, `my-status.js` | ✅ |
| Gratis sekundär resultatkälla | `_resultsSource.js` + `tests/unit/resultsSource.test.js` | ✅ |
| Snabbare sync (15→5 min) | `netlify.toml` | ✅ |

**Kärnidé:** Den schemalagda `sync-results` (writer) räknar om topplista, "bäst
igår" och matchpoäng EN gång var 5:e min och skriver förberäknade snapshots.
De användarvända endpoints läser små snapshots i stället för att skanna hela
`Tips`-arket vid varje sidladdning. De låsta arken (Matcher, Användare, Viner,
Frågor, FrågorSvar) cachas i ett lager som överlever cold starts.

**Att aktivera vid deploy:**
1. `npm install` (lägger till `@netlify/blobs` för persistent cache).
2. Valfritt: sätt env `THESPORTSDB_LEAGUE` (+ ev. `THESPORTSDB_KEY`, `THESPORTSDB_SEASON`)
   för att slå på den fria sekundärkällan. Utan den är beteendet som tidigare.
3. `Topplista`-arket skapas automatiskt av `sync-results` vid första körningen.
4. Allt är additivt med fallback — saknas snapshot räknas allt live som förut.

---

## Översikt — vad som ändrats

| Område       | Filer | Status |
|-------------|-------|--------|
| Säkerhet    | `_rateLimiter.js`, `auth-login.js`, `useAdmin.js` | ✅ Klar |
| Kodkvalitet | `useAdmin.js`, `Admin.jsx`, `Leaderboard.jsx`     | ✅ Klar |
| Styling     | `tokens.css`, `index.css`, `Leaderboard.jsx`      | ✅ Klar |
| Testning    | `vitest.config.js`, `package.json`, 3 testfiler  | ✅ Klar |

---

## 1. Säkerhet

### `Netlify/functions/_rateLimiter.js` — NY
Skyddar mot brute-force på inloggning:
- Blockerar IP efter **5 misslyckade försök** i 15-minutersfönster
- Blockeringstid: 15 minuter
- Returnerar 429 med `Retry-After`-header
- Nollställs automatiskt vid lyckad inloggning

### `Netlify/functions/auth-login.js` — ERSÄTTER ORIGINAL
- Integrerar `_rateLimiter.js`
- Identiskt generiskt felmeddelande för okänd email OCH fel lösenord (förhindrar user enumeration)

### `src/hooks/useAdmin.js` — NY
- `admin_secret` lagras i **sessionStorage** istället för localStorage
- sessionStorage rensas automatiskt när webbläsarfliken stängs
- Migrerar automatiskt gammal localStorage-post
- Loggar ut automatiskt vid 401-svar från backend

---

## 2. Kodkvalitet

### `src/hooks/useAdmin.js` — NY
Extraherar all logik ur `Admin.jsx`:
- All state (inloggad, settings, viner, toast...)
- Alla API-anrop (logga_in, hämtaSettings, toggleLås, sparaStatus, skickaKvitto)
- `Admin.jsx` går från ~350 rader till ~180 rader ren presentationslogik

### `src/pages/Admin.jsx` — REFAKTORERAD
- Använder `useAdmin`-hooken
- `BetalningsTabell` är en separat delkomponent
- Utloggningsknapp tillagd (saknades)
- `disabled`-state på inloggningsknapp under laddning

### `src/pages/Leaderboard.jsx` — FÖRBÄTTRAD
- Felhantering + retry-knapp
- Markerar inloggad användares rad `(du)`
- Defensiv dataparsning — kraschar inte på ofullständiga svar
- `useCallback` för stabil funktionsreferens

---

## 3. Styling

### `src/styles/tokens.css` — NY
Centralt designsystem som eliminerar ~1000 rader duplicerad CSS:
- CSS-variabler för alla färger, fonter, radier, skuggor
- Tailwind `@theme`-extension med `text-röd`, `bg-mörk`, `font-condensed`
- Återanvändbara klasser: `.card`, `.btn`, `.eyebrow`, `.page-title`, `.page-wrap`, `.badge`, `.toast`, `.fel-banner`, m.fl.

### `src/index.css` — UPPDATERAD
- Importerar Google Fonts **en gång globalt** (eliminerar ~15 duplicerade `@import` per sidladdning)
- Importerar `tokens.css`

### `src/styles/STYLING-MIGRATION.md`
Steg-för-steg-guide för att migrera resterande komponenter:
- Vilka inline-stilar som ska bytas ut mot vad
- Komplett lista över token-klasser
- Prioritetsordning (Matches.jsx har mest att vinna)

---

## 4. Testning

### `vitest.config.js` — NY
- jsdom-miljö för React-komponenter
- Testtäckning via `@vitest/coverage-v8`

### `package.json` — UPPDATERAD
Nya devDependencies:
```
vitest, @vitest/coverage-v8, jsdom
@testing-library/react, @testing-library/jest-dom, @testing-library/user-event
```
Nya scripts:
```
npm test            → kör alla tester en gång
npm run test:watch  → watch-läge under utveckling
npm run test:coverage → rapport med täckningsgrad
```

### `tests/unit/rateLimiter.test.js`
9 tester för `_rateLimiter.js`:
- Tillåter ny IP
- Blockerar efter 5 försök
- Blockerar inte andra IPs
- Upphör efter blockeringstiden
- Nollställs via `resetAttempts`

### `tests/unit/useAdmin.test.js`
7 tester för `useAdmin`-hooken:
- Initial state utan nyckel
- Läser sessionStorage korrekt
- Migrerar localStorage → sessionStorage
- Sparar i sessionStorage (inte localStorage) vid inloggning
- Felmeddelande vid fel lösenord
- Rensas vid utloggning

### `tests/integration/authLogin.test.js`
9 tester för hela `auth-login`-funktionen:
- Lyckad inloggning → 200 + JWT
- Fel lösenord → 401
- Okänd email → 401 (inte 404)
- Saknad email i body → 400
- Blockeras efter 5 försök → 429
- Räknaren nollställs vid lyckad inloggning
- GET-request → 405

---

## Installation

### Steg 1: Installera nya beroenden
```bash
npm install
# (package.json är uppdaterad med vitest + testing-library)
```

### Steg 2: Kopiera filerna
```
Netlify/functions/_rateLimiter.js   → ny fil
Netlify/functions/auth-login.js     → ersätter original
src/hooks/useAdmin.js               → ny fil
src/pages/Admin.jsx                 → ersätter original
src/pages/Leaderboard.jsx           → ersätter original
src/styles/tokens.css               → ny fil
src/styles/STYLING-MIGRATION.md     → ny fil (läs denna!)
src/index.css                       → ersätter original
vitest.config.js                    → ny fil
tests/setup.js                      → ny fil
tests/unit/rateLimiter.test.js      → ny fil
tests/unit/useAdmin.test.js         → ny fil
tests/integration/authLogin.test.js → ny fil
package.json                        → ersätter original
```

### Steg 3: Verifiera
```bash
npm test
# Förväntat: 25 tester, alla gröna
```

### Steg 4: Kontrollera admin-säkerheten
1. Logga in som admin
2. Öppna DevTools → Application → Storage
3. `admin_secret` ska ligga under **sessionStorage**, inte localStorage
4. Stäng fliken och öppna /admin → ska kräva inloggning igen ✓
```
