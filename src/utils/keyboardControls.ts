// Keyboard Control Mapping and Persistence Engine for Festival of Fighters Dojo Lab

export interface PlayerKeyboardBindings {
  // Directional Movement
  moveLeft: string;
  moveRight: string;
  jump: string;
  crouch: string;

  // Basic Attacks
  lightPunch: string;
  heavyPunch: string;
  lightKick: string;
  heavyKick: string;
  blowback: string;

  // Mobility & Defense
  roll: string;

  // Specials, Super Arts, & Battle Mechanics
  special1: string;
  special2: string;
  special3: string;
  superMove: string;
  maxMode: string;
  taunt: string;
}

export type ActionBindingKey = keyof PlayerKeyboardBindings;

export interface ActionMetadata {
  key: ActionBindingKey;
  label: string;
  category: 'movement' | 'normals' | 'specials' | 'utility';
  description: string;
  defaultKey: string;
  notation: string;
}

export const ACTION_METADATA_LIST: ActionMetadata[] = [
  // Movement
  {
    key: 'moveLeft',
    label: 'Move Left',
    category: 'movement',
    description: 'Walk backwards / Hold to Guard against high and mid attacks',
    defaultKey: 'a',
    notation: '← / 4',
  },
  {
    key: 'moveRight',
    label: 'Move Right',
    category: 'movement',
    description: 'Walk forward / Double tap to Dash',
    defaultKey: 'd',
    notation: '→ / 6',
  },
  {
    key: 'jump',
    label: 'Jump (Up)',
    category: 'movement',
    description: 'Jump neutral / Jump forward or backward with directional inputs',
    defaultKey: 'w',
    notation: '↑ / 8',
  },
  {
    key: 'crouch',
    label: 'Crouch (Down)',
    category: 'movement',
    description: 'Crouch low / Hold back-down for low guard',
    defaultKey: 's',
    notation: '↓ / 2',
  },

  // Normals
  {
    key: 'lightPunch',
    label: 'Light Punch (LP)',
    category: 'normals',
    description: 'Rapid jab / Quick startup frame, links into target combos',
    defaultKey: 'j',
    notation: 'LP / A',
  },
  {
    key: 'heavyPunch',
    label: 'Heavy Punch (HP)',
    category: 'normals',
    description: 'Fierce weapon strike / High damage, hit confirms into special moves',
    defaultKey: 'i',
    notation: 'HP / C',
  },
  {
    key: 'lightKick',
    label: 'Light Kick (LK)',
    category: 'normals',
    description: 'Fast low sweep / Pokes and safe hit advantage on block',
    defaultKey: 'k',
    notation: 'LK / B',
  },
  {
    key: 'heavyKick',
    label: 'Heavy Kick (HK)',
    category: 'normals',
    description: 'Crushing roundhouse / Long weapon range and anti-air utility',
    defaultKey: 'l',
    notation: 'HK / D',
  },
  {
    key: 'blowback',
    label: 'Blowback Attack (CD)',
    category: 'normals',
    description: 'Heavy knockback strike / Wall-bounce trigger with startup armor',
    defaultKey: 'e',
    notation: 'CD',
  },

  // Mobility
  {
    key: 'roll',
    label: 'Emergency Roll / Evade',
    category: 'movement',
    description: 'Invincible evasive roll past strikes and projectiles',
    defaultKey: ' ',
    notation: 'AB / Roll',
  },

  // Specials & Supers
  {
    key: 'special1',
    label: 'Special Move 1',
    category: 'specials',
    description: 'Signature martial art or projectile skill',
    defaultKey: '1',
    notation: 'SP 1',
  },
  {
    key: 'special2',
    label: 'Special Move 2',
    category: 'specials',
    description: 'Anti-air, weapon thrust, or armored rushdown',
    defaultKey: '2',
    notation: 'SP 2',
  },
  {
    key: 'special3',
    label: 'Special Move 3',
    category: 'specials',
    description: 'Command grab, dash strike, or overhead launcher',
    defaultKey: '3',
    notation: 'SP 3',
  },
  {
    key: 'superMove',
    label: 'Super Desperation Move',
    category: 'specials',
    description: 'Full-screen cinematic super art (Consumes 1-3 Super Stocks)',
    defaultKey: 'f',
    notation: 'SUPER',
  },
  {
    key: 'maxMode',
    label: 'MAX Mode Activation',
    category: 'specials',
    description: 'Enter MAX Mode for EX moves and unlimited special cancels',
    defaultKey: 'q',
    notation: 'MAX',
  },

  // Utility
  {
    key: 'taunt',
    label: 'Character Taunt',
    category: 'utility',
    description: 'Perform psychological taunt / Builds slight meter or psychological edge',
    defaultKey: 't',
    notation: 'TAUNT',
  },
];

export const DEFAULT_KEYBOARD_BINDINGS: PlayerKeyboardBindings = {
  moveLeft: 'a',
  moveRight: 'd',
  jump: 'w',
  crouch: 's',
  lightPunch: 'j',
  heavyPunch: 'i',
  lightKick: 'k',
  heavyKick: 'l',
  blowback: 'e',
  roll: ' ',
  special1: '1',
  special2: '2',
  special3: '3',
  superMove: 'f',
  maxMode: 'q',
  taunt: 't',
};

export const PRESET_LAYOUTS: Record<string, { name: string; description: string; bindings: PlayerKeyboardBindings }> = {
  classic: {
    name: 'Classic Arcade (WASD + J/K/I/L)',
    description: 'WASD for movement, J/I/K/L for arcade four-button cluster, E for Blowback, Space for Roll',
    bindings: { ...DEFAULT_KEYBOARD_BINDINGS },
  },
  sixButton: {
    name: 'Six-Button Fighter (WASD + U/I/O & J/K/L)',
    description: 'Top row punches (U/I/O), bottom row kicks (J/K/L), Space for Roll, H for Super',
    bindings: {
      moveLeft: 'a',
      moveRight: 'd',
      jump: 'w',
      crouch: 's',
      lightPunch: 'u',
      heavyPunch: 'i',
      lightKick: 'j',
      heavyKick: 'k',
      blowback: 'o',
      roll: 'l',
      special1: '1',
      special2: '2',
      special3: '3',
      superMove: 'h',
      maxMode: 'y',
      taunt: 't',
    },
  },
  arrowsNumpad: {
    name: 'Arrows + Numpad (Right-Hand Fighters)',
    description: 'Arrow keys for movement, Numpad 4/5/1/2 for attacks, Numpad 0 for Roll, Numpad + for Super',
    bindings: {
      moveLeft: 'arrowleft',
      moveRight: 'arrowright',
      jump: 'arrowup',
      crouch: 'arrowdown',
      lightPunch: '4',
      heavyPunch: '5',
      lightKick: '1',
      heavyKick: '2',
      blowback: '6',
      roll: '0',
      special1: '7',
      special2: '8',
      special3: '9',
      superMove: '+',
      maxMode: '.',
      taunt: '/',
    },
  },
  zxcvCompact: {
    name: 'ZXCV Compact (WASD + Z/X/C/V)',
    description: 'Low-profile home row typing position: Z/X for punches, C/V for kicks, B for Blowback',
    bindings: {
      moveLeft: 'a',
      moveRight: 'd',
      jump: 'w',
      crouch: 's',
      lightPunch: 'z',
      heavyPunch: 'x',
      lightKick: 'c',
      heavyKick: 'v',
      blowback: 'b',
      roll: ' ',
      special1: '1',
      special2: '2',
      special3: '3',
      superMove: 'f',
      maxMode: 'r',
      taunt: 't',
    },
  },
};

const STORAGE_KEY = 'fof_keyboard_bindings';

/**
 * Retrieves the current player keyboard bindings from localStorage or returns defaults.
 */
export function getKeyboardBindings(): PlayerKeyboardBindings {
  if (typeof window === 'undefined') return { ...DEFAULT_KEYBOARD_BINDINGS };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_KEYBOARD_BINDINGS };

    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_KEYBOARD_BINDINGS,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_KEYBOARD_BINDINGS };
  }
}

/**
 * Saves customized player keyboard bindings to localStorage and dispatches a synchronization event.
 */
export function saveKeyboardBindings(bindings: PlayerKeyboardBindings): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
    window.dispatchEvent(new CustomEvent('fof-controls-updated', { detail: bindings }));
  } catch {
    // ignore
  }
}

/**
 * Resets bindings back to the factory defaults.
 */
export function resetKeyboardBindings(): PlayerKeyboardBindings {
  const defaults = { ...DEFAULT_KEYBOARD_BINDINGS };
  saveKeyboardBindings(defaults);
  return defaults;
}

/**
 * Formats a key name for clear, friendly display in the user interface.
 */
export function formatKeyLabel(key: string): string {
  if (!key) return 'UNBOUND';
  const lower = key.toLowerCase();

  switch (lower) {
    case ' ':
    case 'space':
      return 'SPACE';
    case 'arrowup':
      return '↑ UP';
    case 'arrowdown':
      return '↓ DOWN';
    case 'arrowleft':
      return '← LEFT';
    case 'arrowright':
      return '→ RIGHT';
    case 'enter':
      return 'ENTER';
    case 'escape':
      return 'ESC';
    case 'backspace':
      return 'BKSP';
    case 'tab':
      return 'TAB';
    case 'shift':
      return 'SHIFT';
    case 'control':
      return 'CTRL';
    case 'alt':
      return 'ALT';
    case ';':
      return 'SEMICOLON (;)';
    case ',':
      return 'COMMA (,)';
    case '.':
      return 'PERIOD (.)';
    case '/':
      return 'SLASH (/)';
    case '\\':
      return 'BACKSLASH (\\)';
    case '[':
      return 'L-BRACKET ([)';
    case ']':
      return 'R-BRACKET (])';
    case '-':
      return 'MINUS (-)';
    case '=':
      return 'EQUAL (=)';
    default:
      return key.toUpperCase();
  }
}

/**
 * Checks if a given KeyboardEvent matches the target binding key.
 */
export function matchesBinding(e: KeyboardEvent, targetKey: string): boolean {
  if (!targetKey) return false;
  const eventKey = e.key.toLowerCase();
  const targetLower = targetKey.toLowerCase();

  // Space special cases
  if ((eventKey === ' ' || e.code === 'Space') && (targetLower === ' ' || targetLower === 'space')) {
    return true;
  }

  // Exact key match
  if (eventKey === targetLower) return true;

  // Code match (e.g. KeyA -> a, Digit1 -> 1)
  if (e.code.toLowerCase() === targetLower) return true;

  return false;
}
