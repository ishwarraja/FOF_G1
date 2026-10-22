import { Equipment, Rune } from '../types/game';

export interface CraftableRecipe {
  id: string;
  name: string;
  type: 'equipment' | 'rune';
  resultItem: Equipment | Rune;
  requiredMaterials: { materialId: string; count: number }[];
  goldCost: number;
}

export const FORGE_MATERIALS: Record<string, { name: string; icon: string; description: string; rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' }> = {
  pyros_ember: {
    name: 'Pyros Magma Core',
    icon: 'Flame',
    description: 'A glowing volcanic crystal harvested from the heart of Mount Pyros.',
    rarity: 'Epic',
  },
  glacial_shard: {
    name: 'Boreas Runic Ice',
    icon: 'Snowflake',
    description: 'Unmelting frost rune formed in zero-kelvin glacial fissures.',
    rarity: 'Epic',
  },
  tempest_feather: {
    name: 'Gale Aeroroc Plume',
    icon: 'Feather',
    description: 'Aerodynamic feather shimmering with high-velocity wind currents.',
    rarity: 'Rare',
  },
  sunstone_crystal: {
    name: 'Sunstone Solar Crystal',
    icon: 'Sun',
    description: 'Sacred solar shard pulsing with gentle healing radiance.',
    rarity: 'Epic',
  },
  void_matter: {
    name: 'Void Singularity Dust',
    icon: 'Sparkles',
    description: 'Condensed antimatter residue from slain rift fiends.',
    rarity: 'Legendary',
  },
  tectonic_slate: {
    name: 'Obsidian Tectonic Slate',
    icon: 'Mountain',
    description: 'Ultra-dense plate extracted from continental fault lines.',
    rarity: 'Rare',
  },
};

export const INITIAL_EQUIPMENT_LIST: Equipment[] = [
  {
    id: 'draconic_flame_helm',
    name: 'Dragon Flame Helmet',
    slot: 'armor',
    level: 1,
    maxLevel: 20,
    element: 'Fire',
    stats: { hp: 380, def: 35 },
    rarity: 'Epic',
    description: 'Forged with dragon scales, granting immense protection against scorching heat.',
  },
  {
    id: 'glacial_frost_plate',
    name: 'Glacial Permafrost Cuirass',
    slot: 'armor',
    level: 1,
    maxLevel: 20,
    element: 'Ice',
    stats: { hp: 550, def: 55 },
    rarity: 'Legendary',
    description: 'Crystalline armor forged with Boreas Runic Ice. Freezes glancing projectiles.',
  },
  {
    id: 'zephyr_wind_ring',
    name: 'Tempest Gale Ring',
    slot: 'accessory',
    level: 1,
    maxLevel: 20,
    element: 'Wind',
    stats: { spd: 18, critRate: 12 },
    rarity: 'Epic',
    description: 'Accelerates the wearer’s reflexes to ultrasonic speeds.',
  },
  {
    id: 'sunstone_amulet',
    name: 'Solstice Sunstone Amulet',
    slot: 'accessory',
    level: 1,
    maxLevel: 20,
    element: 'Light',
    stats: { hp: 420, atk: 25 },
    rarity: 'Legendary',
    description: 'Radiates purifying daylight that mends wounds over time.',
  },
  {
    id: 'void_pendant',
    name: 'Abyssal Void Pendant',
    slot: 'accessory',
    level: 1,
    maxLevel: 20,
    element: 'Dark',
    stats: { atk: 45, critDmg: 25 },
    rarity: 'Epic',
    description: 'Infuses offensive spells with dark matter.',
  },
  {
    id: 'tectonic_plate_greaves',
    name: 'Tectonic Obsidian Greaves',
    slot: 'armor',
    level: 1,
    maxLevel: 20,
    element: 'Earth',
    stats: { hp: 500, def: 45 },
    rarity: 'Rare',
    description: 'Anchors the fighter to the earth, preventing knockbacks.',
  },
];

export const INITIAL_RUNES_LIST: Rune[] = [
  {
    id: 'rune_ignis_atk',
    name: 'Rune of Crimson Fury',
    element: 'Fire',
    bonusStat: 'atk',
    bonusValue: 35,
    rarity: 'Epic',
  },
  {
    id: 'rune_valeria_def',
    name: 'Rune of Glacial Bulwark',
    element: 'Ice',
    bonusStat: 'def',
    bonusValue: 40,
    rarity: 'Epic',
  },
  {
    id: 'rune_zephyr_spd',
    name: 'Rune of Swift Cyclone',
    element: 'Wind',
    bonusStat: 'spd',
    bonusValue: 15,
    rarity: 'Epic',
  },
  {
    id: 'rune_aurelia_hp',
    name: 'Rune of Solar Vitality',
    element: 'Light',
    bonusStat: 'hp',
    bonusValue: 350,
    rarity: 'Rare',
  },
  {
    id: 'rune_malakor_crit',
    name: 'Rune of Nether Precision',
    element: 'Dark',
    bonusStat: 'critRate',
    bonusValue: 10,
    rarity: 'Epic',
  },
  {
    id: 'rune_terran_def',
    name: 'Rune of Earth Bastion',
    element: 'Earth',
    bonusStat: 'def',
    bonusValue: 35,
    rarity: 'Rare',
  },
];
