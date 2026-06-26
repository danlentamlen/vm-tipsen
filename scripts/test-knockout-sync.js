/**
 * scripts/test-knockout-sync.js
 *
 * Testar knockout-lagnamnssynken.
 * Bracketstruktur från openfootball (num → match_id), poäng från Resultat-arket.
 * Stöder matematisk bestämning: laget är klart för en plats om det inte KAN
 * bli omsprungen även om alla kvarvarande matcher spelar mot dem.
 *
 * Kör:
 *   node scripts/test-knockout-sync.js          # dry-run
 *   node scripts/test-knockout-sync.js --apply  # skriv till Sheets
 */

import dotenv from 'dotenv'
import { google } from 'googleapis'

dotenv.config()

const SHEET_ID = process.env.GOOGLE_SHEET_ID
const APPLY    = process.argv.includes('--apply')

const OPENFOOTBALL_URL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'

const SLUTSPELS_OMGÅNGAR = [
  'Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final',
  'Match for third place', 'Final',
]
const FÖREGÅENDE_OMGÅNG = {
  'Round of 16':           'Round of 32',
  'Quarter-final':         'Round of 16',
  'Semi-final':            'Quarter-final',
  'Final':                 'Semi-final',
  'Match for third place': 'Semi-final',
}
const LAGNAMN_MAP = {
  'Bosnia and Herzegovina': 'Bosnia & Herzegovina',
  'United States': 'USA',
  'Korea Republic': 'South Korea',
  'IR Iran': 'Iran',
  'Czechia': 'Czech Republic',
  'Türkiye': 'Turkey',
  "Côte d'Ivoire": 'Ivory Coast',
  'China PR': 'China',
  'Cabo Verde': 'Cape Verde',
  'Cape Verde Islands': 'Cape Verde',
}

const TREDJEPLACERING_TABELL = {
  'EFGHIJKL': ['3E', '3J', '3I', '3F', '3H', '3G', '3L', '3K'],
  'DFGHIJKL': ['3H', '3G', '3I', '3D', '3J', '3F', '3L', '3K'],
  'DEGHIJKL': ['3E', '3J', '3I', '3D', '3H', '3G', '3L', '3K'],
  'DEFHIJKL': ['3E', '3J', '3I', '3D', '3H', '3F', '3L', '3K'],
  'DEFGIJKL': ['3E', '3G', '3I', '3D', '3J', '3F', '3L', '3K'],
  'DEFGHJKL': ['3E', '3G', '3J', '3D', '3H', '3F', '3L', '3K'],
  'DEFGHIKL': ['3E', '3G', '3I', '3D', '3H', '3F', '3L', '3K'],
  'DEFGHIJL': ['3E', '3G', '3J', '3D', '3H', '3F', '3L', '3I'],
  'DEFGHIJK': ['3E', '3G', '3J', '3D', '3H', '3F', '3I', '3K'],
  'CFGHIJKL': ['3H', '3G', '3I', '3C', '3J', '3F', '3L', '3K'],
  'CEGHIJKL': ['3E', '3J', '3I', '3C', '3H', '3G', '3L', '3K'],
  'CEFHIJKL': ['3E', '3J', '3I', '3C', '3H', '3F', '3L', '3K'],
  'CEFGIJKL': ['3E', '3G', '3I', '3C', '3J', '3F', '3L', '3K'],
  'CEFGHJKL': ['3E', '3G', '3J', '3C', '3H', '3F', '3L', '3K'],
  'CEFGHIKL': ['3E', '3G', '3I', '3C', '3H', '3F', '3L', '3K'],
  'CEFGHIJL': ['3E', '3G', '3J', '3C', '3H', '3F', '3L', '3I'],
  'CEFGHIJK': ['3E', '3G', '3J', '3C', '3H', '3F', '3I', '3K'],
  'CDGHIJKL': ['3H', '3G', '3I', '3C', '3J', '3D', '3L', '3K'],
  'CDFHIJKL': ['3C', '3J', '3I', '3D', '3H', '3F', '3L', '3K'],
  'CDFGIJKL': ['3C', '3G', '3I', '3D', '3J', '3F', '3L', '3K'],
  'CDFGHJKL': ['3C', '3G', '3J', '3D', '3H', '3F', '3L', '3K'],
  'CDFGHIKL': ['3C', '3G', '3I', '3D', '3H', '3F', '3L', '3K'],
  'CDFGHIJL': ['3C', '3G', '3J', '3D', '3H', '3F', '3L', '3I'],
  'CDFGHIJK': ['3C', '3G', '3J', '3D', '3H', '3F', '3I', '3K'],
  'CDEHIJKL': ['3E', '3J', '3I', '3C', '3H', '3D', '3L', '3K'],
  'CDEGIJKL': ['3E', '3G', '3I', '3C', '3J', '3D', '3L', '3K'],
  'CDEGHJKL': ['3E', '3G', '3J', '3C', '3H', '3D', '3L', '3K'],
  'CDEGHIKL': ['3E', '3G', '3I', '3C', '3H', '3D', '3L', '3K'],
  'CDEGHIJL': ['3E', '3G', '3J', '3C', '3H', '3D', '3L', '3I'],
  'CDEGHIJK': ['3E', '3G', '3J', '3C', '3H', '3D', '3I', '3K'],
  'CDEFIJKL': ['3C', '3J', '3E', '3D', '3I', '3F', '3L', '3K'],
  'CDEFHJKL': ['3C', '3J', '3E', '3D', '3H', '3F', '3L', '3K'],
  'CDEFHIKL': ['3C', '3E', '3I', '3D', '3H', '3F', '3L', '3K'],
  'CDEFHIJL': ['3C', '3J', '3E', '3D', '3H', '3F', '3L', '3I'],
  'CDEFHIJK': ['3C', '3J', '3E', '3D', '3H', '3F', '3I', '3K'],
  'CDEFGJKL': ['3C', '3G', '3E', '3D', '3J', '3F', '3L', '3K'],
  'CDEFGIKL': ['3C', '3G', '3E', '3D', '3I', '3F', '3L', '3K'],
  'CDEFGIJL': ['3C', '3G', '3E', '3D', '3J', '3F', '3L', '3I'],
  'CDEFGIJK': ['3C', '3G', '3E', '3D', '3J', '3F', '3I', '3K'],
  'CDEFGHKL': ['3C', '3G', '3E', '3D', '3H', '3F', '3L', '3K'],
  'CDEFGHJL': ['3C', '3G', '3J', '3D', '3H', '3F', '3L', '3E'],
  'CDEFGHJK': ['3C', '3G', '3J', '3D', '3H', '3F', '3E', '3K'],
  'CDEFGHIL': ['3C', '3G', '3E', '3D', '3H', '3F', '3L', '3I'],
  'CDEFGHIK': ['3C', '3G', '3E', '3D', '3H', '3F', '3I', '3K'],
  'CDEFGHIJ': ['3C', '3G', '3J', '3D', '3H', '3F', '3E', '3I'],
  'BFGHIJKL': ['3H', '3J', '3B', '3F', '3I', '3G', '3L', '3K'],
  'BEGHIJKL': ['3E', '3J', '3I', '3B', '3H', '3G', '3L', '3K'],
  'BEFHIJKL': ['3E', '3J', '3B', '3F', '3I', '3H', '3L', '3K'],
  'BEFGIJKL': ['3E', '3J', '3B', '3F', '3I', '3G', '3L', '3K'],
  'BEFGHJKL': ['3E', '3J', '3B', '3F', '3H', '3G', '3L', '3K'],
  'BEFGHIKL': ['3E', '3G', '3B', '3F', '3I', '3H', '3L', '3K'],
  'BEFGHIJL': ['3E', '3J', '3B', '3F', '3H', '3G', '3L', '3I'],
  'BEFGHIJK': ['3E', '3J', '3B', '3F', '3H', '3G', '3I', '3K'],
  'BDGHIJKL': ['3H', '3J', '3B', '3D', '3I', '3G', '3L', '3K'],
  'BDFHIJKL': ['3H', '3J', '3B', '3D', '3I', '3F', '3L', '3K'],
  'BDFGIJKL': ['3I', '3G', '3B', '3D', '3J', '3F', '3L', '3K'],
  'BDFGHJKL': ['3H', '3G', '3B', '3D', '3J', '3F', '3L', '3K'],
  'BDFGHIKL': ['3H', '3G', '3B', '3D', '3I', '3F', '3L', '3K'],
  'BDFGHIJL': ['3H', '3G', '3B', '3D', '3J', '3F', '3L', '3I'],
  'BDFGHIJK': ['3H', '3G', '3B', '3D', '3J', '3F', '3I', '3K'],
  'BDEHIJKL': ['3E', '3J', '3B', '3D', '3I', '3H', '3L', '3K'],
  'BDEGIJKL': ['3E', '3J', '3B', '3D', '3I', '3G', '3L', '3K'],
  'BDEGHJKL': ['3E', '3J', '3B', '3D', '3H', '3G', '3L', '3K'],
  'BDEGHIKL': ['3E', '3G', '3B', '3D', '3I', '3H', '3L', '3K'],
  'BDEGHIJL': ['3E', '3J', '3B', '3D', '3H', '3G', '3L', '3I'],
  'BDEGHIJK': ['3E', '3J', '3B', '3D', '3H', '3G', '3I', '3K'],
  'BDEFIJKL': ['3E', '3J', '3B', '3D', '3I', '3F', '3L', '3K'],
  'BDEFHJKL': ['3E', '3J', '3B', '3D', '3H', '3F', '3L', '3K'],
  'BDEFHIKL': ['3E', '3I', '3B', '3D', '3H', '3F', '3L', '3K'],
  'BDEFHIJL': ['3E', '3J', '3B', '3D', '3H', '3F', '3L', '3I'],
  'BDEFHIJK': ['3E', '3J', '3B', '3D', '3H', '3F', '3I', '3K'],
  'BDEFGJKL': ['3E', '3G', '3B', '3D', '3J', '3F', '3L', '3K'],
  'BDEFGIKL': ['3E', '3G', '3B', '3D', '3I', '3F', '3L', '3K'],
  'BDEFGIJL': ['3E', '3G', '3B', '3D', '3J', '3F', '3L', '3I'],
  'BDEFGIJK': ['3E', '3G', '3B', '3D', '3J', '3F', '3I', '3K'],
  'BDEFGHKL': ['3E', '3G', '3B', '3D', '3H', '3F', '3L', '3K'],
  'BDEFGHJL': ['3H', '3G', '3B', '3D', '3J', '3F', '3L', '3E'],
  'BDEFGHJK': ['3H', '3G', '3B', '3D', '3J', '3F', '3E', '3K'],
  'BDEFGHIL': ['3E', '3G', '3B', '3D', '3H', '3F', '3L', '3I'],
  'BDEFGHIK': ['3E', '3G', '3B', '3D', '3H', '3F', '3I', '3K'],
  'BDEFGHIJ': ['3H', '3G', '3B', '3D', '3J', '3F', '3E', '3I'],
  'BCGHIJKL': ['3H', '3J', '3B', '3C', '3I', '3G', '3L', '3K'],
  'BCFHIJKL': ['3H', '3J', '3B', '3C', '3I', '3F', '3L', '3K'],
  'BCFGIJKL': ['3I', '3G', '3B', '3C', '3J', '3F', '3L', '3K'],
  'BCFGHJKL': ['3H', '3G', '3B', '3C', '3J', '3F', '3L', '3K'],
  'BCFGHIKL': ['3H', '3G', '3B', '3C', '3I', '3F', '3L', '3K'],
  'BCFGHIJL': ['3H', '3G', '3B', '3C', '3J', '3F', '3L', '3I'],
  'BCFGHIJK': ['3H', '3G', '3B', '3C', '3J', '3F', '3I', '3K'],
  'BCEHIJKL': ['3E', '3J', '3B', '3C', '3I', '3H', '3L', '3K'],
  'BCEGIJKL': ['3E', '3J', '3B', '3C', '3I', '3G', '3L', '3K'],
  'BCEGHJKL': ['3E', '3J', '3B', '3C', '3H', '3G', '3L', '3K'],
  'BCEGHIKL': ['3E', '3G', '3B', '3C', '3I', '3H', '3L', '3K'],
  'BCEGHIJL': ['3E', '3J', '3B', '3C', '3H', '3G', '3L', '3I'],
  'BCEGHIJK': ['3E', '3J', '3B', '3C', '3H', '3G', '3I', '3K'],
  'BCEFIJKL': ['3E', '3J', '3B', '3C', '3I', '3F', '3L', '3K'],
  'BCEFHJKL': ['3E', '3J', '3B', '3C', '3H', '3F', '3L', '3K'],
  'BCEFHIKL': ['3E', '3I', '3B', '3C', '3H', '3F', '3L', '3K'],
  'BCEFHIJL': ['3E', '3J', '3B', '3C', '3H', '3F', '3L', '3I'],
  'BCEFHIJK': ['3E', '3J', '3B', '3C', '3H', '3F', '3I', '3K'],
  'BCEFGJKL': ['3E', '3G', '3B', '3C', '3J', '3F', '3L', '3K'],
  'BCEFGIKL': ['3E', '3G', '3B', '3C', '3I', '3F', '3L', '3K'],
  'BCEFGIJL': ['3E', '3G', '3B', '3C', '3J', '3F', '3L', '3I'],
  'BCEFGIJK': ['3E', '3G', '3B', '3C', '3J', '3F', '3I', '3K'],
  'BCEFGHKL': ['3E', '3G', '3B', '3C', '3H', '3F', '3L', '3K'],
  'BCEFGHJL': ['3H', '3G', '3B', '3C', '3J', '3F', '3L', '3E'],
  'BCEFGHJK': ['3H', '3G', '3B', '3C', '3J', '3F', '3E', '3K'],
  'BCEFGHIL': ['3E', '3G', '3B', '3C', '3H', '3F', '3L', '3I'],
  'BCEFGHIK': ['3E', '3G', '3B', '3C', '3H', '3F', '3I', '3K'],
  'BCEFGHIJ': ['3H', '3G', '3B', '3C', '3J', '3F', '3E', '3I'],
  'BCDHIJKL': ['3H', '3J', '3B', '3C', '3I', '3D', '3L', '3K'],
  'BCDGIJKL': ['3I', '3G', '3B', '3C', '3J', '3D', '3L', '3K'],
  'BCDGHJKL': ['3H', '3G', '3B', '3C', '3J', '3D', '3L', '3K'],
  'BCDGHIKL': ['3H', '3G', '3B', '3C', '3I', '3D', '3L', '3K'],
  'BCDGHIJL': ['3H', '3G', '3B', '3C', '3J', '3D', '3L', '3I'],
  'BCDGHIJK': ['3H', '3G', '3B', '3C', '3J', '3D', '3I', '3K'],
  'BCDFIJKL': ['3C', '3J', '3B', '3D', '3I', '3F', '3L', '3K'],
  'BCDFHJKL': ['3C', '3J', '3B', '3D', '3H', '3F', '3L', '3K'],
  'BCDFHIKL': ['3C', '3I', '3B', '3D', '3H', '3F', '3L', '3K'],
  'BCDFHIJL': ['3C', '3J', '3B', '3D', '3H', '3F', '3L', '3I'],
  'BCDFHIJK': ['3C', '3J', '3B', '3D', '3H', '3F', '3I', '3K'],
  'BCDFGJKL': ['3C', '3G', '3B', '3D', '3J', '3F', '3L', '3K'],
  'BCDFGIKL': ['3C', '3G', '3B', '3D', '3I', '3F', '3L', '3K'],
  'BCDFGIJL': ['3C', '3G', '3B', '3D', '3J', '3F', '3L', '3I'],
  'BCDFGIJK': ['3C', '3G', '3B', '3D', '3J', '3F', '3I', '3K'],
  'BCDFGHKL': ['3C', '3G', '3B', '3D', '3H', '3F', '3L', '3K'],
  'BCDFGHJL': ['3C', '3G', '3B', '3D', '3H', '3F', '3L', '3J'],
  'BCDFGHJK': ['3H', '3G', '3B', '3C', '3J', '3F', '3D', '3K'],
  'BCDFGHIL': ['3C', '3G', '3B', '3D', '3H', '3F', '3L', '3I'],
  'BCDFGHIK': ['3C', '3G', '3B', '3D', '3H', '3F', '3I', '3K'],
  'BCDFGHIJ': ['3H', '3G', '3B', '3C', '3J', '3F', '3D', '3I'],
  'BCDEIJKL': ['3E', '3J', '3B', '3C', '3I', '3D', '3L', '3K'],
  'BCDEHJKL': ['3E', '3J', '3B', '3C', '3H', '3D', '3L', '3K'],
  'BCDEHIKL': ['3E', '3I', '3B', '3C', '3H', '3D', '3L', '3K'],
  'BCDEHIJL': ['3E', '3J', '3B', '3C', '3H', '3D', '3L', '3I'],
  'BCDEHIJK': ['3E', '3J', '3B', '3C', '3H', '3D', '3I', '3K'],
  'BCDEGJKL': ['3E', '3G', '3B', '3C', '3J', '3D', '3L', '3K'],
  'BCDEGIKL': ['3E', '3G', '3B', '3C', '3I', '3D', '3L', '3K'],
  'BCDEGIJL': ['3E', '3G', '3B', '3C', '3J', '3D', '3L', '3I'],
  'BCDEGIJK': ['3E', '3G', '3B', '3C', '3J', '3D', '3I', '3K'],
  'BCDEGHKL': ['3E', '3G', '3B', '3C', '3H', '3D', '3L', '3K'],
  'BCDEGHJL': ['3H', '3G', '3B', '3C', '3J', '3D', '3L', '3E'],
  'BCDEGHJK': ['3H', '3G', '3B', '3C', '3J', '3D', '3E', '3K'],
  'BCDEGHIL': ['3E', '3G', '3B', '3C', '3H', '3D', '3L', '3I'],
  'BCDEGHIK': ['3E', '3G', '3B', '3C', '3H', '3D', '3I', '3K'],
  'BCDEGHIJ': ['3H', '3G', '3B', '3C', '3J', '3D', '3E', '3I'],
  'BCDEFJKL': ['3C', '3J', '3B', '3D', '3E', '3F', '3L', '3K'],
  'BCDEFIKL': ['3C', '3E', '3B', '3D', '3I', '3F', '3L', '3K'],
  'BCDEFIJL': ['3C', '3J', '3B', '3D', '3E', '3F', '3L', '3I'],
  'BCDEFIJK': ['3C', '3J', '3B', '3D', '3E', '3F', '3I', '3K'],
  'BCDEFHKL': ['3C', '3E', '3B', '3D', '3H', '3F', '3L', '3K'],
  'BCDEFHJL': ['3C', '3J', '3B', '3D', '3H', '3F', '3L', '3E'],
  'BCDEFHJK': ['3C', '3J', '3B', '3D', '3H', '3F', '3E', '3K'],
  'BCDEFHIL': ['3C', '3E', '3B', '3D', '3H', '3F', '3L', '3I'],
  'BCDEFHIK': ['3C', '3E', '3B', '3D', '3H', '3F', '3I', '3K'],
  'BCDEFHIJ': ['3C', '3J', '3B', '3D', '3H', '3F', '3E', '3I'],
  'BCDEFGKL': ['3C', '3G', '3B', '3D', '3E', '3F', '3L', '3K'],
  'BCDEFGJL': ['3C', '3G', '3B', '3D', '3J', '3F', '3L', '3E'],
  'BCDEFGJK': ['3C', '3G', '3B', '3D', '3J', '3F', '3E', '3K'],
  'BCDEFGIL': ['3C', '3G', '3B', '3D', '3E', '3F', '3L', '3I'],
  'BCDEFGIK': ['3C', '3G', '3B', '3D', '3E', '3F', '3I', '3K'],
  'BCDEFGIJ': ['3C', '3G', '3B', '3D', '3J', '3F', '3E', '3I'],
  'BCDEFGHL': ['3C', '3G', '3B', '3D', '3H', '3F', '3L', '3E'],
  'BCDEFGHK': ['3C', '3G', '3B', '3D', '3H', '3F', '3E', '3K'],
  'BCDEFGHJ': ['3H', '3G', '3B', '3C', '3J', '3F', '3D', '3E'],
  'BCDEFGHI': ['3C', '3G', '3B', '3D', '3H', '3F', '3E', '3I'],
  'AFGHIJKL': ['3H', '3J', '3I', '3F', '3A', '3G', '3L', '3K'],
  'AEGHIJKL': ['3E', '3J', '3I', '3A', '3H', '3G', '3L', '3K'],
  'AEFHIJKL': ['3E', '3J', '3I', '3F', '3A', '3H', '3L', '3K'],
  'AEFGIJKL': ['3E', '3J', '3I', '3F', '3A', '3G', '3L', '3K'],
  'AEFGHJKL': ['3E', '3G', '3J', '3F', '3A', '3H', '3L', '3K'],
  'AEFGHIKL': ['3E', '3G', '3I', '3F', '3A', '3H', '3L', '3K'],
  'AEFGHIJL': ['3E', '3G', '3J', '3F', '3A', '3H', '3L', '3I'],
  'AEFGHIJK': ['3E', '3G', '3J', '3F', '3A', '3H', '3I', '3K'],
  'ADGHIJKL': ['3H', '3J', '3I', '3D', '3A', '3G', '3L', '3K'],
  'ADFHIJKL': ['3H', '3J', '3I', '3D', '3A', '3F', '3L', '3K'],
  'ADFGIJKL': ['3I', '3G', '3J', '3D', '3A', '3F', '3L', '3K'],
  'ADFGHJKL': ['3H', '3G', '3J', '3D', '3A', '3F', '3L', '3K'],
  'ADFGHIKL': ['3H', '3G', '3I', '3D', '3A', '3F', '3L', '3K'],
  'ADFGHIJL': ['3H', '3G', '3J', '3D', '3A', '3F', '3L', '3I'],
  'ADFGHIJK': ['3H', '3G', '3J', '3D', '3A', '3F', '3I', '3K'],
  'ADEHIJKL': ['3E', '3J', '3I', '3D', '3A', '3H', '3L', '3K'],
  'ADEGIJKL': ['3E', '3J', '3I', '3D', '3A', '3G', '3L', '3K'],
  'ADEGHJKL': ['3E', '3G', '3J', '3D', '3A', '3H', '3L', '3K'],
  'ADEGHIKL': ['3E', '3G', '3I', '3D', '3A', '3H', '3L', '3K'],
  'ADEGHIJL': ['3E', '3G', '3J', '3D', '3A', '3H', '3L', '3I'],
  'ADEGHIJK': ['3E', '3G', '3J', '3D', '3A', '3H', '3I', '3K'],
  'ADEFIJKL': ['3E', '3J', '3I', '3D', '3A', '3F', '3L', '3K'],
  'ADEFHJKL': ['3H', '3J', '3E', '3D', '3A', '3F', '3L', '3K'],
  'ADEFHIKL': ['3H', '3E', '3I', '3D', '3A', '3F', '3L', '3K'],
  'ADEFHIJL': ['3H', '3J', '3E', '3D', '3A', '3F', '3L', '3I'],
  'ADEFHIJK': ['3H', '3J', '3E', '3D', '3A', '3F', '3I', '3K'],
  'ADEFGJKL': ['3E', '3G', '3J', '3D', '3A', '3F', '3L', '3K'],
  'ADEFGIKL': ['3E', '3G', '3I', '3D', '3A', '3F', '3L', '3K'],
  'ADEFGIJL': ['3E', '3G', '3J', '3D', '3A', '3F', '3L', '3I'],
  'ADEFGIJK': ['3E', '3G', '3J', '3D', '3A', '3F', '3I', '3K'],
  'ADEFGHKL': ['3H', '3G', '3E', '3D', '3A', '3F', '3L', '3K'],
  'ADEFGHJL': ['3H', '3G', '3J', '3D', '3A', '3F', '3L', '3E'],
  'ADEFGHJK': ['3H', '3G', '3J', '3D', '3A', '3F', '3E', '3K'],
  'ADEFGHIL': ['3H', '3G', '3E', '3D', '3A', '3F', '3L', '3I'],
  'ADEFGHIK': ['3H', '3G', '3E', '3D', '3A', '3F', '3I', '3K'],
  'ADEFGHIJ': ['3H', '3G', '3J', '3D', '3A', '3F', '3E', '3I'],
  'ACGHIJKL': ['3H', '3J', '3I', '3C', '3A', '3G', '3L', '3K'],
  'ACFHIJKL': ['3H', '3J', '3I', '3C', '3A', '3F', '3L', '3K'],
  'ACFGIJKL': ['3I', '3G', '3J', '3C', '3A', '3F', '3L', '3K'],
  'ACFGHJKL': ['3H', '3G', '3J', '3C', '3A', '3F', '3L', '3K'],
  'ACFGHIKL': ['3H', '3G', '3I', '3C', '3A', '3F', '3L', '3K'],
  'ACFGHIJL': ['3H', '3G', '3J', '3C', '3A', '3F', '3L', '3I'],
  'ACFGHIJK': ['3H', '3G', '3J', '3C', '3A', '3F', '3I', '3K'],
  'ACEHIJKL': ['3E', '3J', '3I', '3C', '3A', '3H', '3L', '3K'],
  'ACEGIJKL': ['3E', '3J', '3I', '3C', '3A', '3G', '3L', '3K'],
  'ACEGHJKL': ['3E', '3G', '3J', '3C', '3A', '3H', '3L', '3K'],
  'ACEGHIKL': ['3E', '3G', '3I', '3C', '3A', '3H', '3L', '3K'],
  'ACEGHIJL': ['3E', '3G', '3J', '3C', '3A', '3H', '3L', '3I'],
  'ACEGHIJK': ['3E', '3G', '3J', '3C', '3A', '3H', '3I', '3K'],
  'ACEFIJKL': ['3E', '3J', '3I', '3C', '3A', '3F', '3L', '3K'],
  'ACEFHJKL': ['3H', '3J', '3E', '3C', '3A', '3F', '3L', '3K'],
  'ACEFHIKL': ['3H', '3E', '3I', '3C', '3A', '3F', '3L', '3K'],
  'ACEFHIJL': ['3H', '3J', '3E', '3C', '3A', '3F', '3L', '3I'],
  'ACEFHIJK': ['3H', '3J', '3E', '3C', '3A', '3F', '3I', '3K'],
  'ACEFGJKL': ['3E', '3G', '3J', '3C', '3A', '3F', '3L', '3K'],
  'ACEFGIKL': ['3E', '3G', '3I', '3C', '3A', '3F', '3L', '3K'],
  'ACEFGIJL': ['3E', '3G', '3J', '3C', '3A', '3F', '3L', '3I'],
  'ACEFGIJK': ['3E', '3G', '3J', '3C', '3A', '3F', '3I', '3K'],
  'ACEFGHKL': ['3H', '3G', '3E', '3C', '3A', '3F', '3L', '3K'],
  'ACEFGHJL': ['3H', '3G', '3J', '3C', '3A', '3F', '3L', '3E'],
  'ACEFGHJK': ['3H', '3G', '3J', '3C', '3A', '3F', '3E', '3K'],
  'ACEFGHIL': ['3H', '3G', '3E', '3C', '3A', '3F', '3L', '3I'],
  'ACEFGHIK': ['3H', '3G', '3E', '3C', '3A', '3F', '3I', '3K'],
  'ACEFGHIJ': ['3H', '3G', '3J', '3C', '3A', '3F', '3E', '3I'],
  'ACDHIJKL': ['3H', '3J', '3I', '3C', '3A', '3D', '3L', '3K'],
  'ACDGIJKL': ['3I', '3G', '3J', '3C', '3A', '3D', '3L', '3K'],
  'ACDGHJKL': ['3H', '3G', '3J', '3C', '3A', '3D', '3L', '3K'],
  'ACDGHIKL': ['3H', '3G', '3I', '3C', '3A', '3D', '3L', '3K'],
  'ACDGHIJL': ['3H', '3G', '3J', '3C', '3A', '3D', '3L', '3I'],
  'ACDGHIJK': ['3H', '3G', '3J', '3C', '3A', '3D', '3I', '3K'],
  'ACDFIJKL': ['3C', '3J', '3I', '3D', '3A', '3F', '3L', '3K'],
  'ACDFHJKL': ['3H', '3J', '3F', '3C', '3A', '3D', '3L', '3K'],
  'ACDFHIKL': ['3H', '3F', '3I', '3C', '3A', '3D', '3L', '3K'],
  'ACDFHIJL': ['3H', '3J', '3F', '3C', '3A', '3D', '3L', '3I'],
  'ACDFHIJK': ['3H', '3J', '3F', '3C', '3A', '3D', '3I', '3K'],
  'ACDFGJKL': ['3C', '3G', '3J', '3D', '3A', '3F', '3L', '3K'],
  'ACDFGIKL': ['3C', '3G', '3I', '3D', '3A', '3F', '3L', '3K'],
  'ACDFGIJL': ['3C', '3G', '3J', '3D', '3A', '3F', '3L', '3I'],
  'ACDFGIJK': ['3C', '3G', '3J', '3D', '3A', '3F', '3I', '3K'],
  'ACDFGHKL': ['3H', '3G', '3F', '3C', '3A', '3D', '3L', '3K'],
  'ACDFGHJL': ['3C', '3G', '3J', '3D', '3A', '3F', '3L', '3H'],
  'ACDFGHJK': ['3H', '3G', '3J', '3C', '3A', '3F', '3D', '3K'],
  'ACDFGHIL': ['3H', '3G', '3F', '3C', '3A', '3D', '3L', '3I'],
  'ACDFGHIK': ['3H', '3G', '3F', '3C', '3A', '3D', '3I', '3K'],
  'ACDFGHIJ': ['3H', '3G', '3J', '3C', '3A', '3F', '3D', '3I'],
  'ACDEIJKL': ['3E', '3J', '3I', '3C', '3A', '3D', '3L', '3K'],
  'ACDEHJKL': ['3H', '3J', '3E', '3C', '3A', '3D', '3L', '3K'],
  'ACDEHIKL': ['3H', '3E', '3I', '3C', '3A', '3D', '3L', '3K'],
  'ACDEHIJL': ['3H', '3J', '3E', '3C', '3A', '3D', '3L', '3I'],
  'ACDEHIJK': ['3H', '3J', '3E', '3C', '3A', '3D', '3I', '3K'],
  'ACDEGJKL': ['3E', '3G', '3J', '3C', '3A', '3D', '3L', '3K'],
  'ACDEGIKL': ['3E', '3G', '3I', '3C', '3A', '3D', '3L', '3K'],
  'ACDEGIJL': ['3E', '3G', '3J', '3C', '3A', '3D', '3L', '3I'],
  'ACDEGIJK': ['3E', '3G', '3J', '3C', '3A', '3D', '3I', '3K'],
  'ACDEGHKL': ['3H', '3G', '3E', '3C', '3A', '3D', '3L', '3K'],
  'ACDEGHJL': ['3H', '3G', '3J', '3C', '3A', '3D', '3L', '3E'],
  'ACDEGHJK': ['3H', '3G', '3J', '3C', '3A', '3D', '3E', '3K'],
  'ACDEGHIL': ['3H', '3G', '3E', '3C', '3A', '3D', '3L', '3I'],
  'ACDEGHIK': ['3H', '3G', '3E', '3C', '3A', '3D', '3I', '3K'],
  'ACDEGHIJ': ['3H', '3G', '3J', '3C', '3A', '3D', '3E', '3I'],
  'ACDEFJKL': ['3C', '3J', '3E', '3D', '3A', '3F', '3L', '3K'],
  'ACDEFIKL': ['3C', '3E', '3I', '3D', '3A', '3F', '3L', '3K'],
  'ACDEFIJL': ['3C', '3J', '3E', '3D', '3A', '3F', '3L', '3I'],
  'ACDEFIJK': ['3C', '3J', '3E', '3D', '3A', '3F', '3I', '3K'],
  'ACDEFHKL': ['3H', '3E', '3F', '3C', '3A', '3D', '3L', '3K'],
  'ACDEFHJL': ['3H', '3J', '3F', '3C', '3A', '3D', '3L', '3E'],
  'ACDEFHJK': ['3H', '3J', '3E', '3C', '3A', '3F', '3D', '3K'],
  'ACDEFHIL': ['3H', '3E', '3F', '3C', '3A', '3D', '3L', '3I'],
  'ACDEFHIK': ['3H', '3E', '3F', '3C', '3A', '3D', '3I', '3K'],
  'ACDEFHIJ': ['3H', '3J', '3E', '3C', '3A', '3F', '3D', '3I'],
  'ACDEFGKL': ['3C', '3G', '3E', '3D', '3A', '3F', '3L', '3K'],
  'ACDEFGJL': ['3C', '3G', '3J', '3D', '3A', '3F', '3L', '3E'],
  'ACDEFGJK': ['3C', '3G', '3J', '3D', '3A', '3F', '3E', '3K'],
  'ACDEFGIL': ['3C', '3G', '3E', '3D', '3A', '3F', '3L', '3I'],
  'ACDEFGIK': ['3C', '3G', '3E', '3D', '3A', '3F', '3I', '3K'],
  'ACDEFGIJ': ['3C', '3G', '3J', '3D', '3A', '3F', '3E', '3I'],
  'ACDEFGHL': ['3H', '3G', '3F', '3C', '3A', '3D', '3L', '3E'],
  'ACDEFGHK': ['3H', '3G', '3E', '3C', '3A', '3F', '3D', '3K'],
  'ACDEFGHJ': ['3H', '3G', '3J', '3C', '3A', '3F', '3D', '3E'],
  'ACDEFGHI': ['3H', '3G', '3E', '3C', '3A', '3F', '3D', '3I'],
  'ABGHIJKL': ['3H', '3J', '3B', '3A', '3I', '3G', '3L', '3K'],
  'ABFHIJKL': ['3H', '3J', '3B', '3A', '3I', '3F', '3L', '3K'],
  'ABFGIJKL': ['3I', '3J', '3B', '3F', '3A', '3G', '3L', '3K'],
  'ABFGHJKL': ['3H', '3J', '3B', '3F', '3A', '3G', '3L', '3K'],
  'ABFGHIKL': ['3H', '3G', '3B', '3A', '3I', '3F', '3L', '3K'],
  'ABFGHIJL': ['3H', '3J', '3B', '3F', '3A', '3G', '3L', '3I'],
  'ABFGHIJK': ['3H', '3J', '3B', '3F', '3A', '3G', '3I', '3K'],
  'ABEHIJKL': ['3E', '3J', '3B', '3A', '3I', '3H', '3L', '3K'],
  'ABEGIJKL': ['3E', '3J', '3B', '3A', '3I', '3G', '3L', '3K'],
  'ABEGHJKL': ['3E', '3J', '3B', '3A', '3H', '3G', '3L', '3K'],
  'ABEGHIKL': ['3E', '3G', '3B', '3A', '3I', '3H', '3L', '3K'],
  'ABEGHIJL': ['3E', '3J', '3B', '3A', '3H', '3G', '3L', '3I'],
  'ABEGHIJK': ['3E', '3J', '3B', '3A', '3H', '3G', '3I', '3K'],
  'ABEFIJKL': ['3E', '3J', '3B', '3A', '3I', '3F', '3L', '3K'],
  'ABEFHJKL': ['3E', '3J', '3B', '3F', '3A', '3H', '3L', '3K'],
  'ABEFHIKL': ['3E', '3I', '3B', '3F', '3A', '3H', '3L', '3K'],
  'ABEFHIJL': ['3E', '3J', '3B', '3F', '3A', '3H', '3L', '3I'],
  'ABEFHIJK': ['3E', '3J', '3B', '3F', '3A', '3H', '3I', '3K'],
  'ABEFGJKL': ['3E', '3J', '3B', '3F', '3A', '3G', '3L', '3K'],
  'ABEFGIKL': ['3E', '3G', '3B', '3A', '3I', '3F', '3L', '3K'],
  'ABEFGIJL': ['3E', '3J', '3B', '3F', '3A', '3G', '3L', '3I'],
  'ABEFGIJK': ['3E', '3J', '3B', '3F', '3A', '3G', '3I', '3K'],
  'ABEFGHKL': ['3E', '3G', '3B', '3F', '3A', '3H', '3L', '3K'],
  'ABEFGHJL': ['3H', '3J', '3B', '3F', '3A', '3G', '3L', '3E'],
  'ABEFGHJK': ['3H', '3J', '3B', '3F', '3A', '3G', '3E', '3K'],
  'ABEFGHIL': ['3E', '3G', '3B', '3F', '3A', '3H', '3L', '3I'],
  'ABEFGHIK': ['3E', '3G', '3B', '3F', '3A', '3H', '3I', '3K'],
  'ABEFGHIJ': ['3H', '3J', '3B', '3F', '3A', '3G', '3E', '3I'],
  'ABDHIJKL': ['3I', '3J', '3B', '3D', '3A', '3H', '3L', '3K'],
  'ABDGIJKL': ['3I', '3J', '3B', '3D', '3A', '3G', '3L', '3K'],
  'ABDGHJKL': ['3H', '3J', '3B', '3D', '3A', '3G', '3L', '3K'],
  'ABDGHIKL': ['3I', '3G', '3B', '3D', '3A', '3H', '3L', '3K'],
  'ABDGHIJL': ['3H', '3J', '3B', '3D', '3A', '3G', '3L', '3I'],
  'ABDGHIJK': ['3H', '3J', '3B', '3D', '3A', '3G', '3I', '3K'],
  'ABDFIJKL': ['3I', '3J', '3B', '3D', '3A', '3F', '3L', '3K'],
  'ABDFHJKL': ['3H', '3J', '3B', '3D', '3A', '3F', '3L', '3K'],
  'ABDFHIKL': ['3H', '3I', '3B', '3D', '3A', '3F', '3L', '3K'],
  'ABDFHIJL': ['3H', '3J', '3B', '3D', '3A', '3F', '3L', '3I'],
  'ABDFHIJK': ['3H', '3J', '3B', '3D', '3A', '3F', '3I', '3K'],
  'ABDFGJKL': ['3F', '3J', '3B', '3D', '3A', '3G', '3L', '3K'],
  'ABDFGIKL': ['3I', '3G', '3B', '3D', '3A', '3F', '3L', '3K'],
  'ABDFGIJL': ['3F', '3J', '3B', '3D', '3A', '3G', '3L', '3I'],
  'ABDFGIJK': ['3F', '3J', '3B', '3D', '3A', '3G', '3I', '3K'],
  'ABDFGHKL': ['3H', '3G', '3B', '3D', '3A', '3F', '3L', '3K'],
  'ABDFGHJL': ['3H', '3G', '3B', '3D', '3A', '3F', '3L', '3J'],
  'ABDFGHJK': ['3H', '3G', '3B', '3D', '3A', '3F', '3J', '3K'],
  'ABDFGHIL': ['3H', '3G', '3B', '3D', '3A', '3F', '3L', '3I'],
  'ABDFGHIK': ['3H', '3G', '3B', '3D', '3A', '3F', '3I', '3K'],
  'ABDFGHIJ': ['3H', '3G', '3B', '3D', '3A', '3F', '3I', '3J'],
  'ABDEIJKL': ['3E', '3J', '3B', '3A', '3I', '3D', '3L', '3K'],
  'ABDEHJKL': ['3E', '3J', '3B', '3D', '3A', '3H', '3L', '3K'],
  'ABDEHIKL': ['3E', '3I', '3B', '3D', '3A', '3H', '3L', '3K'],
  'ABDEHIJL': ['3E', '3J', '3B', '3D', '3A', '3H', '3L', '3I'],
  'ABDEHIJK': ['3E', '3J', '3B', '3D', '3A', '3H', '3I', '3K'],
  'ABDEGJKL': ['3E', '3J', '3B', '3D', '3A', '3G', '3L', '3K'],
  'ABDEGIKL': ['3E', '3G', '3B', '3A', '3I', '3D', '3L', '3K'],
  'ABDEGIJL': ['3E', '3J', '3B', '3D', '3A', '3G', '3L', '3I'],
  'ABDEGIJK': ['3E', '3J', '3B', '3D', '3A', '3G', '3I', '3K'],
  'ABDEGHKL': ['3E', '3G', '3B', '3D', '3A', '3H', '3L', '3K'],
  'ABDEGHJL': ['3H', '3J', '3B', '3D', '3A', '3G', '3L', '3E'],
  'ABDEGHJK': ['3H', '3J', '3B', '3D', '3A', '3G', '3E', '3K'],
  'ABDEGHIL': ['3E', '3G', '3B', '3D', '3A', '3H', '3L', '3I'],
  'ABDEGHIK': ['3E', '3G', '3B', '3D', '3A', '3H', '3I', '3K'],
  'ABDEGHIJ': ['3H', '3J', '3B', '3D', '3A', '3G', '3E', '3I'],
  'ABDEFJKL': ['3E', '3J', '3B', '3D', '3A', '3F', '3L', '3K'],
  'ABDEFIKL': ['3E', '3I', '3B', '3D', '3A', '3F', '3L', '3K'],
  'ABDEFIJL': ['3E', '3J', '3B', '3D', '3A', '3F', '3L', '3I'],
  'ABDEFIJK': ['3E', '3J', '3B', '3D', '3A', '3F', '3I', '3K'],
  'ABDEFHKL': ['3H', '3E', '3B', '3D', '3A', '3F', '3L', '3K'],
  'ABDEFHJL': ['3H', '3J', '3B', '3D', '3A', '3F', '3L', '3E'],
  'ABDEFHJK': ['3H', '3J', '3B', '3D', '3A', '3F', '3E', '3K'],
  'ABDEFHIL': ['3H', '3E', '3B', '3D', '3A', '3F', '3L', '3I'],
  'ABDEFHIK': ['3H', '3E', '3B', '3D', '3A', '3F', '3I', '3K'],
  'ABDEFHIJ': ['3H', '3J', '3B', '3D', '3A', '3F', '3E', '3I'],
  'ABDEFGKL': ['3E', '3G', '3B', '3D', '3A', '3F', '3L', '3K'],
  'ABDEFGJL': ['3E', '3G', '3B', '3D', '3A', '3F', '3L', '3J'],
  'ABDEFGJK': ['3E', '3G', '3B', '3D', '3A', '3F', '3J', '3K'],
  'ABDEFGIL': ['3E', '3G', '3B', '3D', '3A', '3F', '3L', '3I'],
  'ABDEFGIK': ['3E', '3G', '3B', '3D', '3A', '3F', '3I', '3K'],
  'ABDEFGIJ': ['3E', '3G', '3B', '3D', '3A', '3F', '3I', '3J'],
  'ABDEFGHL': ['3H', '3G', '3B', '3D', '3A', '3F', '3L', '3E'],
  'ABDEFGHK': ['3H', '3G', '3B', '3D', '3A', '3F', '3E', '3K'],
  'ABDEFGHJ': ['3H', '3G', '3B', '3D', '3A', '3F', '3E', '3J'],
  'ABDEFGHI': ['3H', '3G', '3B', '3D', '3A', '3F', '3E', '3I'],
  'ABCHIJKL': ['3I', '3J', '3B', '3C', '3A', '3H', '3L', '3K'],
  'ABCGIJKL': ['3I', '3J', '3B', '3C', '3A', '3G', '3L', '3K'],
  'ABCGHJKL': ['3H', '3J', '3B', '3C', '3A', '3G', '3L', '3K'],
  'ABCGHIKL': ['3I', '3G', '3B', '3C', '3A', '3H', '3L', '3K'],
  'ABCGHIJL': ['3H', '3J', '3B', '3C', '3A', '3G', '3L', '3I'],
  'ABCGHIJK': ['3H', '3J', '3B', '3C', '3A', '3G', '3I', '3K'],
  'ABCFIJKL': ['3I', '3J', '3B', '3C', '3A', '3F', '3L', '3K'],
  'ABCFHJKL': ['3H', '3J', '3B', '3C', '3A', '3F', '3L', '3K'],
  'ABCFHIKL': ['3H', '3I', '3B', '3C', '3A', '3F', '3L', '3K'],
  'ABCFHIJL': ['3H', '3J', '3B', '3C', '3A', '3F', '3L', '3I'],
  'ABCFHIJK': ['3H', '3J', '3B', '3C', '3A', '3F', '3I', '3K'],
  'ABCFGJKL': ['3C', '3J', '3B', '3F', '3A', '3G', '3L', '3K'],
  'ABCFGIKL': ['3I', '3G', '3B', '3C', '3A', '3F', '3L', '3K'],
  'ABCFGIJL': ['3C', '3J', '3B', '3F', '3A', '3G', '3L', '3I'],
  'ABCFGIJK': ['3C', '3J', '3B', '3F', '3A', '3G', '3I', '3K'],
  'ABCFGHKL': ['3H', '3G', '3B', '3C', '3A', '3F', '3L', '3K'],
  'ABCFGHJL': ['3H', '3G', '3B', '3C', '3A', '3F', '3L', '3J'],
  'ABCFGHJK': ['3H', '3G', '3B', '3C', '3A', '3F', '3J', '3K'],
  'ABCFGHIL': ['3H', '3G', '3B', '3C', '3A', '3F', '3L', '3I'],
  'ABCFGHIK': ['3H', '3G', '3B', '3C', '3A', '3F', '3I', '3K'],
  'ABCFGHIJ': ['3H', '3G', '3B', '3C', '3A', '3F', '3I', '3J'],
  'ABCEIJKL': ['3E', '3J', '3B', '3A', '3I', '3C', '3L', '3K'],
  'ABCEHJKL': ['3E', '3J', '3B', '3C', '3A', '3H', '3L', '3K'],
  'ABCEHIKL': ['3E', '3I', '3B', '3C', '3A', '3H', '3L', '3K'],
  'ABCEHIJL': ['3E', '3J', '3B', '3C', '3A', '3H', '3L', '3I'],
  'ABCEHIJK': ['3E', '3J', '3B', '3C', '3A', '3H', '3I', '3K'],
  'ABCEGJKL': ['3E', '3J', '3B', '3C', '3A', '3G', '3L', '3K'],
  'ABCEGIKL': ['3E', '3G', '3B', '3A', '3I', '3C', '3L', '3K'],
  'ABCEGIJL': ['3E', '3J', '3B', '3C', '3A', '3G', '3L', '3I'],
  'ABCEGIJK': ['3E', '3J', '3B', '3C', '3A', '3G', '3I', '3K'],
  'ABCEGHKL': ['3E', '3G', '3B', '3C', '3A', '3H', '3L', '3K'],
  'ABCEGHJL': ['3H', '3J', '3B', '3C', '3A', '3G', '3L', '3E'],
  'ABCEGHJK': ['3H', '3J', '3B', '3C', '3A', '3G', '3E', '3K'],
  'ABCEGHIL': ['3E', '3G', '3B', '3C', '3A', '3H', '3L', '3I'],
  'ABCEGHIK': ['3E', '3G', '3B', '3C', '3A', '3H', '3I', '3K'],
  'ABCEGHIJ': ['3H', '3J', '3B', '3C', '3A', '3G', '3E', '3I'],
  'ABCEFJKL': ['3E', '3J', '3B', '3C', '3A', '3F', '3L', '3K'],
  'ABCEFIKL': ['3E', '3I', '3B', '3C', '3A', '3F', '3L', '3K'],
  'ABCEFIJL': ['3E', '3J', '3B', '3C', '3A', '3F', '3L', '3I'],
  'ABCEFIJK': ['3E', '3J', '3B', '3C', '3A', '3F', '3I', '3K'],
  'ABCEFHKL': ['3H', '3E', '3B', '3C', '3A', '3F', '3L', '3K'],
  'ABCEFHJL': ['3H', '3J', '3B', '3C', '3A', '3F', '3L', '3E'],
  'ABCEFHJK': ['3H', '3J', '3B', '3C', '3A', '3F', '3E', '3K'],
  'ABCEFHIL': ['3H', '3E', '3B', '3C', '3A', '3F', '3L', '3I'],
  'ABCEFHIK': ['3H', '3E', '3B', '3C', '3A', '3F', '3I', '3K'],
  'ABCEFHIJ': ['3H', '3J', '3B', '3C', '3A', '3F', '3E', '3I'],
  'ABCEFGKL': ['3E', '3G', '3B', '3C', '3A', '3F', '3L', '3K'],
  'ABCEFGJL': ['3E', '3G', '3B', '3C', '3A', '3F', '3L', '3J'],
  'ABCEFGJK': ['3E', '3G', '3B', '3C', '3A', '3F', '3J', '3K'],
  'ABCEFGIL': ['3E', '3G', '3B', '3C', '3A', '3F', '3L', '3I'],
  'ABCEFGIK': ['3E', '3G', '3B', '3C', '3A', '3F', '3I', '3K'],
  'ABCEFGIJ': ['3E', '3G', '3B', '3C', '3A', '3F', '3I', '3J'],
  'ABCEFGHL': ['3H', '3G', '3B', '3C', '3A', '3F', '3L', '3E'],
  'ABCEFGHK': ['3H', '3G', '3B', '3C', '3A', '3F', '3E', '3K'],
  'ABCEFGHJ': ['3H', '3G', '3B', '3C', '3A', '3F', '3E', '3J'],
  'ABCEFGHI': ['3H', '3G', '3B', '3C', '3A', '3F', '3E', '3I'],
  'ABCDIJKL': ['3I', '3J', '3B', '3C', '3A', '3D', '3L', '3K'],
  'ABCDHJKL': ['3H', '3J', '3B', '3C', '3A', '3D', '3L', '3K'],
  'ABCDHIKL': ['3H', '3I', '3B', '3C', '3A', '3D', '3L', '3K'],
  'ABCDHIJL': ['3H', '3J', '3B', '3C', '3A', '3D', '3L', '3I'],
  'ABCDHIJK': ['3H', '3J', '3B', '3C', '3A', '3D', '3I', '3K'],
  'ABCDGJKL': ['3C', '3J', '3B', '3D', '3A', '3G', '3L', '3K'],
  'ABCDGIKL': ['3I', '3G', '3B', '3C', '3A', '3D', '3L', '3K'],
  'ABCDGIJL': ['3C', '3J', '3B', '3D', '3A', '3G', '3L', '3I'],
  'ABCDGIJK': ['3C', '3J', '3B', '3D', '3A', '3G', '3I', '3K'],
  'ABCDGHKL': ['3H', '3G', '3B', '3C', '3A', '3D', '3L', '3K'],
  'ABCDGHJL': ['3H', '3G', '3B', '3C', '3A', '3D', '3L', '3J'],
  'ABCDGHJK': ['3H', '3G', '3B', '3C', '3A', '3D', '3J', '3K'],
  'ABCDGHIL': ['3H', '3G', '3B', '3C', '3A', '3D', '3L', '3I'],
  'ABCDGHIK': ['3H', '3G', '3B', '3C', '3A', '3D', '3I', '3K'],
  'ABCDGHIJ': ['3H', '3G', '3B', '3C', '3A', '3D', '3I', '3J'],
  'ABCDFJKL': ['3C', '3J', '3B', '3D', '3A', '3F', '3L', '3K'],
  'ABCDFIKL': ['3C', '3I', '3B', '3D', '3A', '3F', '3L', '3K'],
  'ABCDFIJL': ['3C', '3J', '3B', '3D', '3A', '3F', '3L', '3I'],
  'ABCDFIJK': ['3C', '3J', '3B', '3D', '3A', '3F', '3I', '3K'],
  'ABCDFHKL': ['3H', '3F', '3B', '3C', '3A', '3D', '3L', '3K'],
  'ABCDFHJL': ['3C', '3J', '3B', '3D', '3A', '3F', '3L', '3H'],
  'ABCDFHJK': ['3H', '3J', '3B', '3C', '3A', '3F', '3D', '3K'],
  'ABCDFHIL': ['3H', '3F', '3B', '3C', '3A', '3D', '3L', '3I'],
  'ABCDFHIK': ['3H', '3F', '3B', '3C', '3A', '3D', '3I', '3K'],
  'ABCDFHIJ': ['3H', '3J', '3B', '3C', '3A', '3F', '3D', '3I'],
  'ABCDFGKL': ['3C', '3G', '3B', '3D', '3A', '3F', '3L', '3K'],
  'ABCDFGJL': ['3C', '3G', '3B', '3D', '3A', '3F', '3L', '3J'],
  'ABCDFGJK': ['3C', '3G', '3B', '3D', '3A', '3F', '3J', '3K'],
  'ABCDFGIL': ['3C', '3G', '3B', '3D', '3A', '3F', '3L', '3I'],
  'ABCDFGIK': ['3C', '3G', '3B', '3D', '3A', '3F', '3I', '3K'],
  'ABCDFGIJ': ['3C', '3G', '3B', '3D', '3A', '3F', '3I', '3J'],
  'ABCDFGHL': ['3C', '3G', '3B', '3D', '3A', '3F', '3L', '3H'],
  'ABCDFGHK': ['3H', '3G', '3B', '3C', '3A', '3F', '3D', '3K'],
  'ABCDFGHJ': ['3H', '3G', '3B', '3C', '3A', '3F', '3D', '3J'],
  'ABCDFGHI': ['3H', '3G', '3B', '3C', '3A', '3F', '3D', '3I'],
  'ABCDEJKL': ['3E', '3J', '3B', '3C', '3A', '3D', '3L', '3K'],
  'ABCDEIKL': ['3E', '3I', '3B', '3C', '3A', '3D', '3L', '3K'],
  'ABCDEIJL': ['3E', '3J', '3B', '3C', '3A', '3D', '3L', '3I'],
  'ABCDEIJK': ['3E', '3J', '3B', '3C', '3A', '3D', '3I', '3K'],
  'ABCDEHKL': ['3H', '3E', '3B', '3C', '3A', '3D', '3L', '3K'],
  'ABCDEHJL': ['3H', '3J', '3B', '3C', '3A', '3D', '3L', '3E'],
  'ABCDEHJK': ['3H', '3J', '3B', '3C', '3A', '3D', '3E', '3K'],
  'ABCDEHIL': ['3H', '3E', '3B', '3C', '3A', '3D', '3L', '3I'],
  'ABCDEHIK': ['3H', '3E', '3B', '3C', '3A', '3D', '3I', '3K'],
  'ABCDEHIJ': ['3H', '3J', '3B', '3C', '3A', '3D', '3E', '3I'],
  'ABCDEGKL': ['3E', '3G', '3B', '3C', '3A', '3D', '3L', '3K'],
  'ABCDEGJL': ['3E', '3G', '3B', '3C', '3A', '3D', '3L', '3J'],
  'ABCDEGJK': ['3E', '3G', '3B', '3C', '3A', '3D', '3J', '3K'],
  'ABCDEGIL': ['3E', '3G', '3B', '3C', '3A', '3D', '3L', '3I'],
  'ABCDEGIK': ['3E', '3G', '3B', '3C', '3A', '3D', '3I', '3K'],
  'ABCDEGIJ': ['3E', '3G', '3B', '3C', '3A', '3D', '3I', '3J'],
  'ABCDEGHL': ['3H', '3G', '3B', '3C', '3A', '3D', '3L', '3E'],
  'ABCDEGHK': ['3H', '3G', '3B', '3C', '3A', '3D', '3E', '3K'],
  'ABCDEGHJ': ['3H', '3G', '3B', '3C', '3A', '3D', '3E', '3J'],
  'ABCDEGHI': ['3H', '3G', '3B', '3C', '3A', '3D', '3E', '3I'],
  'ABCDEFKL': ['3C', '3E', '3B', '3D', '3A', '3F', '3L', '3K'],
  'ABCDEFJL': ['3C', '3J', '3B', '3D', '3A', '3F', '3L', '3E'],
  'ABCDEFJK': ['3C', '3J', '3B', '3D', '3A', '3F', '3E', '3K'],
  'ABCDEFIL': ['3C', '3E', '3B', '3D', '3A', '3F', '3L', '3I'],
  'ABCDEFIK': ['3C', '3E', '3B', '3D', '3A', '3F', '3I', '3K'],
  'ABCDEFIJ': ['3C', '3J', '3B', '3D', '3A', '3F', '3E', '3I'],
  'ABCDEFHL': ['3H', '3F', '3B', '3C', '3A', '3D', '3L', '3E'],
  'ABCDEFHK': ['3H', '3E', '3B', '3C', '3A', '3F', '3D', '3K'],
  'ABCDEFHJ': ['3H', '3J', '3B', '3C', '3A', '3F', '3D', '3E'],
  'ABCDEFHI': ['3H', '3E', '3B', '3C', '3A', '3F', '3D', '3I'],
  'ABCDEFGL': ['3C', '3G', '3B', '3D', '3A', '3F', '3L', '3E'],
  'ABCDEFGK': ['3C', '3G', '3B', '3D', '3A', '3F', '3E', '3K'],
  'ABCDEFGJ': ['3C', '3G', '3B', '3D', '3A', '3F', '3E', '3J'],
  'ABCDEFGI': ['3C', '3G', '3B', '3D', '3A', '3F', '3E', '3I'],
  'ABCDEFGH': ['3H', '3G', '3B', '3C', '3A', '3F', '3D', '3E'],
}

// Mappar 3:e plats-slot-mönster → kolumnindex i TREDJEPLACERING_TABELL
// Kolumnordning: [1A(m79), 1B(m85), 1D(m81), 1E(m74), 1G(m82), 1I(m77), 1K(m87), 1L(m80)]
const SLOT_TILL_KOLUMN = {
  'A/B/C/D/F': 3, // 1E (match 74)
  'C/D/F/G/H': 5, // 1I (match 77)
  'C/E/F/H/I': 0, // 1A (match 79)
  'E/H/I/J/K': 7, // 1L (match 80)
  'B/E/F/I/J': 2, // 1D (match 81)
  'A/E/H/I/J': 4, // 1G (match 82)
  'E/F/G/I/J': 1, // 1B (match 85)
  'D/E/I/J/L': 6, // 1K (match 87)
}


// ── Google Sheets ─────────────────────────────────────────────────────────────
async function getSheets() {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS)
  const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] })
  return google.sheets({ version: 'v4', auth: await auth.getClient() })
}
async function getRows(sheets, range) {
  return (await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range })).data.values || []
}

// ── Beräkna stälning från en lista av {team1, team2, score:{ft:[g1,g2]}} ──────
function beräknaStällning(matcher) {
  const teams = {}
  // Steg 1: totala poäng/statistik
  for (const m of matcher) {
    const [g1, g2] = m.score.ft
    for (const [lag, egna, mot] of [[m.team1, g1, g2], [m.team2, g2, g1]]) {
      if (!teams[lag]) teams[lag] = { P: 0, GD: 0, GF: 0 }
      teams[lag].GF += egna; teams[lag].GD += egna - mot
      teams[lag].P += egna > mot ? 3 : egna === mot ? 1 : 0
    }
  }
  let ställning = Object.entries(teams).map(([namn, s]) => ({ namn, ...s }))

  // Steg 2: sortera på totala poäng
  ställning.sort((a, b) => b.P - a.P)

  // Steg 3: inbördes möten som tiebreaker för poänglika lag
  let i = 0
  while (i < ställning.length) {
    let j = i
    while (j < ställning.length && ställning[j].P === ställning[i].P) j++
    if (j - i > 1) {
      const bundna     = ställning.slice(i, j)
      const bundnaNamn = new Set(bundna.map(t => t.namn))
      const h2hMatcher = matcher.filter(m => bundnaNamn.has(m.team1) && bundnaNamn.has(m.team2))
      const h2h = Object.fromEntries(bundna.map(t => [t.namn, { P: 0, GD: 0, GF: 0 }]))
      for (const m of h2hMatcher) {
        const [g1, g2] = m.score.ft
        h2h[m.team1].GF += g1; h2h[m.team1].GD += g1 - g2
        h2h[m.team2].GF += g2; h2h[m.team2].GD += g2 - g1
        if (g1 > g2)      { h2h[m.team1].P += 3 }
        else if (g1 < g2) { h2h[m.team2].P += 3 }
        else              { h2h[m.team1].P++; h2h[m.team2].P++ }
      }
      bundna.sort((a, b) =>
        (h2h[b.namn].P  - h2h[a.namn].P)  ||
        (h2h[b.namn].GD - h2h[a.namn].GD) ||
        (h2h[b.namn].GF - h2h[a.namn].GF) ||
        (b.GD - a.GD) || (b.GF - a.GF) || a.namn.localeCompare(b.namn)
      )
      for (let k = 0; k < bundna.length; k++) ställning[i + k] = bundna[k]
    }
    i = j
  }
  return ställning
}

// ── Är positionen matematiskt bestämd? ───────────────────────────────────────
// Kandidaten vid `plats` är klar om ingen utmanare KAN komma upp i samma poäng
// (konservativt: vid lika poäng räknas det som oklart — GD-bedömning är komplex)
function erPositionKlar(ställning, speladeMatcher, plats) {
  if (plats >= ställning.length) return false
  const kandidat    = ställning[plats]
  const totalPerLag = ställning.length - 1          // 4-lagsgrupp → 3 matcher/lag
  const spelatPerLag = Object.fromEntries(ställning.map(t => [t.namn, 0]))
  for (const m of speladeMatcher) {
    if (spelatPerLag[m.team1] !== undefined) spelatPerLag[m.team1]++
    if (spelatPerLag[m.team2] !== undefined) spelatPerLag[m.team2]++
  }
  for (let i = plats + 1; i < ställning.length; i++) {
    const utmanare = ställning[i]
    const kvar     = totalPerLag - (spelatPerLag[utmanare.namn] || 0)
    if (kandidat.P > utmanare.P + 3 * kvar) continue   // kan inte nå upp

    // Utmanaren KAN nå lika poäng → kolla inbördes mötet
    const h2h = speladeMatcher.find((m) =>
      (m.team1 === kandidat.namn && m.team2 === utmanare.namn) ||
      (m.team1 === utmanare.namn && m.team2 === kandidat.namn),
    )
    if (!h2h) return false   // mötet inte spelat → oklart

    const [g1, g2] = h2h.score.ft
    const kandidatVann = (h2h.team1 === kandidat.namn && g1 > g2) ||
                         (h2h.team2 === kandidat.namn && g2 > g1)
    if (!kandidatVann) return false   // oavgjort eller förlust → oklart
    // kandidaten vann inbördes → utmanaren neutraliserad
  }
  return true
}

// ── Huvud ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${'='.repeat(65)}`)
  console.log(`  VM-Tipsen — knockout sync test  ${APPLY ? '⚠️  --apply: SKRIVER till Sheets' : '(dry-run)'}`)
  console.log(`${'='.repeat(65)}\n`)

  // ── 1. Hämta openfootball (bracketstruktur) ───────────────────────────────
  console.log('📡  Hämtar openfootball JSON...')
  const res = await fetch(OPENFOOTBALL_URL)
  if (!res.ok) { console.error(`❌  HTTP ${res.status}`); process.exit(1) }
  const data    = await res.json()
  const allaMatcher = data.matches || []
  console.log(`✅  ${allaMatcher.length} matcher i openfootball JSON\n`)

  // ── 2. Hämta Sheets-data ──────────────────────────────────────────────────
  console.log('📄  Läser Sheets-data...')
  const sheets = await getSheets()
  const [matcherRader, resultatRaderMedScores] = await Promise.all([
    getRows(sheets, 'Matcher!A2:H1000'),
    getRows(sheets, 'Resultat!A2:C1000'),   // A=match_id, B=hem, C=borta
  ])
  console.log(`✅  ${matcherRader.length} Matcher-rader, ${resultatRaderMedScores.length} Resultat-rader\n`)

  // ── 3. Beräkna gruppstälningar från Sheets-data ───────────────────────────
  const matchInfo = {}
  for (const rad of matcherRader) {
    const [match_id, , , hemmalag, bortalag, grupp] = rad
    if (!match_id || !grupp || !hemmalag || !bortalag) continue
    if (!grupp.startsWith('Group ') || grupp.length !== 7) continue
    matchInfo[match_id] = { hemmalag, bortalag, grp: grupp[6] }   // "Group A"[6] = "A"
  }

  const grupperMatcher = {}    // { 'A': [{team1,team2,score},...], ... }
  for (const res of resultatRaderMedScores) {
    const [match_id, g1Str, g2Str] = res
    if (!match_id) continue
    const g1 = parseInt(g1Str); const g2 = parseInt(g2Str)
    if (isNaN(g1) || isNaN(g2)) continue
    const info = matchInfo[match_id]
    if (!info) continue
    if (!grupperMatcher[info.grp]) grupperMatcher[info.grp] = []
    grupperMatcher[info.grp].push({ team1: info.hemmalag, team2: info.bortalag, score: { ft: [g1, g2] } })
  }

  const grupperStällning = {}
  const grupperHeltKlara = new Set()
  for (const [grp, matcher] of Object.entries(grupperMatcher)) {
    const ställning = beräknaStällning(matcher)
    grupperStällning[grp] = ställning
    const antalLag = ställning.length
    if (matcher.length >= antalLag * (antalLag - 1) / 2) grupperHeltKlara.add(grp)
  }

  // ── 4. Visa gruppstälningar ────────────────────────────────────────────────
  console.log('📊  Gruppstälningar (Sheets-data):')
  for (const grp of Object.keys(grupperStällning).sort()) {
    const s      = grupperStällning[grp]
    const spelade = grupperMatcher[grp] || []
    const klar   = grupperHeltKlara.has(grp)
    const e1     = erPositionKlar(s, spelade, 0)
    const e2     = erPositionKlar(s, spelade, 1)
    console.log(
      `  Grupp ${grp} ${klar ? '✅klar' : '⏳'  }:  ` +
      `1=${(s[0]?.namn || '?').padEnd(22)}${e1 ? '🔒' : '  '}  ` +
      `2=${(s[1]?.namn || '?').padEnd(22)}${e2 ? '🔒' : '  '}  ` +
      `3=${s[2]?.namn || '?'}`
    )
  }

  // ── 5. Rangordna bästa 3:or (topp 8 av 12 klara grupper) ─────────────────
  const tredjeLag = []
  for (const [grp, ställning] of Object.entries(grupperStällning)) {
    if (grupperHeltKlara.has(grp) && ställning.length >= 3) {
      tredjeLag.push({ grp, ...ställning[2] })
    }
  }
  tredjeLag.sort((a, b) => b.P - a.P || b.GD - a.GD || b.GF - a.GF || a.namn.localeCompare(b.namn))
  const kvalificerade3orGrupper = new Set(tredjeLag.slice(0, 8).map(t => t.grp))

  if (tredjeLag.length > 0) {
    console.log('\n🥉  Bästa 3:or (' + tredjeLag.length + ' klara grupper):')
    tredjeLag.forEach((t, i) => {
      const q = kvalificerade3orGrupper.has(t.grp)
      console.log(`  ${i + 1}. Grupp ${t.grp}: ${t.namn} (${t.P}p, GD ${t.GD >= 0 ? '+' : ''}${t.GD}) ${q ? '✅ vidare' : '❌ ute'}`)
    })
  }

  // ── 6. Lös lagkoder → riktiga lagnamn ─────────────────────────────────────
  const lös = (kod) => {
    if (!kod) return null
    const exakt = kod.match(/^([12])([A-L])$/)
    if (exakt) {
      const plats      = parseInt(exakt[1]) - 1
      const grp        = exakt[2]
      const ställning  = grupperStällning[grp]
      if (!ställning) return null
      const spelade    = grupperMatcher[grp] || []
      if (!erPositionKlar(ställning, spelade, plats)) return null
      const namn = ställning[plats]?.namn
      return namn ? (LAGNAMN_MAP[namn] || namn) : null
    }
    const tredjeMatch = kod.match(/^3([A-L](?:\/[A-L])*)$/)
    if (tredjeMatch) {
      // Kräver att ALLA 12 grupper är klara — annars kan okända grupper
      // producera bättre 3:or som ändrar vilka 8 som kvalificerar sig
      if (grupperHeltKlara.size < 12) return null
      const slotMönster = tredjeMatch[1]
      const kolIndex = SLOT_TILL_KOLUMN[slotMönster]
      if (kolIndex === undefined) return null
      const kvalNyckel = [...kvalificerade3orGrupper].sort().join('')
      const rad = TREDJEPLACERING_TABELL[kvalNyckel]
      if (!rad) return null
      const grp = rad[kolIndex][1]  // "3E" → "E"
      const namn = grupperStällning[grp]?.[2]?.namn
      return namn ? (LAGNAMN_MAP[namn] || namn) : null
    }
    return null
  }

  // ── 7. Beräknade fixtures ─────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(65))
  console.log('🔀  Beräknade knockout-fixtures:')

  const SLUTSPELS_OF = new Set(SLUTSPELS_OMGÅNGAR)
  const fixtures = []
  for (const m of allaMatcher) {
    if (!SLUTSPELS_OF.has(m.round) || !m.num) continue
    const hemmalag = lös(m.team1)
    const bortalag = lös(m.team2)
    const match_id = `match_${String(m.num).padStart(3, '0')}`
    const status   = hemmalag && bortalag ? '✅' : hemmalag || bortalag ? '⚡' : '❓'
    console.log(`  ${status}  ${match_id}  ${m.round.padEnd(15)} ${(hemmalag || m.team1).padEnd(24)} vs ${bortalag || m.team2}`)
    if (hemmalag || bortalag) fixtures.push({ match_id, hemmalag, bortalag })
  }
  console.log(`\n  ${fixtures.length} fixtures med BÅDA lagen kända\n`)

  // ── 8. Jämförelse mot Matcher-arket ──────────────────────────────────────
  const matcherMap = {}
  for (let i = 0; i < matcherRader.length; i++) {
    const r = matcherRader[i]
    if (r[0]) matcherMap[r[0]] = { idx: i, hemmalag: r[3] || '', bortalag: r[4] || '' }
  }

  // Platshållare = bracketkoder — aldrig riktiga lagnamn
  const ärPlaceholder = (n) => !n || /^[12][A-L]$/.test(n) || /^3[A-L]/.test(n) || /^[WL]\d+$/.test(n)

  const uppdateringar = []
  for (const fix of fixtures) {
    const befintlig = matcherMap[fix.match_id]
    if (!befintlig) { console.log(`  ⚠️  ${fix.match_id} saknas i Matcher-arket`); continue }

    const uppdateraH = fix.hemmalag && ärPlaceholder(befintlig.hemmalag) && befintlig.hemmalag !== fix.hemmalag
    const uppdateraB = fix.bortalag && ärPlaceholder(befintlig.bortalag) && befintlig.bortalag !== fix.bortalag

    if (!uppdateraH && !uppdateraB) {
      const visaH = fix.hemmalag || befintlig.hemmalag
      const visaB = fix.bortalag || befintlig.bortalag
      console.log(`  ✅  ${fix.match_id.padEnd(12)} redan korrekt: ${visaH} vs ${visaB}`)
    } else {
      const nyH = uppdateraH ? fix.hemmalag : (befintlig.hemmalag || '?')
      const nyB = uppdateraB ? fix.bortalag : (befintlig.bortalag || '?')
      console.log(`  🔄  ${fix.match_id.padEnd(12)} ÄNDRAS:`)
      console.log(`        nu  : "${befintlig.hemmalag}" vs "${befintlig.bortalag}"`)
      console.log(`        →   : "${nyH}" vs "${nyB}"`)
      uppdateringar.push({ rowNum: befintlig.idx + 2, match_id: fix.match_id, uppdateraH, uppdateraB, hemmalag: fix.hemmalag, bortalag: fix.bortalag })
    }
  }

  if (uppdateringar.length === 0) {
    console.log('\n  ✅  Inga uppdateringar behövs.')
  } else if (APPLY) {
    console.log(`\n  ✍️  Skriver ${uppdateringar.length} uppdateringar...`)
    for (const u of uppdateringar) {
      if (u.uppdateraH && u.uppdateraB) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SHEET_ID,
          range: `Matcher!D${u.rowNum}:E${u.rowNum}`,
          valueInputOption: 'RAW',
          requestBody: { values: [[u.hemmalag, u.bortalag]] },
        })
        console.log(`  ✅  ${u.match_id}: "${u.hemmalag}" vs "${u.bortalag}"`)
      } else if (u.uppdateraH) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SHEET_ID,
          range: `Matcher!D${u.rowNum}`,
          valueInputOption: 'RAW',
          requestBody: { values: [[u.hemmalag]] },
        })
        console.log(`  ✅  ${u.match_id}: hemmalag → "${u.hemmalag}" (bortalag väntar)`)
      } else {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SHEET_ID,
          range: `Matcher!E${u.rowNum}`,
          valueInputOption: 'RAW',
          requestBody: { values: [[u.bortalag]] },
        })
        console.log(`  ✅  ${u.match_id}: bortalag → "${u.bortalag}" (hemmalag väntar)`)
      }
    }
  } else {
    console.log(`\n  👆  Kör med --apply för att skriva ${uppdateringar.length} uppdateringar till Sheets.`)
  }

  // ── 9. Låsstatus per omgång ────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(65))
  console.log('🔐  Omgångslåsstatus:')
  const sparadeIds = new Set(resultatRaderMedScores.map(r => r[0]).filter(Boolean))
  console.log(`    ${sparadeIds.size} resultat i Resultat-arket\n`)

  for (const omgång of SLUTSPELS_OMGÅNGAR) {
    const omgångsMatcher = matcherRader.filter(r => r[6] === omgång)
    if (omgångsMatcher.length === 0) {
      console.log(`    ${omgång.padEnd(24)} — saknas i Matcher-arket`)
      continue
    }
    if (omgång === 'Round of 32') {
      console.log(`    ${omgång.padEnd(24)} ✅ öppnar när gruppspelet låsts  [${omgångsMatcher.length} matcher]`)
      continue
    }
    const föregående     = FÖREGÅENDE_OMGÅNG[omgång]
    const föregåendeIds  = new Set(matcherRader.filter(r => r[6] === föregående).map(r => r[0]))
    const harResultat    = [...sparadeIds].some(id => föregåendeIds.has(id))
    console.log(`    ${omgång.padEnd(24)} ${harResultat ? '✅ öppen' : '🔒 låst '}  (föregående: ${föregående})  [${omgångsMatcher.length} matcher]`)
  }

  console.log('\n' + '='.repeat(65) + '\n')
}

main().catch(err => { console.error(err); process.exit(1) })
