import { Fighter } from '../types/game';

export function createEnemy(
  id: string,
  name: string,
  title: string,
  element: Fighter['element'],
  role: Fighter['role'],
  level: number,
  hpMultiplier: number = 1.0,
  atkMultiplier: number = 1.0,
  isBoss: boolean = false
): Fighter {
  const baseHp = Math.round((800 + level * 220) * hpMultiplier);
  const baseAtk = Math.round((70 + level * 24) * atkMultiplier);
  const baseDef = Math.round(50 + level * 16);
  const baseSpd = Math.round(70 + Math.random() * 30);

  return {
    id: `${id}_${Math.random().toString(36).substring(2, 7)}`,
    name,
    title,
    faction: 'Shadow Abyssal',
    element,
    role,
    level,
    xp: 50 * level,
    xpToNextLevel: 100,
    starRating: isBoss ? 6 : 3,
    baseStats: {
      hp: baseHp,
      maxHp: baseHp,
      atk: baseAtk,
      def: baseDef,
      spd: baseSpd,
      critRate: isBoss ? 20 : 10,
      critDmg: 150,
      energy: 0,
      maxEnergy: 100,
    },
    currentStats: {
      hp: baseHp,
      maxHp: baseHp,
      atk: baseAtk,
      def: baseDef,
      spd: baseSpd,
      critRate: isBoss ? 20 : 10,
      critDmg: 150,
      energy: 0,
      maxEnergy: 100,
    },
    skills: [
      {
        id: `${id}_atk`,
        name: isBoss ? 'Cataclysmic Strike' : 'Shadow Claw',
        type: 'Active',
        element,
        description: `Strikes target for ${isBoss ? '170%' : '130%'} damage.`,
        cooldown: 1,
        currentCooldown: 0,
        targetType: 'single_enemy',
        damageMultiplier: isBoss ? 1.7 : 1.3,
        icon: 'Flame',
        level: 1,
        maxLevel: 5,
      },
      {
        id: `${id}_ult`,
        name: isBoss ? 'Oblivion Nova' : 'Dark Surge',
        type: 'Ultimate',
        element,
        description: `Unleashes AoE elemental burst dealing ${isBoss ? '280%' : '200%'} damage.`,
        cooldown: 0,
        energyCost: 100,
        targetType: 'all_enemies',
        damageMultiplier: isBoss ? 2.8 : 2.0,
        icon: 'Zap',
        level: 1,
        maxLevel: 5,
      },
    ],
    equipment: {},
    runes: [],
    signatureWeaponName: isBoss ? 'Crest of the Void' : 'Corrupted Fang',
    signatureWeaponDesc: 'Pulsing with dark dimensional energy.',
    backstory: 'A creature spawned from the fractures of the shattered Crest of Eternity.',
    avatarColor: isBoss ? 'from-red-950 via-purple-900 to-black' : 'from-slate-800 to-zinc-900',
    accentColor: isBoss ? '#ef4444' : '#a855f7',
    avatarIcon: isBoss ? 'Crown' : 'Skull',
    isAlive: true,
  };
}

export const BOSS_ROSTER = {
  pyros_drake: (level: number) => createEnemy('boss_pyros', 'Pyros Infernal Drake', 'Scourge of the Ashen Crucible', 'Fire', 'Striker', level, 2.5, 1.4, true),
  frost_colossus: (level: number) => createEnemy('boss_frost', 'Cryo-Titan Ymir', 'Ruler of the Whispering Glaciers', 'Ice', 'Tank', level, 3.2, 1.2, true),
  tempest_lord: (level: number) => createEnemy('boss_storm', 'Tempest Void Wyvern', 'Sovereign of Skystride', 'Wind', 'Assassin', level, 2.2, 1.6, true),
  shadow_archon: (level: number) => createEnemy('boss_shadow', 'Shadow Archon Malakor', 'Echo of the Void Singularity', 'Dark', 'Mage', level, 2.8, 1.5, true),
  void_leviathan: (level: number) => createEnemy('boss_leviathan', 'Primordial Void Leviathan', 'World-Devourer of Eternity', 'Dark', 'Striker', level, 4.0, 1.8, true),
};
