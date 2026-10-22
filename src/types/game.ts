export type ElementType = 'Fire' | 'Ice' | 'Wind' | 'Light' | 'Dark' | 'Earth';

export type CharacterRole = 'Striker' | 'Tank' | 'Assassin' | 'Healer' | 'Mage' | 'Brawler';

export type FactionType = 
  | 'Ordinary Workers'
  | 'Government'
  | 'Sports'
  | 'Students'
  | 'Science'
  | 'Scientists'
  | 'Farmers'
  | 'Journalism'
  | 'Healthcare'
  | 'Marginalized Communities'
  | 'Military'
  | 'Arts'
  | 'Aether Core / Hegemony'
  | 'Corporate / Aether Core'
  | 'Global Hegemony'
  | 'Centralized Power'
  | 'Crimson Vanguard'
  | 'Glacial Enclave'
  | 'Windward Syndicate'
  | 'Sunstone Order'
  | 'Shadow Abyssal'
  | 'Earthbound Bastion'
  | 'Vedic Masters';

export type StatusEffectType = 'Burn' | 'Freeze' | 'Stun' | 'Curse' | 'AtkBuff' | 'DefBuff' | 'SpdBuff' | 'Shield' | 'Taunt' | 'Invincible';

export interface StatusEffect {
  type: StatusEffectType;
  duration: number; // turns remaining
  value: number; // e.g. % damage, shield amount, % stat buff
  sourceName?: string;
}

export interface Skill {
  id: string;
  name: string;
  type: 'Active' | 'Passive' | 'Ultimate';
  element: ElementType;
  description: string;
  cooldown: number; // In turns (0 for passives, 1-4 for actives)
  currentCooldown?: number;
  energyCost?: number; // for Ultimates (e.g. 100 energy)
  targetType: 'single_enemy' | 'all_enemies' | 'single_ally' | 'all_allies' | 'self' | 'lowest_hp_ally';
  damageMultiplier?: number; // e.g. 1.8 for 180%
  healMultiplier?: number;
  shieldMultiplier?: number;
  effectChance?: number; // 0 to 1
  effectType?: StatusEffectType;
  effectValue?: number;
  effectDuration?: number;
  icon: string;
  level: number;
  maxLevel: number;
}

export interface CharacterStats {
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  critRate: number; // 0-100%
  critDmg: number; // default 150%
  energy: number; // 0-100 for ultimate
  maxEnergy: number;
}

export interface Rune {
  id: string;
  name: string;
  element: ElementType;
  bonusStat: keyof Omit<CharacterStats, 'energy' | 'maxEnergy'>;
  bonusValue: number;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
}

export interface Equipment {
  id: string;
  name: string;
  slot: 'weapon' | 'armor' | 'accessory';
  level: number;
  maxLevel: number;
  element?: ElementType;
  stats: Partial<Record<keyof CharacterStats, number>>;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  description: string;
}

export interface Fighter {
  id: string;
  name: string;
  title: string;
  faction: FactionType;
  element: ElementType;
  role: CharacterRole;
  level: number;
  xp: number;
  xpToNextLevel: number;
  starRating: number;
  baseStats: CharacterStats;
  currentStats: CharacterStats;
  skills: Skill[];
  equipment: {
    weapon?: Equipment;
    armor?: Equipment;
    accessory?: Equipment;
  };
  runes: Rune[];
  signatureWeaponName: string;
  signatureWeaponDesc: string;
  backstory: string;
  avatarColor: string;
  accentColor: string;
  avatarIcon: string;
  // Dynamic in-battle stats:
  statusEffects?: StatusEffect[];
  isAlive?: boolean;
  gridIndex?: number; // 0-5 in 3x2 grid (0,1,2 = Frontline; 3,4,5 = Backline)
}

export interface DialogueLine {
  speaker: string;
  avatar: string;
  text: string;
  element?: ElementType;
  side: 'left' | 'right';
  expression?: 'neutral' | 'angry' | 'determined' | 'smiling' | 'surprised';
}

export interface CampaignStage {
  id: string;
  actId: string;
  stageNumber: number;
  title: string;
  subtitle: string;
  description: string;
  recommendedCP: number;
  energyCost: number;
  firstClearRewards: {
    gold: number;
    crystals: number;
    exp: number;
    items?: string[];
    shardId?: string;
  };
  repeatRewards: {
    gold: number;
    exp: number;
  };
  enemyTeam: Fighter[];
  dialogueIntro?: DialogueLine[];
  dialogueOutro?: DialogueLine[];
  stars: number; // 0-3
  isUnlocked: boolean;
  isCompleted: boolean;
  backgroundTheme: string;
}

export interface CampaignAct {
  id: string;
  actNumber: number;
  title: string;
  subtitle: string;
  description: string;
  shardReward: string;
  shardElement: ElementType;
  bannerImage: string;
  stages: CampaignStage[];
}

export interface CrestShard {
  id: string;
  name: string;
  element: ElementType;
  actOrigin: string;
  isUnlocked: boolean;
  passiveBonus: string;
  description: string;
}

export interface PlayerProfile {
  name: string;
  level: number;
  gold: number;
  crystals: number;
  stamina: number;
  maxStamina: number;
  roster: Fighter[];
  formation: string[]; // Fighter IDs for 6 grid slots [Front-Top, Front-Mid, Front-Bot, Back-Top, Back-Mid, Back-Bot]
  inventory: {
    equipment: Equipment[];
    runes: Rune[];
    materials: Record<string, number>;
  };
  campaignProgress: {
    completedStageIds: string[];
    stageStars: Record<string, number>;
    unlockedActs: string[];
  };
  shards: CrestShard[];
  arenaStats: {
    bossRushHighScore: number;
    endlessWaveRecord: number;
    totalVictories: number;
  };
  lastSavedAt: string;
}

export interface BattleLogEntry {
  id: string;
  turn: number;
  timestamp: string;
  sourceName: string;
  action: string;
  targetName?: string;
  damage?: number;
  heal?: number;
  isCrit?: boolean;
  statusApplied?: StatusEffectType;
  isMiss?: boolean;
  message: string;
  type: 'attack' | 'skill' | 'ultimate' | 'heal' | 'buff' | 'status' | 'death';
}

export interface BattleState {
  playerTeam: Fighter[];
  enemyTeam: Fighter[];
  activeFighterId: string | null;
  turnCount: number;
  actionQueue: string[]; // Fighter IDs ordered by action speed
  isBattleOver: boolean;
  winner: 'player' | 'enemy' | null;
  selectedAction: {
    skill: Skill;
    requiresTarget: boolean;
  } | null;
  selectedTargetId: string | null;
  battleLogs: BattleLogEntry[];
  speedMultiplier: 1 | 2;
  isAutoBattle: boolean;
  stageInfo?: CampaignStage;
  floatingTexts: {
    id: string;
    targetId: string;
    text: string;
    type: 'damage' | 'crit' | 'heal' | 'buff' | 'miss' | 'shield';
  }[];
}
