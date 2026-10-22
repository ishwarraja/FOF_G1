import { ElementType, FactionType, CharacterRole } from './game';

export type AttackType = 'LP' | 'HP' | 'LK' | 'HK' | 'BLOWBACK' | 'SPECIAL_1' | 'SPECIAL_2' | 'SPECIAL_3' | 'SUPER' | 'CLIMAX';

export type FighterActionState =
  | 'IDLE'
  | 'WALK_FWD'
  | 'WALK_BACK'
  | 'CROUCH'
  | 'JUMP'
  | 'JUMP_NEUTRAL'
  | 'JUMP_FWD'
  | 'JUMP_BACK'
  | 'DASH'
  | 'BACKDASH'
  | 'ROLL_FWD'
  | 'ROLL_BACK'
  | 'ATTACK_LP'
  | 'ATTACK_HP'
  | 'ATTACK_LK'
  | 'ATTACK_HK'
  | 'BLOWBACK'
  | 'SPECIAL_1'
  | 'SPECIAL_2'
  | 'SPECIAL_3'
  | 'SUPER'
  | 'CLIMAX'
  | 'TAUNT'
  | 'HIT_LIGHT'
  | 'HIT_HEAVY'
  | 'KNOCKDOWN'
  | 'GUARD'
  | 'VICTORY'
  | 'DEFEAT';

export interface MotionInput {
  name: string; // e.g. "QCF+P", "DP+P", "QCB+K", "2xQCF+P"
  notation: string; // "↓ ↘ → + P", "→ ↓ ↘ + P", "↓ ↙ ← + K", "↓ ↘ → ↓ ↘ → + P"
  keys: string[]; // sequence of directional inputs
}

export interface FightingMove {
  id: string;
  name: string;
  command: string; // e.g., "↓ ↘ → + Punch"
  motion: 'NONE' | 'QCF' | 'QCB' | 'DP' | 'HCF' | 'DOUBLE_QCF';
  button: 'P' | 'K' | 'LP' | 'HP' | 'LK' | 'HK' | 'ANY';
  type: 'NORMAL' | 'COMMAND_NORMAL' | 'SPECIAL' | 'SUPER' | 'CLIMAX';
  damage: number;
  meterGain: number;
  meterCost: number; // e.g. 100 for 1-Bar Super, 300 for Climax
  startupFrames: number;
  activeFrames: number;
  recoveryFrames: number;
  hitStun: number;
  blockStun: number;
  range: number; // pixel reach
  knockdown: boolean;
  wallBounce?: boolean;
  invincibleStartup?: boolean;
  projectile?: {
    speed: number;
    color: string;
    radius: number;
    element: ElementType;
    hits: number;
  };
  element: ElementType;
  description: string;
  flavorQuote: string;
  imageUrl?: string;
  cutInUrl?: string;
}

export interface FofFighterStats {
  id: string;
  name: string;
  title: string;
  faction: FactionType;
  element: ElementType;
  role: CharacterRole;
  combatArchetype?: string;
  motto?: string;
  passiveHook?: {
    name: string;
    description: string;
  };
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  critRate: number;
  signatureWeapon: string;
  avatarColor: string;
  accentColor: string;
  themeColor: string;
  avatarUrl?: string;
  customImageUrl?: string;
  spriteUrl?: string;
  moves: FightingMove[];
  voiceLines: {
    intro: string;
    victory: string;
    superCall: string;
    defeat: string;
    taunt?: string;
  };
  backstory: string;
}

export type KofFighterStats = FofFighterStats;

export interface FightingEntity {
  id: string;
  character: FofFighterStats;
  isPlayer1: boolean;
  x: number; // 0 to 1000 arena width
  y: number; // 0 (ground) to 300 (high jump)
  vx: number;
  vy: number;
  facing: 1 | -1; // 1 = right, -1 = left
  hp: number;
  maxHp: number;
  superMeter: number; // 0 to 300 (3 stocks)
  maxMeter: number;
  maxModeTimer: number; // 0 to 100 frames
  isMaxMode: boolean;
  state: FighterActionState;
  stateFrame: number;
  currentMove: FightingMove | null;
  comboHits: number;
  comboDamage: number;
  isInvincible: boolean;
  isBlocking: boolean;
  isGrounded: boolean;
  hasHitThisAttack: boolean;
  activeProjectiles: FightingProjectile[];
}

export interface FightingProjectile {
  id: string;
  ownerId: string;
  isPlayer1: boolean;
  x: number;
  y: number;
  vx: number;
  element: ElementType;
  radius: number;
  damage: number;
  hitsLeft: number;
  color: string;
  lifeTime: number;
}

export interface FofRoundResult {
  roundNumber: number;
  winner: 'p1' | 'p2' | 'draw';
  p1FighterName: string;
  p2FighterName: string;
  p1RemainingHp: number;
  p2RemainingHp: number;
  durationSeconds: number;
  isPerfect: boolean;
}

export type KofRoundResult = FofRoundResult;

export type CombatControlScenario = 
  | 'USER_VS_CPU'  // Scenario 2: User (1P) vs PC (CPU 2P)
  | 'CPU_VS_CPU'   // Scenario 1: Auto Fight between PC (CPU 1P vs CPU 2P)
  | 'USER_VS_USER'; // Scenario 3: Fight between 2 Opponents / Local 2-Player

export type ControlScenario = CombatControlScenario;

export interface FofMatchState {
  mode: 'ARCADE_3V3' | '3v3_TEAM' | '1v1_SINGLE' | 'STORY' | 'STORY_ACT' | 'TRAINING';
  controlScenario?: CombatControlScenario;
  p1Control?: 'HUMAN' | 'CPU';
  p2Control?: 'HUMAN' | 'CPU';
  p1Team: FofFighterStats[];
  p2Team: FofFighterStats[];
  p1CurrentIndex: number;
  p2CurrentIndex: number;
  currentRound: number;
  roundTimer: number; // 99 to 0
  isTimerRunning?: boolean;
  roundPhase?: 'INTRO' | 'FIGHT' | 'KO' | 'TIME_OVER' | 'MATCH_OVER';
  roundPhaseTimer?: number;
  p1RoundsWon?: number;
  p2RoundsWon?: number;
  p1Wins?: number;
  p2Wins?: number;
  winner?: 'p1' | 'p2' | 'draw' | null;
  matchWinner?: 'p1' | 'p2' | null;
  isMatchOver?: boolean;
  stageId?: string;
  stageName?: string;
  stageBg?: string;
  history?: FofRoundResult[];
  cpuDifficulty?: number;
}

export type KofMatchState = FofMatchState;

export interface FofStage {
  id: string;
  name: string;
  sanskritName?: string;
  culturalRelation?: string;
  culturalCategory?: 'SPACE_COSMOS' | 'TIME_CYCLE' | 'SPACE_OBSERVATORY' | 'FOREST_SACRED' | 'GATHERING_UTSAV' | 'CYBER_LEGACY';
  theme: string;
  bgGradient: string;
  floorColor: string;
  ambientColor: string;
  description: string;
  musicMood?: string;
}

export type KofStage = FofStage;
