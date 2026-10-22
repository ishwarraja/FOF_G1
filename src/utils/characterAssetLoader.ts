/**
 * Character Asset Resolution & Dynamic Cache-Busting Loader
 * 
 * Standardized Directory Structure:
 * public/assets/characters/[character_id]/
 *   ├── portrait.jpeg / portrait.png     (Used for Character Select & Top Combat HUD Lifebars)
 *   ├── icon.jpeg / icon.png             (Square mini-icon for roster picker)
 *   └── spritesheet.jpeg / spritesheet.png (Action frames / PaperZD texture atlas)
 * 
 * Legacy / Direct Directory Structure (supported as fallback):
 * public/characters/[character_id].jpg
 * public/characters/General_Jonas_Steele_01.jpeg
 * public/characters/Meghananda_01.jpeg
 */

// Bump version or timestamp to instantly bust browser cache for new uploads
export const ASSET_VERSION = '2026.10.13.1';

// Direct file mappings for known custom character images in public/characters/
const KNOWN_DIRECT_CHARACTER_FILES: Record<string, { portrait: string; icon?: string; spritesheet?: string }> = {
  arjun: {
    portrait: '/characters/icon/Arjun.png',
    icon: '/characters/icon/Arjun.png',
    spritesheet: '/characters/arjun_battle.jpg',
  },
  steele: {
    portrait: '/characters/icon/Jonas.png',
    icon: '/characters/icon/Jonas.png',
    spritesheet: '/characters/General_Jonas_Steele_01.jpeg',
  },
  elena: {
    portrait: '/characters/icon/Elena.png',
    icon: '/characters/icon/Elena.png',
    spritesheet: '/assets/characters/elena/texture_albedo.svg',
  },
  david: {
    portrait: '/characters/icon/David.png',
    icon: '/characters/icon/David.png',
    spritesheet: '/assets/characters/david/texture_albedo.svg',
  },
  maya: {
    portrait: '/characters/icon/Maya.png',
    icon: '/characters/icon/Maya.png',
    spritesheet: '/assets/characters/maya/texture_albedo.svg',
  },
  amara: {
    portrait: '/characters/icon/Amara.png',
    icon: '/characters/icon/Amara.png',
  },
  kai: {
    portrait: '/characters/icon/Kai.png',
    icon: '/characters/icon/Kai.png',
  },
  leo: {
    portrait: '/characters/icon/Leo.png',
    icon: '/characters/icon/Leo.png',
  },
  luna: {
    portrait: '/characters/icon/Luna.png',
    icon: '/characters/icon/Luna.png',
  },
  rafe: {
    portrait: '/characters/icon/Rafe.png',
    icon: '/characters/icon/Rafe.png',
  },
  victor: {
    portrait: '/characters/icon/Victor.png',
    icon: '/characters/icon/Victor.png',
  },
  meghananda: {
    portrait: '/characters/Meghananda_01.jpeg',
    icon: '/characters/Meghananda_02.jpeg',
    spritesheet: '/characters/Meghananda_01.jpeg',
  },
};

/**
 * Mapping of character IDs to their dedicated icon file in public/characters/icon/
 */
export const CHARACTER_ICONS: Record<string, string> = {
  alexandra: '/characters/icon/Alexandra.png',
  amara: '/characters/icon/Amara.png',
  arjun: '/characters/icon/Arjun.png',
  david: '/characters/icon/David.png',
  elena: '/characters/icon/Elena.png',
  steele: '/characters/icon/Jonas.png',
  jonas: '/characters/icon/Jonas.png',
  kai: '/characters/icon/Kai.png',
  leo: '/characters/icon/Leo.png',
  luna: '/characters/icon/Luna.png',
  maya: '/characters/icon/Maya.png',
  rafe: '/characters/icon/Rafe.png',
  valeria: '/assets/characters/valeria/portrait.png',
  victor: '/characters/icon/Victor.png',
  meghananda: '/assets/characters/meghananda/portrait.png',
};

/**
 * Normalizes character ID to handle variations (e.g. 'General Jonas Steele' -> 'steele')
 */
export function normalizeCharacterId(idOrName?: string): string {
  if (!idOrName) return 'arjun';
  const lower = idOrName.toLowerCase().trim();
  if (lower.includes('steele') || lower.includes('jonas')) return 'steele';
  if (lower.includes('meghananda') || lower.includes('indrajit')) return 'meghananda';
  if (lower.includes('arjun') || lower.includes('rao')) return 'arjun';
  if (lower.includes('elena')) return 'elena';
  if (lower.includes('david')) return 'david';
  if (lower.includes('maya')) return 'maya';
  if (lower.includes('leo')) return 'leo';
  if (lower.includes('rafe')) return 'rafe';
  if (lower.includes('amara')) return 'amara';
  if (lower.includes('kai')) return 'kai';
  if (lower.includes('alexandra')) return 'alexandra';
  if (lower.includes('luna')) return 'luna';
  if (lower.includes('valeria')) return 'valeria';
  if (lower.includes('victor')) return 'victor';
  return lower.replace(/[^a-z0-9_]/g, '');
}

/**
 * Appends cache-busting query parameter to an asset path
 */
export function withCacheBust(url: string, version: string = ASSET_VERSION): string {
  if (!url) return url;
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${version}`;
}

/**
 * Resolves the absolute URL for a character asset with automatic fallback & cache busting.
 */
export function resolveCharacterAsset(
  characterId: string,
  assetType: 'portrait' | 'icon' | 'spritesheet' = 'portrait',
  customUrl?: string
): string {
  // 1. If explicit valid data URI or external URL provided, use it directly
  if (customUrl && (customUrl.startsWith('data:') || customUrl.startsWith('http'))) {
    return customUrl;
  }

  const normalizedId = normalizeCharacterId(characterId);

  // 2. Dedicated character icons in public/characters/icon/ take top precedence for portraits/icons
  if ((assetType === 'icon' || assetType === 'portrait') && CHARACTER_ICONS[normalizedId]) {
    // If a customUrl was provided that is a real non-svg image, allow it; ignore legacy placeholder SVGs
    if (customUrl && customUrl.trim().length > 0 && !customUrl.endsWith('.svg')) {
      return withCacheBust(customUrl);
    }
    return withCacheBust(CHARACTER_ICONS[normalizedId]);
  }

  // 3. Known custom image mappings in standardized directory
  const KNOWN_PORTRAITS: Record<string, string> = {
    arjun: '/characters/icon/Arjun.png',
    steele: '/characters/icon/Jonas.png',
    meghananda: '/assets/characters/meghananda/portrait.png',
    valeria: '/assets/characters/valeria/portrait.png',
    elena: '/characters/icon/Elena.png',
    david: '/characters/icon/David.png',
    maya: '/characters/icon/Maya.png',
    victor: '/characters/icon/Victor.png',
  };

  if (assetType === 'portrait' && KNOWN_PORTRAITS[normalizedId]) {
    return withCacheBust(KNOWN_PORTRAITS[normalizedId]);
  }

  // 4. Custom URL provided as an explicit path (if not a legacy svg)
  if (customUrl && customUrl.trim().length > 0 && !customUrl.endsWith('.svg')) {
    return withCacheBust(customUrl);
  }

  // 5. Direct file mappings fallback
  if (KNOWN_DIRECT_CHARACTER_FILES[normalizedId]) {
    const map = KNOWN_DIRECT_CHARACTER_FILES[normalizedId];
    const target = map[assetType] || map.portrait;
    return withCacheBust(target);
  }

  // 6. Standardized directory pattern: /assets/characters/[id]/[assetType].png
  return withCacheBust(`/assets/characters/${normalizedId}/${assetType}.png`);
}
