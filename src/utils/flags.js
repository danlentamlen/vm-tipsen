// Country flag emoji lookup — covers all 48 WC 2026 nations + common variants
const FLAGS = {
  // A
  'Argentina': '🇦🇷', 'Australia': '🇦🇺', 'Austria': '🇦🇹',
  // B
  'Belgium': '🇧🇪', 'Bolivia': '🇧🇴', 'Bosnia & Herzegovina': '🇧🇦',
  'Bosnia and Herzegovina': '🇧🇦', 'Brazil': '🇧🇷',
  // C
  'Cameroon': '🇨🇲', 'Canada': '🇨🇦', 'Chile': '🇨🇱', 'China': '🇨🇳',
  'Colombia': '🇨🇴', 'Costa Rica': '🇨🇷', 'Croatia': '🇭🇷',
  'Czech Republic': '🇨🇿', 'Czechia': '🇨🇿',
  // D
  'Denmark': '🇩🇰',
  // E
  'Ecuador': '🇪🇨', 'Egypt': '🇪🇬', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  // F
  'France': '🇫🇷',
  // G
  'Germany': '🇩🇪', 'Ghana': '🇬🇭', 'Greece': '🇬🇷',
  // H
  'Honduras': '🇭🇳', 'Hungary': '🇭🇺',
  // I
  'Indonesia': '🇮🇩', 'Iran': '🇮🇷', 'Iraq': '🇮🇶',
  // J
  'Japan': '🇯🇵',
  // K
  'Kenya': '🇰🇪',
  // M
  'Mexico': '🇲🇽', 'Morocco': '🇲🇦',
  // N
  'Netherlands': '🇳🇱', 'New Zealand': '🇳🇿', 'Nigeria': '🇳🇬',
  'North Korea': '🇰🇵',
  // P
  'Panama': '🇵🇦', 'Paraguay': '🇵🇾', 'Peru': '🇵🇪',
  'Poland': '🇵🇱', 'Portugal': '🇵🇹',
  // Q
  'Qatar': '🇶🇦',
  // R
  'Romania': '🇷🇴',
  // S
  'Saudi Arabia': '🇸🇦', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Senegal': '🇸🇳',
  'Serbia': '🇷🇸', 'Slovakia': '🇸🇰', 'Slovenia': '🇸🇮',
  'South Africa': '🇿🇦', 'South Korea': '🇰🇷', 'Spain': '🇪🇸',
  'Sweden': '🇸🇪', 'Sverige': '🇸🇪', 'Switzerland': '🇨🇭',
  // T
  'Togo': '🇹🇬', 'Tunisia': '🇹🇳', 'Turkey': '🇹🇷',
  // U
  'Ukraine': '🇺🇦', 'Uruguay': '🇺🇾', 'USA': '🇺🇸',
  'United States': '🇺🇸', 'United States of America': '🇺🇸',
  // V
  'Venezuela': '🇻🇪',
  // W
  'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
}

export function getFlag(lagnamn) {
  if (!lagnamn) return ''
  return FLAGS[lagnamn] || ''
}