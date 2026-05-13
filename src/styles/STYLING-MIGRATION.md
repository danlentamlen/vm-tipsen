/**
 * STYLING-MIGRATION.md
 *
 * Hur du migrerar resterande komponenter från inline-stilar
 * till tokens.css-systemet. Leaderboard.jsx är referensexemplet.
 *
 * PRINCIP
 * ────────
 * Varje komponent HAR en liten <style>-tagg — men bara för det
 * som är unikt för just den komponenten (t.ex. .lb-rad, .m-nav-btn).
 * Allt som upprepas i flera komponenter bör vara en klass i tokens.css.
 *
 * VANLIGA INLINE-STILAR ATT BYTA UT
 * ───────────────────────────────────
 *
 * Istället för:                          Använd:
 * ─────────────────────────────────────────────────────────────
 * style={{ color: '#C8102E' }}           className="eyebrow"     (eller color: var(--c-röd))
 * style={{ color: '#0a1628' }}           color: var(--c-mörk)
 * style={{ color: '#888' }}              color: var(--c-text-3)
 * style={{ color: '#aaa' }}              color: var(--c-text-4)
 * style={{ fontFamily: "'Barlow...'" }}  font-family: var(--font-bred)  (löptext)
 *                                        font-family: var(--font-bred)  (rubriker)
 * style={{ padding: '2rem 1rem 5rem' }}  className="page-wrap"
 * style={{ maxWidth: 760, margin:'auto'}}className="page-wrap"
 * style={{ background: '#fff', border.. }}className="card"
 * <style>{`@import url(fonts...)...`}    Ta bort — fonten laddas i index.css
 *
 * STEG-FÖR-STEG PER KOMPONENT
 * ─────────────────────────────
 *
 * 1. Ta bort @import url('fonts.googleapis.com/...') ur <style>-taggen
 *    → Fonten laddas redan globalt via index.css
 *
 * 2. Leta upp klasser som matchar tokens.css (se listan nedan)
 *    → Byt ut klassens CSS-definition mot en @apply eller ta bort den
 *      och använd token-klassen direkt i className
 *
 * 3. Byt inline style-props mot CSS-variabler
 *    Exempel:
 *      Före:  style={{ color: '#C8102E', marginBottom: '0.3rem' }}
 *      Efter: className="eyebrow"   (innehåller båda reglerna)
 *
 *    Eller om du bara vill byta färgen:
 *      Före:  style={{ color: '#aaa' }}
 *      Efter: style={{ color: 'var(--c-text-4)' }}
 *
 * KLASSER I TOKENS.CSS (komplett lista)
 * ──────────────────────────────────────
 * Layout:
 *   .page-wrap          max-width 760px, centrerad, padding 2rem 1rem 5rem
 *   .page-wrap-wide     max-width 900px
 *
 * Typografi:
 *   .eyebrow            Liten röd versalrubrik (t.ex. "VM-TIPSEN 2026")
 *   .page-title         Stor clamp-rubrik
 *
 * Komponenter:
 *   .card               Vitt kort med kant + skugga
 *   .btn                Basknapp (kombinera med .btn-primär / .btn-fara / .btn-success / .btn-sekundär)
 *   .badge              Liten etikettbricka (kombinera med .badge-betalt etc.)
 *   .input-fält         Textinmatning med focus-ring
 *   .info-ruta          Informationsruta med vänsterkant
 *   .banner             Bred notisbanner (.banner-varning / .banner-lås)
 *   .fel-banner         Röd felbanner (använder .btn internt)
 *   .toast              Fast toast-notis längst ner
 *   .summering          Flexrad med summerings-kort
 *   .summering-post     Enskilt summerings-kort
 *   .summering-värde    Stort tal i summerings-kort
 *   .summering-etikett  Liten versal etikett under talet
 *
 * CSS-variabler (använd i style={} eller i komponent-CSS):
 *   --c-röd, --c-guld, --c-guld-ljus
 *   --c-mörk, --c-mörk-2
 *   --c-bg, --c-yta, --c-yta-2
 *   --c-text, --c-text-2, --c-text-3, --c-text-4
 *   --c-kant, --c-kant-2
 *   --font-bred (Barlow), --font-text (Barlow Condensed)
 *   --r-sm, --r-md, --r-lg, --r-xl, --r-pill
 *   --shadow-sm, --shadow-md, --shadow-lg
 *   --t-snabb, --t-normal
 *
 * PRIORITETSORDNING FÖR MIGRATION
 * ─────────────────────────────────
 * Hög nytta → börja med dessa:
 *   1. Matches.jsx       (~400 rader CSS i <style>-tagg)
 *   2. Admin.jsx         (~200 rader CSS i <style>-tagg) — redan delvis gjort
 *   3. Participants.jsx  (~150 rader CSS i <style>-tagg)
 *   4. Forum.jsx         (~120 rader CSS i <style>-tagg)
 *   5. Info.jsx          (~100 rader CSS i <style>-tagg)
 */
