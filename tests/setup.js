// tests/setup.js
// Importeras av Vitest före varje testfil.
// Lägger till jest-dom-matchers: toBeInTheDocument(), toHaveTextContent() osv.
// OBS: /vitest-entrypointen kopplar matchers till Vitests expect automatiskt.
// Utan den krävs globals:true, annars kraschar setup med "expect is not defined".
import '@testing-library/jest-dom/vitest'
