import { normalizeCharacterId, resolveCharacterAsset, withCacheBust } from '../utils/characterAssetLoader';

/**
 * Character Avatars & Portraits for Fate of Fighters (FOF)
 * Generates high-fidelity themed vector portraits for all fighters
 * ensuring that every character has a distinct, beautiful visual identity.
 */

// Generate stylized SVG portrait with elemental accents and character silhouette
function createFighterSvgPortrait(
  name: string,
  elementColor: string,
  accentColor: string,
  hairColor: string,
  skinColor: string,
  outfitColor: string,
  symbol: string
): string {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.75" />
      <stop offset="60%" stop-color="${elementColor}" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#0a0a0f" stop-opacity="1" />
    </radialGradient>
    <linearGradient id="armorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${accentColor}" />
      <stop offset="100%" stop-color="${outfitColor}" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background Canvas -->
  <rect width="256" height="256" fill="url(#bgGlow)" />
  
  <!-- Geometric Frame Lines -->
  <circle cx="128" cy="128" r="118" fill="none" stroke="${accentColor}" stroke-width="2" opacity="0.4" />
  <polygon points="128,14 242,128 128,242 14,128" fill="none" stroke="${accentColor}" stroke-width="1.5" opacity="0.3" />

  <!-- Shoulder / Torso Armor -->
  <path d="M48 256 C50 190 85 165 128 165 C171 165 206 190 208 256 Z" fill="url(#armorGrad)" />
  <!-- Chest Emblem / Collar Accent -->
  <path d="M100 168 L128 198 L156 168 L128 175 Z" fill="${accentColor}" filter="url(#glow)" opacity="0.9" />

  <!-- Neck -->
  <rect x="114" y="132" width="28" height="38" rx="6" fill="${skinColor}" />

  <!-- Head Base -->
  <ellipse cx="128" cy="105" rx="36" ry="44" fill="${skinColor}" />

  <!-- Eyes & Eyebrows -->
  <ellipse cx="112" cy="102" rx="5" ry="3" fill="#18181b" />
  <ellipse cx="144" cy="102" rx="5" ry="3" fill="#18181b" />
  <circle cx="113" cy="101" r="1.5" fill="#ffffff" />
  <circle cx="145" cy="101" r="1.5" fill="#ffffff" />
  <!-- Sharp Eyebrows -->
  <path d="M102 94 Q114 90 122 96" stroke="#18181b" stroke-width="2.5" fill="none" stroke-linecap="round" />
  <path d="M154 94 Q142 90 134 96" stroke="#18181b" stroke-width="2.5" fill="none" stroke-linecap="round" />

  <!-- Nose & Chin Accent -->
  <path d="M128 102 L124 116 L128 117" stroke="#000000" stroke-width="1.5" opacity="0.35" fill="none" stroke-linecap="round" />
  <path d="M120 126 Q128 130 136 126" stroke="#18181b" stroke-width="2" fill="none" stroke-linecap="round" />

  <!-- Stylized Hair & Headgear -->
  <path d="M84 98 C82 56 100 40 128 40 C162 40 174 60 172 98 C160 82 144 80 128 84 C112 80 96 82 84 98 Z" fill="${hairColor}" />
  <path d="M88 88 L128 55 L168 88 L148 70 L128 60 L108 70 Z" fill="${hairColor}" opacity="0.8" />

  <!-- Elemental Aura Crest / Symbol at Bottom Right -->
  <g transform="translate(186, 186)" filter="url(#glow)">
    <circle cx="24" cy="24" r="22" fill="#000000" fill-opacity="0.8" stroke="${accentColor}" stroke-width="2" />
    <text x="24" y="32" font-family="system-ui, sans-serif" font-weight="900" font-size="20" fill="${accentColor}" text-anchor="middle">
      ${symbol}
    </text>
  </g>

  <!-- High-Tech Neon Border Outline -->
  <rect x="3" y="3" width="250" height="250" rx="20" fill="none" stroke="${accentColor}" stroke-width="3" opacity="0.75" />
</svg>
`.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Built-in high resolution avatars & portraits for all fighters
export const FIGHTER_BUILTIN_AVATARS: Record<string, string> = {
  arjun: resolveCharacterAsset('arjun', 'portrait'),
  steele: resolveCharacterAsset('steele', 'portrait'),
  meghananda: resolveCharacterAsset('meghananda', 'portrait'),
  valeria: resolveCharacterAsset('valeria', 'portrait'),
  maya: resolveCharacterAsset('maya', 'portrait'),
  david: resolveCharacterAsset('david', 'portrait'),
  elena: resolveCharacterAsset('elena', 'portrait'),
  leo: resolveCharacterAsset('leo', 'portrait'),
  rafe: resolveCharacterAsset('rafe', 'portrait'),
  amara: resolveCharacterAsset('amara', 'portrait'),
  kai: resolveCharacterAsset('kai', 'portrait'),
  alexandra: createFighterSvgPortrait('Alexandra', '#831843', '#f472b6', '#db2777', '#fdf2f8', '#500724', '⚜'),
  luna: resolveCharacterAsset('luna', 'portrait'),
  victor: resolveCharacterAsset('victor', 'portrait'),
  victor_overlord: resolveCharacterAsset('victor', 'portrait'),
};

/**
 * Resolve the best available character image URL:
 * 1. Explicit custom user image (URL or uploaded base64 data)
 * 2. Character's defined customImageUrl or avatarUrl
 * 3. High quality standardized / direct avatar image with cache-busting
 */
export function getFighterPortrait(fighter?: {
  id?: string;
  avatarUrl?: string;
  customImageUrl?: string;
}): string {
  if (!fighter) return resolveCharacterAsset('arjun', 'portrait');

  // Dynamically bind to active combatant ID
  if (fighter.id) {
    const norm = normalizeCharacterId(fighter.id);
    const customUrl = (fighter.customImageUrl && !fighter.customImageUrl.endsWith('.svg'))
      ? fighter.customImageUrl
      : (fighter.avatarUrl && !fighter.avatarUrl.endsWith('.svg'))
        ? fighter.avatarUrl
        : undefined;
    return resolveCharacterAsset(norm, 'portrait', customUrl);
  }

  const candidate = (fighter.customImageUrl && !fighter.customImageUrl.endsWith('.svg'))
    ? fighter.customImageUrl
    : (fighter.avatarUrl && !fighter.avatarUrl.endsWith('.svg'))
      ? fighter.avatarUrl
      : undefined;

  if (candidate && candidate.trim().length > 0) {
    return withCacheBust(candidate);
  }
  return resolveCharacterAsset('arjun', 'portrait');
}
